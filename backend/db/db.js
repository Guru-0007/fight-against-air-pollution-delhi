import fs from 'fs';
import path from 'path';

// JSON-file database — lightweight persistent store
export default class JSONDatabase {
  constructor(filepath) {
    this.filepath = filepath;
    this.data = this._read();
  }

  _read() {
    try {
      if (fs.existsSync(this.filepath)) {
        return JSON.parse(fs.readFileSync(this.filepath, 'utf8'));
      }
    } catch (e) {
      console.error('DB read error:', e.message);
    }
    return { users: [], gov_users: [], reports: [] };
  }

  _write() {
    try {
      fs.writeFileSync(this.filepath, JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('DB write error:', e.message);
    }
  }

  // Query interface compatible with the route handlers
  prepare(sql) {
    return {
      get: (...params) => {
        if (sql.includes('FROM users WHERE username')) {
          return this.data.users.find(u => u.username === params[0]) || null;
        }
        if (sql.includes('FROM gov_users WHERE username')) {
          return this.data.gov_users.find(u => u.username === params[0]) || null;
        }
        if (sql.includes('FROM users WHERE id')) {
          return this.data.users.find(u => String(u.id) === String(params[0])) || null;
        }
        if (sql.includes('FROM reports WHERE id')) {
          return this.data.reports.find(r => String(r.id) === String(params[0])) || null;
        }
        return null;
      },
      all: (...params) => {
        if (sql.includes('FROM reports')) {
          let res = [...this.data.reports];
          // Join user display info
          res = res.map(r => {
            const u = this.data.users.find(u => String(u.id) === String(r.user_id)) || {};
            return { ...r, display_name: u.display_name || 'Unknown', is_verified: u.is_verified || 0, is_banned: u.is_banned || 0 };
          });
          if (sql.includes('WHERE r.status') || sql.includes('WHERE status')) {
            res = res.filter(r => r.status === params[0]);
          }
          return res.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }
        if (sql.includes('FROM users')) {
          return [...this.data.users];
        }
        return [];
      },
      run: (...params) => {
        if (sql.includes('INSERT INTO users')) {
          if (this.data.users.find(u => u.username === params[0])) {
            throw new Error('UNIQUE constraint: username already exists');
          }
          const id = Date.now() + Math.floor(Math.random() * 1000);
          this.data.users.push({
            id, username: params[0], password_hash: params[1],
            display_name: params[2], is_verified: 0, is_banned: 0,
            report_count: 0, created_at: new Date().toISOString()
          });
          this._write();
          return { lastInsertRowid: id };
        }
        if (sql.includes('INSERT INTO gov_users')) {
          if (this.data.gov_users.find(u => u.username === params[0])) {
            throw new Error('UNIQUE constraint: username already exists');
          }
          const id = Date.now() + Math.floor(Math.random() * 1000);
          this.data.gov_users.push({
            id, username: params[0], password_hash: params[1],
            name: params[2], role: params[3]
          });
          this._write();
          return { lastInsertRowid: id };
        }
        if (sql.includes('INSERT INTO reports')) {
          this.data.reports.push({
            id: params[0], user_id: params[1], title: params[2],
            description: params[3], location_text: params[4],
            lat: params[5], lng: params[6], category: params[7],
            image_path: params[8], status: 'pending',
            created_at: new Date().toISOString()
          });
          this._write();
          return { lastInsertRowid: params[0] };
        }
        if (sql.includes('UPDATE users SET report_count')) {
          const u = this.data.users.find(u => String(u.id) === String(params[0]));
          if (u) { u.report_count = (u.report_count || 0) + 1; this._write(); }
        }
        if (sql.includes('UPDATE users SET is_verified')) {
          const u = this.data.users.find(u => String(u.id) === String(params[0]));
          if (u) { u.is_verified = 1; this._write(); }
        }
        if (sql.includes('UPDATE reports SET status')) {
          const r = this.data.reports.find(r => String(r.id) === String(params[1]));
          if (r) { r.status = params[0]; this._write(); }
        }
        if (sql.includes('UPDATE users SET is_banned')) {
          const u = this.data.users.find(u => String(u.id) === String(params[1]));
          if (u) { u.is_banned = params[0]; this._write(); }
        }
        return { changes: 1 };
      }
    };
  }
}
