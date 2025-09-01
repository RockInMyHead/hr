import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.use(express.json({ limit: '1mb' }));

// OpenAI proxy
app.post('/api/openai', async (req, res) => {
    try {
        if (!OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OPENAI_API_KEY is missing' });
        }
        const { model, messages, max_tokens, temperature } = req.body || {};
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'messages are required' });
        }
        const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: typeof model === 'string' && model.trim() ? model : 'gpt-4o-mini',
                messages,
                max_tokens: typeof max_tokens === 'number' ? max_tokens : 800,
                temperature: typeof temperature === 'number' ? temperature : 0.7,
            }),
        });
        const data = await upstream.json();
        return res.status(upstream.status).json(data);
    } catch (e) {
        return res.status(500).json({ error: e?.message ?? 'Unknown server error' });
    }
});

// Sessions API (SQLite)
const db = new Database('data.sqlite');
db.prepare('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, userId TEXT, startedAt TEXT, endedAt TEXT, messages TEXT, profile TEXT)').run();

app.get('/api/sessions', (req, res) => {
    const userId = String(req.query.userId || 'anonymous');
    const rows = db.prepare('SELECT * FROM sessions WHERE userId = ? ORDER BY startedAt DESC').all(userId);
    const parsed = rows.map(r => ({
        id: r.id,
        userId: r.userId,
        startedAt: r.startedAt,
        endedAt: r.endedAt,
        messages: JSON.parse(r.messages || '[]'),
        profile: r.profile ? JSON.parse(r.profile) : undefined,
    }));
    res.json(parsed);
});

app.post('/api/sessions/upsert', (req, res) => {
    const s = req.body || {};
    const stmt = db.prepare('INSERT INTO sessions (id, userId, startedAt, endedAt, messages, profile) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET userId=excluded.userId, startedAt=excluded.startedAt, endedAt=excluded.endedAt, messages=excluded.messages, profile=excluded.profile');
    stmt.run(String(s.id), String(s.userId || 'anonymous'), String(s.startedAt), String(s.endedAt), JSON.stringify(s.messages || []), s.profile ? JSON.stringify(s.profile) : null);
    res.json({ ok: true });
});

app.post('/api/sessions/clear', (req, res) => {
    const userId = String((req.body && req.body.userId) || 'anonymous');
    db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
    res.json({ ok: true });
});

// Static files
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
