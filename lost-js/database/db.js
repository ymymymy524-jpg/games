'use strict';
/**
 * SQLite layer (better-sqlite3).
 *
 * ملاحظة مهمة: أرقام الـ IDs في ديسكورد أكبر من أقصى رقم آمن في JavaScript،
 * عشان كده كل الـ IDs بتتعامل كـ String هنا (SQLite بيحوّلها لـ INTEGER لوحده
 * لأن الأعمدة INTEGER). نفس ملف lost.db القديم (بتاع بايثون) شغال مباشرة.
 */
const fs = require('node:fs');
const path = require('node:path');
const Better = require('better-sqlite3');

const config = require('../config');

const parseList = (raw) => {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.length ? v : null;
  } catch {
    return null;
  }
};

class LostDB {
  constructor(dbPath) {
    this.path = dbPath;
    this.conn = null;
    this._guilds = new Map(); // small cache (prefix/language)
  }

  connect() {
    fs.mkdirSync(path.dirname(this.path) || '.', { recursive: true });
    this.conn = new Better(this.path);
    this.conn.pragma('journal_mode = WAL');
    this.conn.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  }

  close() {
    if (this.conn) this.conn.close();
    this.conn = null;
  }

  // ---------- helpers ----------
  _run(sql, ...params) {
    return this.conn.prepare(sql).run(...params);
  }
  _one(sql, ...params) {
    return this.conn.prepare(sql).get(...params);
  }
  _all(sql, ...params) {
    return this.conn.prepare(sql).all(...params);
  }

  // ---------- guilds ----------
  ensureGuild(guildId) {
    const id = String(guildId);
    const cached = this._guilds.get(id);
    if (cached) return cached;
    this._run(
      'INSERT OR IGNORE INTO guilds (id, prefix, language) VALUES (?, ?, ?)',
      id, config.DEFAULT_PREFIX, config.DEFAULT_LANGUAGE,
    );
    const row = this._one('SELECT prefix, language FROM guilds WHERE id = ?', id);
    const g = { prefix: row.prefix, language: row.language };
    this._guilds.set(id, g);
    return g;
  }

  setPrefix(guildId, prefix) {
    const g = this.ensureGuild(guildId);
    this._run('UPDATE guilds SET prefix = ? WHERE id = ?', prefix, String(guildId));
    g.prefix = prefix;
  }

  setLanguage(guildId, lang) {
    const g = this.ensureGuild(guildId);
    this._run('UPDATE guilds SET language = ? WHERE id = ?', lang, String(guildId));
    g.language = lang;
  }

  // ---------- settings (key/value per guild) ----------
  getSetting(guildId, key, def = null) {
    const row = this._one('SELECT value FROM settings WHERE guild_id = ? AND key = ?', String(guildId), key);
    return row ? row.value : def;
  }

  setSetting(guildId, key, value) {
    this._run(
      'INSERT INTO settings (guild_id, key, value) VALUES (?, ?, ?) ' +
        'ON CONFLICT(guild_id, key) DO UPDATE SET value = excluded.value',
      String(guildId), key, String(value),
    );
  }

  allSettings(guildId) {
    const out = {};
    for (const r of this._all('SELECT key, value FROM settings WHERE guild_id = ?', String(guildId))) {
      out[r.key] = r.value;
    }
    return out;
  }

  // ---------- players / economy ----------
  getPlayer(userId, guildId) {
    const row = this._one('SELECT points, coins FROM players WHERE user_id = ? AND guild_id = ?', String(userId), String(guildId));
    return { user_id: String(userId), guild_id: String(guildId), points: row ? row.points : 0, coins: row ? row.coins : 0 };
  }

  addPoints(userId, guildId, points = 0, coins = 0) {
    this._run(
      'INSERT INTO players (user_id, guild_id, points, coins) VALUES (?, ?, ?, ?) ' +
        'ON CONFLICT(user_id, guild_id) DO UPDATE SET ' +
        'points = points + excluded.points, coins = coins + excluded.coins',
      String(userId), String(guildId), points, coins,
    );
  }

  getRank(userId, guildId) {
    const row = this._one(
      'SELECT COUNT(*) + 1 AS rnk FROM players WHERE guild_id = ? AND points > ' +
        'COALESCE((SELECT points FROM players WHERE user_id = ? AND guild_id = ?), 0)',
      String(guildId), String(userId), String(guildId),
    );
    return row.rnk;
  }

  top(guildId, limit = 10) {
    return this._all(
      'SELECT CAST(user_id AS TEXT) AS user_id, points, coins FROM players ' +
        'WHERE guild_id = ? AND points > 0 ORDER BY points DESC LIMIT ?',
      String(guildId), limit,
    );
  }

  resetPoints(guildId) {
    this._run('UPDATE players SET points = 0, coins = 0 WHERE guild_id = ?', String(guildId));
  }

  // ---------- log / store ----------
  logGame(guildId, game, winnerId) {
    this._run(
      'INSERT INTO games_log (guild_id, game, winner_id) VALUES (?, ?, ?)',
      String(guildId), game, winnerId == null ? null : String(winnerId),
    );
  }

  storeItems() {
    return this._all('SELECT * FROM store_items ORDER BY price');
  }

  // ---------- command overrides (dashboard) ----------
  getOverrides(guildId) {
    const map = new Map();
    for (const r of this._all('SELECT command, names_en, names_ar, desc_en, desc_ar, no_prefix FROM command_overrides WHERE guild_id = ?', String(guildId))) {
      map.set(r.command, {
        namesEn: parseList(r.names_en),
        namesAr: parseList(r.names_ar),
        descEn: r.desc_en || null,
        descAr: r.desc_ar || null,
        noPrefix: r.no_prefix !== 0,
      });
    }
    return map;
  }

  saveCommandText(guildId, command, { namesEn, namesAr, descEn, descAr }) {
    this._run(
      'INSERT INTO command_overrides (guild_id, command, names_en, names_ar, desc_en, desc_ar) ' +
        'VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(guild_id, command) DO UPDATE SET ' +
        'names_en = excluded.names_en, names_ar = excluded.names_ar, ' +
        'desc_en = excluded.desc_en, desc_ar = excluded.desc_ar',
      String(guildId), command,
      namesEn ? JSON.stringify(namesEn) : null,
      namesAr ? JSON.stringify(namesAr) : null,
      descEn || null, descAr || null,
    );
  }

  setCommandNoPrefix(guildId, command, enabled) {
    this._run(
      'INSERT INTO command_overrides (guild_id, command, no_prefix) VALUES (?, ?, ?) ' +
        'ON CONFLICT(guild_id, command) DO UPDATE SET no_prefix = excluded.no_prefix',
      String(guildId), command, enabled ? 1 : 0,
    );
  }

  resetCommand(guildId, command) {
    this._run('DELETE FROM command_overrides WHERE guild_id = ? AND command = ?', String(guildId), command);
  }
}

module.exports = { LostDB };
