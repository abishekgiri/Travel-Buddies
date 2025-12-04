const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, 'travel_buddies.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + err.message);
  } else {
    console.log('Connected to the SQLite database.');

    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      location TEXT,
      destination TEXT,
      age INTEGER,
      bio TEXT,
      interests TEXT,
      adventures TEXT,
      likes TEXT,
      dislikes TEXT,
      religious_views TEXT,
      relationship_status TEXT,
      phone TEXT,
      is_verified BOOLEAN DEFAULT 0,
      verification_code TEXT,
      reset_code TEXT,
      reset_code_expires DATETIME,
      cover_photo TEXT
    )`, (err) => {
      if (err) {
        console.error('Error creating table: ' + err.message);
      } else {
        // Migration: Add columns if they don't exist
        const columns = [
          "phone TEXT",
          "is_verified BOOLEAN DEFAULT 0",
          "verification_code TEXT",
          "reset_code TEXT",
          "reset_code_expires DATETIME",
          "cover_photo TEXT"
        ];

        columns.forEach(col => {
          const colName = col.split(' ')[0];
          db.run(`ALTER TABLE users ADD COLUMN ${col}`, (err) => {
            if (err && !err.message.includes("duplicate column")) {
              // Ignore duplicate column errors, log others
              // console.log(`Migration info for ${colName}:`, err.message);
            }
          });
        });

        // Create default admin/owner if not exists
        db.run(`
      INSERT OR IGNORE INTO users (name, email, password, role, location, destination, age, bio, interests, adventures, likes, dislikes, religious_views, relationship_status, avatar)
      VALUES ('Admin Owner', 'admin@travelbuddies.com', '$2b$10$rZ5qH8vK9X.yJ3wN2pL4ZOxYvZ8qH8vK9X.yJ3wN2pL4ZOxYvZ8qH', 'owner', 'Global', 'Everywhere', 30, 'Platform administrator', '["Management", "Travel"]', '["World Tour"]', '["Technology"]', '["Spam"]', 'Open-minded', 'Single', '👑')
    `);

        // Create trips table
        db.run(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      creator_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      destination TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      budget REAL,
      max_travelers INTEGER DEFAULT 10,
      description TEXT,
      image_url TEXT,
      latitude REAL,
      longitude REAL,
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (creator_id) REFERENCES users(id)
    )
  `, (err) => {
          if (!err) {
            // Migration: Add latitude/longitude if they don't exist
            db.run("ALTER TABLE trips ADD COLUMN latitude REAL", (err) => {
              if (err && !err.message.includes("duplicate column")) console.log("Migration info:", err.message);
            });
            db.run("ALTER TABLE trips ADD COLUMN longitude REAL", (err) => {
              if (err && !err.message.includes("duplicate column")) console.log("Migration info:", err.message);
            });
          }
        });

        // Create trip_members table
        db.run(`
    CREATE TABLE IF NOT EXISTS trip_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'joined',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(trip_id, user_id)
    )
  `);

        // Create trip_activities table
        db.run(`
    CREATE TABLE IF NOT EXISTS trip_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      activity TEXT NOT NULL,
      date TEXT,
      cost REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    )
  `);

        // Create conversations table
        db.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user1_id INTEGER NOT NULL,
      user2_id INTEGER NOT NULL,
      last_message TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user1_id) REFERENCES users(id),
      FOREIGN KEY (user2_id) REFERENCES users(id),
      UNIQUE(user1_id, user2_id)
    )
  `);

        // Create messages table
        db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (receiver_id) REFERENCES users(id)
    )
  `);

        // Create photos table
        db.run(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      trip_id INTEGER,
      url TEXT NOT NULL,
      caption TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (trip_id) REFERENCES trips(id)
    )
  `);
        // Create budgets table
        db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      total_budget REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `);

        // Create expenses table
        db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      description TEXT,
      paid_by INTEGER NOT NULL,
      split_among TEXT,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (budget_id) REFERENCES budgets(id),
      FOREIGN KEY (paid_by) REFERENCES users(id)
    )
  `);
      }
    });

    // Create transport_journeys table
    db.run(`
    CREATE TABLE IF NOT EXISTS transport_journeys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'flight', 'train', 'bus'
      carrier TEXT,
      transport_number TEXT,
      departure_location TEXT NOT NULL,
      arrival_location TEXT NOT NULL,
      departure_time DATETIME NOT NULL,
      arrival_time DATETIME NOT NULL,
      duration INTEGER, -- in minutes
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(type, carrier, transport_number, departure_time)
    )
  `);

    // Create journey_members table
    db.run(`
    CREATE TABLE IF NOT EXISTS journey_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journey_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'interested', -- 'interested', 'booked'
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (journey_id) REFERENCES transport_journeys(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(journey_id, user_id)
    )
  `);

    // Create notifications table
    db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'message', 'trip_invite', 'expense', 'system'
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT,
      read BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

    // Create trip_messages table
    db.run(`
    CREATE TABLE IF NOT EXISTS trip_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      sender_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      is_pinned BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id),
      FOREIGN KEY (sender_id) REFERENCES users(id)
    )
  `);
  }
});

module.exports = db;
