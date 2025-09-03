import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; // Используем другой порт, чтобы не конфликтовать
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// CORS middleware
app.use(cors({
  origin: ['http://talti.ru', 'https://talti.ru', 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Proxy server listening on http://localhost:${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/api/openai`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});
