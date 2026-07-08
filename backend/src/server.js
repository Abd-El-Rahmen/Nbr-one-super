require('dotenv').config();
const app = require('./app');

// Initialize DB connection eagerly
require('./config/db');

const PORT = process.env.PORT || 3000;
const db = require('./config/db');

// ─── Critical environment variable checks ────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('\n❌ FATAL: JWT_SECRET is not set in environment variables!');
  console.error('   Without a secure JWT_SECRET, all admin tokens can be forged.');
  console.error('   Please add JWT_SECRET=<a_long_random_string> to your .env file.\n');
  process.exit(1);
}


// --- EAGER MIGRATION ---
const runMigrations = async () => {
  try {
    console.log('Running automatic migrations...');
    // Seed 58 Wilayas
    const seedWilayas = require('./seed_wilayas');
    await seedWilayas();

    console.log('Migrations complete.');
  } catch(err) {
    console.error('Migration failed:', err);
  }
};
runMigrations();

const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📌 Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📦 API base    : http://localhost:${PORT}/api\n`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ HTTP server closed.');
    process.exit(0);
  });

  // Force shutdown if not done within 10s
  setTimeout(() => {
    console.error('❌ Could not close connections in time. Forcing exit.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections — log only, do NOT kill the server.
// Third-party services (Cloudinary, etc.) throwing is not a reason to crash.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection (server kept alive):', reason?.message || reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

module.exports = server;
