// ═══════════════════════════════════════════════════════════
// server.js — Express + Socket.io Entrypoint
// IPL 2026 Fantasy Betting App (Game Coins Only)
// ═══════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

// ── Route imports ────────────────────────────────────────
const authRoutes = require('./routes/auth');
const betRoutes = require('./routes/bets');
const scoreRoutes = require('./routes/score');
const leaderboardRoutes = require('./routes/leaderboard');

// ── Service imports ──────────────────────────────────────
const { startSocketService } = require('./services/socketService');

// ── App setup ────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : 'http://localhost:5173';
const allowedOrigins = [
  clientUrl,
  `${clientUrl}/`,
  'https://ipl-mock.vercel.app',
  'http://localhost:5173'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// ── Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// ── Base Route ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Welcome to IPL Fantasy Betting API 🏏',
    status: 'online',
    docs: '/api/docs' // Optional pointer for API documentation if applicable
  });
});

// ── Health check (UptimeRobot pings this) ────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// ── Socket.io connection handling ────────────────────────
io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ── Start real-time services ─────────────────────────────
startSocketService(io);

// ── Launch server ────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🏏 IPL Fantasy Betting Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for connections`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health\n`);
});

module.exports = { app, server, io };
