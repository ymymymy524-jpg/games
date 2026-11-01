CREATE TABLE IF NOT EXISTS guilds (
    id         INTEGER PRIMARY KEY,
    prefix     TEXT    NOT NULL DEFAULT '!',
    language   TEXT    NOT NULL DEFAULT 'en',
    created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
    guild_id INTEGER NOT NULL,
    key      TEXT    NOT NULL,
    value    TEXT    NOT NULL,
    PRIMARY KEY (guild_id, key)
);

CREATE TABLE IF NOT EXISTS players (
    user_id  INTEGER NOT NULL,
    guild_id INTEGER NOT NULL,
    points   INTEGER NOT NULL DEFAULT 0,
    coins    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, guild_id)
);
CREATE INDEX IF NOT EXISTS idx_players_top ON players (guild_id, points DESC);

CREATE TABLE IF NOT EXISTS games_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id  INTEGER NOT NULL,
    game      TEXT    NOT NULL,
    winner_id INTEGER,
    played_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS store_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    price       INTEGER NOT NULL,
    description TEXT    NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO store_items (name, price, description) VALUES
    ('🎖️ Lucky Charm', 100, 'A shiny charm for the lucky ones.'),
    ('👑 Golden Crown', 500, 'Show everyone who is the king.'),
    ('🚀 Rocket Badge', 250, 'Fast like a race winner.');

-- تعديلات الأوامر من الداشبورد (أسماء عربي/إنجليزي + وصف + العمل بدون بادئة)
CREATE TABLE IF NOT EXISTS command_overrides (
    guild_id  INTEGER NOT NULL,
    command   TEXT    NOT NULL,
    names_en  TEXT,
    names_ar  TEXT,
    desc_en   TEXT,
    desc_ar   TEXT,
    no_prefix INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (guild_id, command)
);
