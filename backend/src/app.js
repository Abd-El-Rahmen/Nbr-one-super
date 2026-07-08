require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middlewares/error.middleware');
const AppError = require('./utils/AppError');

// Route imports
const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/users/routes');
const categoryRoutes = require('./modules/categories/routes');
const productRoutes = require('./modules/products/routes');
const orderRoutes = require('./modules/orders/routes');
const customerRoutes = require('./modules/customers/routes');
const complaintRoutes = require('./modules/complaints/routes');
const inventoryRoutes = require('./modules/inventory/routes');
const messageRoutes = require('./modules/messages/routes');
const dashboardRoutes = require('./modules/dashboard/routes');
const deliveryPricingRoutes = require('./modules/delivery_pricing/routes');
const app = express();

// ─── Security ───────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));





// ─── Rate limiting ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: parseInt(process.env.RATE_LIMIT_MAX) || 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', limiter);

// Stricter limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);

// Stricter limiter for public submission endpoints (anti-spam)
const publicSubmitLimiter = rateLimit({
  windowMs: 100 * 60 * 1000, // 10 minutes
  max: 5, // 5 submissions per 10 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'لقد تجاوزت الحد المسموح به من الرسائل. يرجى الانتظار 10 دقائق.' },
});
app.use('/api/messages', publicSubmitLimiter);
app.use('/api/complaints', publicSubmitLimiter);
app.post('/api/orders', rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // max 10 order creations per 5 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'طلبات كثيرة جداً. يرجى الانتظار قليلاً.' },
}));

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ─────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});



// ─── Routes ──────────────────────────────────────────────────────────────────
const API = '/api';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/categories`, categoryRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/orders`, orderRoutes);
app.use(`${API}/customers`, customerRoutes);
app.use(`${API}/complaints`, complaintRoutes);
app.use(`${API}/inventory`, inventoryRoutes);
app.use(`${API}/messages`, messageRoutes);
app.use(`${API}/dashboard`, dashboardRoutes);
app.use(`${API}/delivery-pricing`, deliveryPricingRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────
app.all('*', (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found.`, 404));
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
