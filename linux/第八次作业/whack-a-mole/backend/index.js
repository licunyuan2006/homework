const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.static('../frontend'));  // 提供前端静态文件

const pool = new Pool({
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'gameuser',
    password: process.env.DB_PASSWORD || 'gamepass',
    database: process.env.DB_NAME || 'whackmole',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// 初始化数据库表（确保表存在）
async function initDB() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS scores (
            id SERIAL PRIMARY KEY,
            player_name VARCHAR(50) NOT NULL,
            score INTEGER NOT NULL CHECK (score >= 0),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_scores_score ON scores(score DESC);
    `;
    try {
        await pool.query(createTableQuery);
        console.log('Database table initialized');
    } catch (err) {
        console.error('Failed to init database:', err);
        process.exit(1);
    }
}

// 保存分数
app.post('/api/score', async (req, res) => {
    const { playerName, score } = req.body;
    if (!playerName || typeof playerName !== 'string' || playerName.trim() === '') {
        return res.status(400).json({ error: 'Invalid player name' });
    }
    if (typeof score !== 'number' || score < 0 || score > 10000) {
        return res.status(400).json({ error: 'Invalid score' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO scores (player_name, score) VALUES ($1, $2) RETURNING id',
            [playerName.trim(), score]
        );
        res.status(201).json({ id: result.rows[0].id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 获取排行榜（前10名）
app.get('/api/scores', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT player_name, score, created_at FROM scores ORDER BY score DESC LIMIT 10'
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    await initDB();
    console.log(`Server running on port ${PORT}`);
});
