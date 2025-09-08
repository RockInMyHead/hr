import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Debug logging
console.log('Environment variables loaded:');
console.log('PORT:', PORT);
console.log('OPENAI_API_KEY:', OPENAI_API_KEY ? '***' + OPENAI_API_KEY.slice(-4) : 'NOT SET');

// CORS middleware
app.use(cors()); // Allow all origins (development only)

// CORS logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin || 'unknown'}`);
  next();
});

app.use(express.json({ limit: '1mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected',
      openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured'
    }
  });
});

// Enable CORS for all preflight requests
app.options('*', cors());

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

// Database setup with full schema
const db = new Database('data.sqlite');

// Initialize database tables
db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        userName TEXT NOT NULL,
        userEmail TEXT NOT NULL,
        startTime INTEGER NOT NULL,
        endTime INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        sessionType TEXT NOT NULL,
        metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        messageType TEXT DEFAULT 'text',
        confidence REAL,
        metadata TEXT,
        FOREIGN KEY (sessionId) REFERENCES chat_sessions (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS candidate_profiles (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        userId TEXT NOT NULL,
        fullName TEXT NOT NULL,
        email TEXT NOT NULL,
        position TEXT,
        department TEXT,
        overallScore INTEGER NOT NULL DEFAULT 0,
        technicalSkills TEXT NOT NULL DEFAULT '{}',
        softSkills TEXT NOT NULL DEFAULT '{}',
        summary TEXT NOT NULL DEFAULT '',
        recommendations TEXT NOT NULL DEFAULT '[]',
        strengths TEXT NOT NULL DEFAULT '[]',
        weaknesses TEXT NOT NULL DEFAULT '[]',
        aiAnalysis TEXT NOT NULL DEFAULT '{}',
        individualDevelopmentPlan TEXT NOT NULL DEFAULT '{}',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES chat_sessions (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS knowledge_base (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        question TEXT NOT NULL,
        keywords TEXT NOT NULL DEFAULT '[]',
        difficulty TEXT NOT NULL DEFAULT 'middle',
        competency TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        isActive BOOLEAN NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL,
        createdAt INTEGER NOT NULL DEFAULT ${Date.now()},
        lastLoginAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS competency_assessments (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        sessionId TEXT,
        competencyId TEXT NOT NULL,
        currentValue REAL NOT NULL,
        targetValue REAL,
        category TEXT NOT NULL,
        lastAssessed INTEGER NOT NULL,
        improvementPlan TEXT,
        source TEXT NOT NULL DEFAULT 'interview', -- 'interview', 'manual', 'self-assessment'
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES users (id),
        FOREIGN KEY (sessionId) REFERENCES chat_sessions (id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(sessionId);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(userId);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_start_time ON chat_sessions(startTime);
    CREATE INDEX IF NOT EXISTS idx_candidate_profiles_session ON candidate_profiles(sessionId);
    CREATE INDEX IF NOT EXISTS idx_candidate_profiles_user ON candidate_profiles(userId);
    CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
    CREATE INDEX IF NOT EXISTS idx_knowledge_base_difficulty ON knowledge_base(difficulty);
    CREATE INDEX IF NOT EXISTS idx_competency_assessments_user ON competency_assessments(userId);
    CREATE INDEX IF NOT EXISTS idx_competency_assessments_session ON competency_assessments(sessionId);
    CREATE INDEX IF NOT EXISTS idx_competency_assessments_competency ON competency_assessments(competencyId);
`);

// ===== CHAT SESSIONS API =====

// Get chat sessions for user
app.get('/api/chat-sessions', (req, res) => {
    try {
        const userId = String(req.query.userId || 'anonymous');
        const limit = parseInt(req.query.limit) || 50;

        const stmt = db.prepare(`
            SELECT * FROM chat_sessions
            WHERE userId = ?
            ORDER BY startTime DESC
            LIMIT ?
        `);
        const rows = stmt.all(userId, limit);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single chat session
app.get('/api/chat-sessions/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const stmt = db.prepare('SELECT * FROM chat_sessions WHERE id = ?');
        const session = stmt.get(sessionId);

        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(session);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new chat session
app.post('/api/chat-sessions', (req, res) => {
    try {
        const session = req.body;
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

        const stmt = db.prepare(`
            INSERT INTO chat_sessions (id, userId, userName, userEmail, startTime, endTime, status, sessionType, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            session.userId || 'anonymous',
            session.userName || 'Anonymous',
            session.userEmail || '',
            session.startTime || Date.now(),
            session.endTime || null,
            session.status || 'active',
            session.sessionType || 'rag-chat',
            session.metadata ? JSON.stringify(session.metadata) : null
        );

        res.json({ id, ...session });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update chat session
app.put('/api/chat-sessions/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const updates = req.body;

        const fields = Object.keys(updates).filter(key => key !== 'id');
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => {
            if (field === 'metadata' && updates[field]) {
                return JSON.stringify(updates[field]);
            }
            return updates[field];
        });

        const stmt = db.prepare(`UPDATE chat_sessions SET ${setClause} WHERE id = ?`);
        const result = stmt.run(...values, sessionId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== CHAT MESSAGES API =====

// Get messages for session
app.get('/api/chat-messages/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const stmt = db.prepare(`
            SELECT * FROM chat_messages
            WHERE sessionId = ?
            ORDER BY timestamp ASC
        `);
        const messages = stmt.all(sessionId);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get recent messages for session
app.get('/api/chat-messages/:sessionId/recent', (req, res) => {
    try {
        const { sessionId } = req.params;
        const limit = parseInt(req.query.limit) || 20;

        const stmt = db.prepare(`
            SELECT * FROM chat_messages
            WHERE sessionId = ?
            ORDER BY timestamp DESC
            LIMIT ?
        `);
        const messages = stmt.all(sessionId, limit).reverse();
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add chat message
app.post('/api/chat-messages', (req, res) => {
    try {
        const message = req.body;
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

        const stmt = db.prepare(`
            INSERT INTO chat_messages (id, sessionId, role, content, timestamp, messageType, confidence, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            message.sessionId,
            message.role,
            message.content,
            message.timestamp || Date.now(),
            message.messageType || 'text',
            message.confidence || null,
            message.metadata ? JSON.stringify(message.metadata) : null
        );

        res.json({ id, ...message });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== CANDIDATE PROFILES API =====

// Get candidate profile for session
app.get('/api/candidate-profiles/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const stmt = db.prepare('SELECT * FROM candidate_profiles WHERE sessionId = ?');
        const profile = stmt.get(sessionId);

        if (!profile) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        // Parse JSON fields
        profile.technicalSkills = JSON.parse(profile.technicalSkills || '{}');
        profile.softSkills = JSON.parse(profile.softSkills || '{}');
        profile.recommendations = JSON.parse(profile.recommendations || '[]');
        profile.strengths = JSON.parse(profile.strengths || '[]');
        profile.weaknesses = JSON.parse(profile.weaknesses || '[]');
        profile.aiAnalysis = JSON.parse(profile.aiAnalysis || '{}');
        profile.individualDevelopmentPlan = JSON.parse(profile.individualDevelopmentPlan || '{}');

        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create candidate profile
app.post('/api/candidate-profiles', (req, res) => {
    try {
        const profile = req.body;
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
        const now = Date.now();

        const stmt = db.prepare(`
            INSERT INTO candidate_profiles (
                id, sessionId, userId, fullName, email, position, department,
                overallScore, technicalSkills, softSkills, summary, recommendations,
                strengths, weaknesses, aiAnalysis, individualDevelopmentPlan,
                createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            id,
            profile.sessionId,
            profile.userId,
            profile.fullName,
            profile.email,
            profile.position || null,
            profile.department || null,
            profile.overallScore || 0,
            JSON.stringify(profile.technicalSkills || {}),
            JSON.stringify(profile.softSkills || {}),
            profile.summary || '',
            JSON.stringify(profile.recommendations || []),
            JSON.stringify(profile.strengths || []),
            JSON.stringify(profile.weaknesses || []),
            JSON.stringify(profile.aiAnalysis || {}),
            JSON.stringify(profile.individualDevelopmentPlan || {}),
            now,
            now
        );

        res.json({ id, ...profile, createdAt: now, updatedAt: now });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update candidate profile
app.put('/api/candidate-profiles/:profileId', (req, res) => {
    try {
        const { profileId } = req.params;
        const updates = req.body;

        const fields = Object.keys(updates).filter(key => !['id', 'createdAt'].includes(key));
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        fields.push('updatedAt');
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => {
            if (field === 'updatedAt') return Date.now();
            if (['technicalSkills', 'softSkills', 'aiAnalysis', 'individualDevelopmentPlan'].includes(field)) {
                return JSON.stringify(updates[field] || {});
            }
            if (['recommendations', 'strengths', 'weaknesses'].includes(field)) {
                return JSON.stringify(updates[field] || []);
            }
            return updates[field];
        });

        const stmt = db.prepare(`UPDATE candidate_profiles SET ${setClause} WHERE id = ?`);
        const result = stmt.run(...values, profileId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== COMPETENCY ASSESSMENTS API =====

// Get competency assessments for user
app.get('/api/competency-assessments', (req, res) => {
    try {
        const userIdOrEmail = String(req.query.userId || req.query.email || 'anonymous');
        const sessionId = req.query.sessionId;

        // Сначала попробуем найти пользователя по email, если передан email
        let userId = userIdOrEmail;
        if (userIdOrEmail.includes('@')) {
            const userStmt = db.prepare('SELECT id FROM users WHERE email = ?');
            const user = userStmt.get(userIdOrEmail);
            if (user) {
                userId = user.id;
            }
        }

        let query = 'SELECT * FROM competency_assessments WHERE userId = ?';
        let params = [userId];

        if (sessionId) {
            query += ' AND sessionId = ?';
            params.push(sessionId);
        }

        query += ' ORDER BY lastAssessed DESC';

        const stmt = db.prepare(query);
        const assessments = stmt.all(...params);

        // Group by competency
        const grouped = assessments.reduce((acc, assessment) => {
            if (!acc[assessment.competencyId]) {
                acc[assessment.competencyId] = [];
            }
            acc[assessment.competencyId].push(assessment);
            return acc;
        }, {});

        res.json(grouped);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get latest competency assessment for user
app.get('/api/competency-assessments/latest', (req, res) => {
    try {
        const userIdOrEmail = String(req.query.userId || req.query.email || 'anonymous');

        // Сначала попробуем найти пользователя по email, если передан email
        let userId = userIdOrEmail;
        if (userIdOrEmail.includes('@')) {
            const userStmt = db.prepare('SELECT id FROM users WHERE email = ?');
            const user = userStmt.get(userIdOrEmail);
            if (user) {
                userId = user.id;
            }
        }

        const stmt = db.prepare(`
            SELECT ca.* FROM competency_assessments ca
            INNER JOIN (
                SELECT competencyId, MAX(lastAssessed) as latest
                FROM competency_assessments
                WHERE userId = ?
                GROUP BY competencyId
            ) latest ON ca.competencyId = latest.competencyId AND ca.lastAssessed = latest.latest
            WHERE ca.userId = ?
            ORDER BY ca.lastAssessed DESC
        `);

        const assessments = stmt.all(userId, userId);
        res.json(assessments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save competency assessments from interview
app.post('/api/competency-assessments/bulk', (req, res) => {
    try {
        const { userId, email, sessionId, assessments, source = 'interview' } = req.body;
        let actualUserId = userId;

        // Если передан email вместо userId, найдем пользователя по email
        if (!userId && email) {
            const userStmt = db.prepare('SELECT id FROM users WHERE email = ?');
            const user = userStmt.get(email);
            if (user) {
                actualUserId = user.id;
            } else {
                // Создаем нового пользователя если не найден
                const newUserId = `user-${Date.now()}`;
                const createUserStmt = db.prepare('INSERT INTO users (id, name, email, role, createdAt) VALUES (?, ?, ?, ?, ?)');
                createUserStmt.run(newUserId, email.split('@')[0], email, 'subordinate', Date.now());
                actualUserId = newUserId;
            }
        }

        if ((!actualUserId && !email) || !assessments || !Array.isArray(assessments)) {
            return res.status(400).json({ error: 'Invalid request data' });
        }

        const now = Date.now();
        const savedAssessments = [];

        for (const assessment of assessments) {
            const id = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;

            const stmt = db.prepare(`
                INSERT INTO competency_assessments (
                    id, userId, sessionId, competencyId, currentValue, targetValue,
                    category, lastAssessed, improvementPlan, source, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            stmt.run(
                id,
                actualUserId,
                sessionId || null,
                assessment.competencyId,
                assessment.currentValue,
                assessment.targetValue || null,
                assessment.category || 'soft',
                assessment.lastAssessed || now,
                assessment.improvementPlan ? JSON.stringify(assessment.improvementPlan) : null,
                source,
                now,
                now
            );

            savedAssessments.push({
                id,
                ...assessment,
                createdAt: now,
                updatedAt: now
            });
        }

        res.json({
            success: true,
            saved: savedAssessments.length,
            assessments: savedAssessments
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update competency assessment
app.put('/api/competency-assessments/:assessmentId', (req, res) => {
    try {
        const { assessmentId } = req.params;
        const updates = req.body;

        const fields = Object.keys(updates).filter(key => !['id', 'createdAt'].includes(key));
        if (fields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        fields.push('updatedAt');
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        const values = fields.map(field => {
            if (field === 'updatedAt') return Date.now();
            if (field === 'improvementPlan' && updates[field]) {
                return JSON.stringify(updates[field]);
            }
            return updates[field];
        });

        const stmt = db.prepare(`UPDATE competency_assessments SET ${setClause} WHERE id = ?`);
        const result = stmt.run(...values, assessmentId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete competency assessment
app.delete('/api/competency-assessments/:assessmentId', (req, res) => {
    try {
        const { assessmentId } = req.params;
        const stmt = db.prepare('DELETE FROM competency_assessments WHERE id = ?');
        const result = stmt.run(assessmentId);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Assessment not found' });
        }

        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== STATISTICS API =====

// Get chat statistics
app.get('/api/statistics', (req, res) => {
    try {
        const userId = req.query.userId;

        let sessionsQuery = 'SELECT COUNT(*) as count, AVG(endTime - startTime) as avgDuration FROM chat_sessions WHERE endTime IS NOT NULL';
        let messagesQuery = 'SELECT COUNT(*) as count FROM chat_messages';
        let profilesQuery = 'SELECT COUNT(*) as count FROM candidate_profiles';

        const params = [];
        if (userId) {
            sessionsQuery += ' AND userId = ?';
            messagesQuery += ' WHERE sessionId IN (SELECT id FROM chat_sessions WHERE userId = ?)';
            profilesQuery += ' WHERE userId = ?';
            params.push(userId, userId, userId);
        }

        const sessionsResult = db.prepare(sessionsQuery).get(...params) || { count: 0, avgDuration: 0 };
        const messagesResult = db.prepare(messagesQuery).get(...params) || { count: 0 };
        const profilesResult = db.prepare(profilesQuery).get(...params) || { count: 0 };

        res.json({
            totalSessions: sessionsResult.count || 0,
            totalMessages: messagesResult.count || 0,
            averageSessionDuration: sessionsResult.avgDuration || 0,
            completedProfiles: profilesResult.count || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Legacy sessions API (for backward compatibility)
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

// ===== VOICE MESSAGES API =====

// Upload voice message
app.post('/api/voice/upload', (req, res) => {
    try {
        // For now, we'll store voice data as base64 in metadata
        // In production, you might want to save files to disk or cloud storage
        const { audioData, filename } = req.body;

        if (!audioData) {
            return res.status(400).json({ error: 'No audio data provided' });
        }

        // Generate unique filename
        const uniqueFilename = `voice_${Date.now()}_${filename || 'recording.wav'}`;

        // For demo purposes, we'll just return the data
        // In production, save to disk or cloud storage
        res.json({
            success: true,
            filename: uniqueFilename,
            url: `/api/voice/${uniqueFilename}`,
            size: audioData.length
        });
    } catch (error) {
        console.error('Voice upload error:', error);
        res.status(500).json({ error: 'Failed to upload voice message' });
    }
});

// Get voice message
app.get('/api/voice/:filename', (req, res) => {
    try {
        const { filename } = req.params;

        // For demo purposes, return a placeholder
        // In production, serve the actual file from disk or cloud storage
        res.status(404).json({ error: 'Voice file not found' });
    } catch (error) {
        console.error('Voice get error:', error);
        res.status(500).json({ error: 'Failed to get voice message' });
    }
});

// Static files
app.use(express.static(path.join(__dirname, 'dist')));
app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
