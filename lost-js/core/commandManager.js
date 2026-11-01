'use strict';
/**
 * CommandManager
 *  - registry of every command (defined in /commands/*.js)
 *  - per-server overrides edited from /dashboard: Arabic/English names, descriptions,
 *    and whether the command works WITHOUT a prefix
 *  - fast lookup of text triggers ("help", "!help", "مساعدة", ...)
 */
const { ApplicationCommandOptionType } = require('discord.js');
const { SECTIONS, norm, tr } = require('./utils');

const NAME_RE = /^[\p{L}\p{M}\p{N}_-]{1,32}$/u;
const MAX_ALIASES = 5;
const MAX_DESC = 100; // also Discord's limit for select-menu option descriptions

class CommandManager {
  constructor(bot) {
    this.bot = bot;
    this.defs = new Map(); // key -> def
    this._slash = new Map(); // slash name -> def
    this._cache = new Map(); // guildId -> { overrides, triggers }
  }

  // ───────────── registry ─────────────
  register(def) {
    if (this.defs.has(def.key)) throw new Error(`Duplicate command key: ${def.key}`);
    this.defs.set(def.key, def);
    this._slash.set(def.slash, def);
  }

  /** Called once after every command is registered: catches typos / duplicate default names early. */
  verify() {
    const seen = new Map();
    for (const def of this.defs.values()) {
      for (const n of [...def.names.en, ...def.names.ar]) {
        const k = norm(n);
        if (seen.has(k) && seen.get(k) !== def.key) {
          throw new Error(`Default name "${n}" is used by both "${seen.get(k)}" and "${def.key}"`);
        }
        seen.set(k, def.key);
      }
    }
    for (const [section, keys] of Object.entries(SECTIONS)) {
      for (const k of keys) if (!this.defs.has(k)) throw new Error(`Section "${section}" lists unknown command "${k}"`);
    }
  }

  get(key) { return this.defs.get(key) || null; }
  bySlash(name) { return this._slash.get(name) || null; }

  /** Commands of a help/dashboard section, in display order. */
  inSection(section) {
    return (SECTIONS[section] || []).map((k) => this.defs.get(k)).filter(Boolean);
  }

  /** Usage line for a command inside a section, e.g. "xo @user". */
  usage(def, section) {
    return (def.usageBySection && def.usageBySection[section]) || def.usage || def.key;
  }

  // ───────────── per-guild data ─────────────
  _data(guildId) {
    const id = guildId ? String(guildId) : '_';
    let d = this._cache.get(id);
    if (!d) {
      const overrides = guildId ? this.bot.db.getOverrides(guildId) : new Map();
      d = { overrides, triggers: this._buildTriggers(overrides) };
      this._cache.set(id, d);
    }
    return d;
  }

  invalidate(guildId) { this._cache.delete(guildId ? String(guildId) : '_'); }

  _effectiveFrom(def, o) {
    return {
      namesEn: (o && o.namesEn) || def.names.en,
      namesAr: (o && o.namesAr) || def.names.ar,
      descEn: (o && o.descEn) || def.desc.en,
      descAr: (o && o.descAr) || def.desc.ar,
      noPrefix: o ? o.noPrefix : true, // default: works without a prefix
      customized: !!o,
    };
  }

  _buildTriggers(overrides) {
    const map = new Map();
    for (const def of this.defs.values()) {
      const e = this._effectiveFrom(def, overrides.get(def.key));
      for (const n of [...e.namesEn, ...e.namesAr]) {
        const k = norm(n);
        if (!map.has(k)) map.set(k, def.key);
      }
    }
    return map;
  }

  /** Effective (override-aware) data for one command in one server. */
  effective(guildId, key) {
    const def = this.defs.get(key);
    return this._effectiveFrom(def, this._data(guildId).overrides.get(key));
  }

  /**
   * Description in the given language. Priority: server override → per-section
   * default (e.g. xo inside "Party") → the command's default description.
   */
  describe(guildId, key, lang, section = null) {
    const def = this.defs.get(key);
    const o = this._data(guildId).overrides.get(key);
    const custom = o && (lang === 'ar' ? o.descAr : o.descEn);
    if (custom) return custom;
    const bySection = section && def.descBySection && def.descBySection[section];
    if (bySection) return lang === 'ar' ? bySection.ar : bySection.en;
    return lang === 'ar' ? def.desc.ar : def.desc.en;
  }

