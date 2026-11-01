'use strict';
/** Settings embed shared by /settings and /dashboard. */
const config = require('../config');
const { Colors } = config;
const embeds = require('./embeds');
const { tr, GAMES, gameName } = require('./utils');

/**
 * @param {string|null} section null = everything (/settings), or
 *   'general' | 'economy' | 'games' | 'solo' | 'two' | 'multi'
 */
function buildSettingsEmbed(bot, guildId, lang, section = null) {
  const g = bot.db.ensureGuild(guildId);
  const st = bot.db.allSettings(guildId);
  const title = section === null ? tr(lang, 'settings_title') : tr(lang, `dash_${section}`);
  const e = embeds.base(title, null, Colors.PRIMARY);

  if (section === null || section === 'general') {
    e.addFields(
      { name: tr(lang, 'set_prefix'), value: `\`${g.prefix}\``, inline: true },
      { name: tr(lang, 'set_lang'), value: g.language === 'ar' ? 'العربية' : 'English', inline: true },
    );
  }
  if (section === null || section === 'economy' || section === 'games' || section in GAMES) {
    e.addFields({ name: tr(lang, 'set_win'), value: st.win_points || String(config.DEFAULT_WIN_POINTS), inline: true });
  }
  if (section === null || section === 'multi' || section === 'games') {
    e.addFields({ name: tr(lang, 'set_max'), value: st.max_players || String(config.MAX_PLAYERS), inline: true });
  }
  const cats = section === null || section === 'games' ? Object.keys(GAMES) : section in GAMES ? [section] : [];
  for (const cat of cats) {
    const lines = GAMES[cat].map(([key, emoji]) => {
      const on = (st[`game_${key}_enabled`] || '1') === '1';
      return `${on ? '◉' : '○'} ${emoji} ${gameName(lang, key)}`;
    });
    e.addFields({ name: tr(lang, `dash_${cat}`), value: lines.join('\n'), inline: false });
  }
  return e;
}

module.exports = { buildSettingsEmbed };
