CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT 0,
  is_banned BOOLEAN DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gov_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'administrator'
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_text TEXT NOT NULL,
  lat REAL,
  lng REAL,
  category TEXT NOT NULL,
  image_path TEXT,
  status TEXT DEFAULT 'pending', -- pending, valid, fake
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS aqi_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  station_name TEXT NOT NULL,
  lat REAL,
  lng REAL,
  aqi INTEGER,
  pm25 REAL,
  pm10 REAL,
  no2 REAL,
  co REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed government user (username: admin, password: delhi2024 -> we'll hash it in init.js or use a pre-hashed string)
-- Let's just create the script in init.js to insert the admin user with a properly hashed password.