  /** The text name shown to people in this language (first one). */
  displayName(guildId, key, lang) {
    const e = this.effective(guildId, key);
    return (lang === 'ar' ? e.namesAr : e.namesEn)[0];
  }

  /** Find a command by one of its text names (English or Arabic). */
  match(guildId, word) {
    const key = this._data(guildId).triggers.get(norm(word));
    return key ? this.defs.get(key) : null;
  }

  /** Find a command by name, slash name, or key (used by /help <command>). */
  lookup(guildId, word) {
    const w = norm(word);
    for (const def of this.defs.values()) if (norm(def.key) === w || norm(def.slash) === w) return def;
    return this.match(guildId, word);
  }

  // ───────────── editing (dashboard) ─────────────
  /** Split "a, b،c d" into unique aliases. Returns { names } or { error }. */
  _parseNames(raw, lang) {
    const parts = String(raw || '').split(/[,،;\n\s]+/).map((s) => s.trim()).filter(Boolean);
    const names = [];
    const seen = new Set();
    for (const p of parts) {
      const name = p.replace(/^[/!]+/, ''); // people often type "/xo" or "!xo"
      if (!NAME_RE.test(name)) return { error: tr(lang, 'cmd_err_name', { n: p.slice(0, 40), max: MAX_ALIASES }) };
      const k = norm(name);
      if (!seen.has(k)) { seen.add(k); names.push(name); }
    }
    if (names.length > MAX_ALIASES) return { error: tr(lang, 'cmd_err_name', { n: names[MAX_ALIASES], max: MAX_ALIASES }) };
    return { names };
  }

  /**
   * Validate + save new names/descriptions for one command.
   * @returns {{ok: true} | {error: string}}
   */
  updateText(guildId, key, input, lang) {
    const def = this.defs.get(key);
    const en = this._parseNames(input.namesEn, lang);
    if (en.error) return en;
    const ar = this._parseNames(input.namesAr, lang);
    if (ar.error) return ar;
    if (!en.names.length || !ar.names.length) return { error: tr(lang, 'cmd_err_empty') };

    // no two commands may share a text name
    const triggers = this._data(guildId).triggers;
    for (const n of [...en.names, ...ar.names]) {
      const owner = triggers.get(norm(n));
      if (owner && owner !== key) return { error: tr(lang, 'cmd_err_taken', { n, c: owner }) };
    }

    const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, MAX_DESC);
    const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    const descEn = clean(input.descEn);
    const descAr = clean(input.descAr);
    this.bot.db.saveCommandText(guildId, key, {
      namesEn: same(en.names, def.names.en) ? null : en.names, // null = keep default
      namesAr: same(ar.names, def.names.ar) ? null : ar.names,
      descEn: descEn && descEn !== def.desc.en ? descEn : null,
      descAr: descAr && descAr !== def.desc.ar ? descAr : null,
    });
    this.invalidate(guildId);
    return { ok: true };
  }

  setNoPrefix(guildId, key, enabled) {
    this.bot.db.setCommandNoPrefix(guildId, key, enabled);
    this.invalidate(guildId);
  }

  reset(guildId, key) {
    this.bot.db.resetCommand(guildId, key);
    this.invalidate(guildId);
  }

  // ───────────── slash registration ─────────────
  slashJSON() {
    const T = ApplicationCommandOptionType;
    return [...this.defs.values()].map((def) => {
      const body = {
        name: def.slash,
        description: def.slashDescription.slice(0, 100),
        options: (def.options || []).map((o) => ({
          type: o.type === 'user' ? T.User : T.String,
          name: o.name,
          description: o.description.slice(0, 100),
          required: !!o.required,
        })),
      };
      if (def.guildOnly) body.dm_permission = false;
      return body;
    });
  }
}

module.exports = { CommandManager, NAME_RE, MAX_ALIASES, MAX_DESC };
