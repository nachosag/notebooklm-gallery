/**
 * D1 Schema — NotebookLM Gallery
 * Run on worker startup or via migration.
 */

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS notebooks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL CHECK(length(title) >= 3 AND length(title) <= 120),
  description TEXT NOT NULL CHECK(length(description) >= 20 AND length(description) <= 1000),
  share_url   TEXT NOT NULL UNIQUE,
  categories  TEXT NOT NULL DEFAULT '[]',
  tags        TEXT NOT NULL DEFAULT '[]',
  preview_url TEXT,
  likes       INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  ip_hash     TEXT
);

CREATE INDEX IF NOT EXISTS idx_notebooks_categories ON notebooks(categories);
CREATE INDEX IF NOT EXISTS idx_notebooks_likes ON notebooks(likes DESC);
CREATE INDEX IF NOT EXISTS idx_notebooks_created ON notebooks(created_at DESC);

CREATE TABLE IF NOT EXISTS likes_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  notebook_id TEXT NOT NULL REFERENCES notebooks(id),
  ip_hash     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(notebook_id, ip_hash)
);

CREATE TABLE IF NOT EXISTS submissions_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_submissions_ip ON submissions_log(ip_hash, created_at);

CREATE VIRTUAL TABLE IF NOT EXISTS notebooks_fts USING fts5(
  title, description, tags,
  content='notebooks',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS notebooks_ai AFTER INSERT ON notebooks BEGIN
  INSERT INTO notebooks_fts(rowid, title, description, tags)
  VALUES (new.rowid, new.title, new.description, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS notebooks_ad AFTER DELETE ON notebooks BEGIN
  INSERT INTO notebooks_fts(notebooks_fts, rowid, title, description, tags)
  VALUES ('delete', old.rowid, old.title, old.description, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS notebooks_au AFTER UPDATE ON notebooks BEGIN
  INSERT INTO notebooks_fts(notebooks_fts, rowid, title, description, tags)
  VALUES ('delete', old.rowid, old.title, old.description, old.tags);
  INSERT INTO notebooks_fts(rowid, title, description, tags)
  VALUES (new.rowid, new.title, new.description, new.tags);
END;
`;

export async function runSchema(env) {
	const statements = SCHEMA_SQL.split(";").filter((s) => s.trim());
	for (const sql of statements) {
		await env.DB.prepare(sql).run();
	}
	return { success: true };
}
