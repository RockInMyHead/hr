import { defineConfig } from "vite";
// react plugin temporarily disabled to avoid native binding issues in swc/babel
import path from "path";
import react from "@vitejs/plugin-react";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    // React Router future flags to suppress warnings
    __REACT_ROUTER_FUTURE_FLAGS: JSON.stringify({
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }),
  },
  base: mode === 'production' ? './' : '/',
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [
    react(),
    {
      name: 'local-api-middleware',
      configureServer(server) {
        server.middlewares.use('/api/openai', async (req, res) => {
          try {
            const origin = (req.headers?.origin as string) || '';
            res.setHeader('Access-Control-Allow-Origin', origin || '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.end();
              return;
            }

            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method Not Allowed' }));
              return;
            }

            let raw = '';
            await new Promise((resolve, reject) => {
              req.on('data', (chunk) => { raw += chunk; });
              req.on('end', resolve);
              req.on('error', reject);
            });

            const body = raw ? JSON.parse(raw) : {};
            const { model, messages, max_tokens, temperature } = body || {};

            const apiKey = process.env.OPENAI_API_KEY || '';

            const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: typeof model === 'string' && model.trim() ? model : 'gpt-4o-mini',
                messages,
                max_tokens: typeof max_tokens === 'number' ? max_tokens : 800,
                temperature: typeof temperature === 'number' ? temperature : 0.7,
              }),
            });

            const data = await upstream.json();
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
            res.end(JSON.stringify({ error: errorMessage }));
          }
        });

        // SQLite sessions API
        server.middlewares.use('/api/sessions', async (req, res) => {
          try {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

            if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

            // Lazy-load DB and init schema
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mod = await import('better-sqlite3');
            const Database = mod?.default ?? mod;
            const db = new Database('data.sqlite');
            db.prepare(
              'CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, userId TEXT, startedAt TEXT, endedAt TEXT, messages TEXT, profile TEXT)'
            ).run();

            if (req.method === 'GET') {
              const url = new URL(req.url || '', 'http://localhost');
              const userId = url.searchParams.get('userId') || 'anonymous';
              const rows = db.prepare('SELECT * FROM sessions WHERE userId = ? ORDER BY startedAt DESC').all(userId);
              const parsed = rows.map((r: Record<string, unknown>) => ({
                id: r.id,
                userId: r.userId,
                startedAt: r.startedAt,
                endedAt: r.endedAt,
                messages: JSON.parse(r.messages || '[]'),
                profile: r.profile ? JSON.parse(r.profile) : undefined,
              }));
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(parsed));
              return;
            }

            let raw = '';
            await new Promise((resolve, reject) => {
              req.on('data', (chunk) => { raw += chunk; });
              req.on('end', resolve);
              req.on('error', reject);
            });
            const body = raw ? JSON.parse(raw) : {};

            if (req.method === 'POST' && req.url?.includes('/upsert')) {
              const s = body || {};
              const stmt = db.prepare(
                'INSERT INTO sessions (id, userId, startedAt, endedAt, messages, profile) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET userId=excluded.userId, startedAt=excluded.startedAt, endedAt=excluded.endedAt, messages=excluded.messages, profile=excluded.profile'
              );
              stmt.run(
                String(s.id),
                String(s.userId || 'anonymous'),
                String(s.startedAt),
                String(s.endedAt),
                JSON.stringify(s.messages || []),
                s.profile ? JSON.stringify(s.profile) : null,
              );
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            if (req.method === 'POST' && req.url?.includes('/clear')) {
              const userId = String((body && body.userId) || 'anonymous');
              db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true }));
              return;
            }

            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          } catch (err: unknown) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
            res.end(JSON.stringify({ error: errorMessage }));
          }
        });
      },
    },
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Исключаем серверные зависимости из обработки для браузера
  optimizeDeps: {
    exclude: ['better-sqlite3']
  },
  // use default optimizeDeps for proper CJS -> ESM pre-bundling (react/jsx-runtime)
}));
