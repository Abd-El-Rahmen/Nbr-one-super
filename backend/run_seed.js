const seedWilayas = require('./src/seed_wilayas');
seedWilayas().then(() => process.exit(0)).catch(console.error);
