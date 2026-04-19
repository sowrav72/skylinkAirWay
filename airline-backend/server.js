/**
 * server.js — Phase 4
 * Adds: /api/flights (public, no auth required)
 */

'use strict';

require('dotenv').config();
const express = require('express');
const cors    = require('cors');

// ── Phase 1 routes ─────────────────────────────────────────────────────────
const authRoutes          = require('./routes/auth');
const adminRoutes         = require('./routes/admin');
const passengerRoutes     = require('./routes/passenger');
const staffRoutes         = require('./routes/staff');
// ── Phase 2 routes ─────────────────────────────────────────────────────────
const seatsRoutes         = require('./routes/seats');
const ticketsRoutes       = require('./routes/tickets');
const receiptsRoutes      = require('./routes/receipts');
// ── Phase 3 routes ─────────────────────────────────────────────────────────
const notificationsRoutes = require('./routes/notifications');
// ── Phase 4 routes ─────────────────────────────────────────────────────────
const publicRoutes        = require('./routes/public');   // no auth

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:         process.env.CORS_ORIGIN || '*',
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    message:   'Airline Management System API — Phase 4',
    version:   '4.0.0',
    status:    'running',
    timestamp: new Date().toISOString(),
    features:  ['auth', 'flights', 'bookings', 'seats', 'tickets', 'receipts', 'notifications', 'public-search']
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Route registration ────────────────────────────────────────────────────────
app.use('/api/auth',           authRoutes);
app.use('/api/admin',          adminRoutes);
app.use('/api/passenger',      passengerRoutes);
app.use('/api/staff',          staffRoutes);
app.use('/api/seats',          seatsRoutes);
app.use('/api/tickets',        ticketsRoutes);
app.use('/api/receipts',       receiptsRoutes);
app.use('/api/notifications',  notificationsRoutes);
app.use('/api/flights',        publicRoutes);            // ← Phase 4 public

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✈  Airline API v4 running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
});