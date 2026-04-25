import pg from "pg";
import bcrypt from "bcrypt";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sampleUsers = [
  { username: "admin", password: "admin123", name: "مدير النظام", role: "رئيس الجامعة", isAdmin: true, email: "admin@trustdoc.local" },
  { username: "khalid", password: "khalid123", name: "خالد", role: "Document-Creator", isAdmin: false, email: "khalid@trustdoc.local" },
  { username: "sara", password: "sara123", name: "سارة", role: "Graduate-Affairs", isAdmin: false, email: "sara@trustdoc.local" },
  { username: "ahmed", password: "ahmed123", name: "أحمد", role: "College-Registrar", isAdmin: false, email: "ahmed@trustdoc.local" },
  { username: "fatima", password: "fatima123", name: "فاطمة", role: "Dean", isAdmin: false, email: "fatima@trustdoc.local" },
  { username: "nasser", password: "nasser123", name: "ناصر", role: "General-Registrar", isAdmin: false, email: "nasser@trustdoc.local" },
  { username: "ali", password: "ali123", name: "علي", role: "Accountant", isAdmin: false, email: "ali@trustdoc.local" },
];

async function run() {
  const client = await pool.connect();
  try {
    console.log("Creating supplemental tables (login_attempts, password_resets)...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        ip_address TEXT,
        success BOOLEAN NOT NULL DEFAULT FALSE,
        attempted_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS login_attempts_username_idx ON login_attempts(username);
      CREATE INDEX IF NOT EXISTS login_attempts_attempted_at_idx ON login_attempts(attempted_at);
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        used BOOLEAN NOT NULL DEFAULT FALSE
      );
      CREATE INDEX IF NOT EXISTS password_resets_code_idx ON password_resets(code);
      CREATE INDEX IF NOT EXISTS password_resets_user_id_idx ON password_resets(user_id);
    `);

    console.log("Seeding sample users (idempotent)...");
    for (const u of sampleUsers) {
      const existing = await client.query("SELECT id FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1", [u.username]);
      if (existing.rows.length > 0) {
        console.log(`  • ${u.username} already exists, skipping`);
        continue;
      }
      const hashed = await bcrypt.hash(u.password, 10);
      await client.query(
        `INSERT INTO users (username, password, name, role, is_admin, email, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
        [u.username, hashed, u.name, u.role, u.isAdmin, u.email],
      );
      console.log(`  ✓ created ${u.username}`);
    }

    console.log("Done.");
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
