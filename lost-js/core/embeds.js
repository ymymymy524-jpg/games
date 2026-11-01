'use strict';
/** Unified Lost-branded embeds. */
const { EmbedBuilder } = require('discord.js');

const config = require('../config');
const { Colors } = config;
const { tr, mentions } = require('./utils');
const fx = require('./fx');

/** All embeds share the same (white) side bar, like the original bot. `_color` is kept for API parity. */
function base(title = null, description = null, _color = Colors.PRIMARY) {
  const e = new EmbedBuilder()
    .setColor(config.EMBED_COLOR)
    .setAuthor({ name: config.AUTHOR_NAME })
    .setFooter({ text: config.FOOTER_TEXT })
    .setTimestamp();
  if (title) e.setTitle(title);
  if (description) e.setDescription(description);
  return e;
}

const success = (description, title) => base(title || '✅', description, Colors.SUCCESS);
const error = (description, title) => base(title || '❌', description, Colors.DANGER);
const warning = (description, title) => base(title || '⚠️', description, Colors.WARNING);
const info = (description, title) => base(title || 'ℹ️', description, Colors.PRIMARY);

function lobbyEmbed(lang, { title, description, hostId, players, maxPlayers, started }) {
  const status = started ? tr(lang, 'lobby_started') : tr(lang, 'lobby_waiting');
  const body =
    `${description}\n\n` +
    `◆ **${tr(lang, 'lobby_players')}**\n\`${fx.bar(players.length, maxPlayers)}\`  **${players.length} / ${maxPlayers}**\n` +
    `${mentions(players, 3000)}`;
  return base(`🎲 ${title}`, body, started ? Colors.PRIMARY : Colors.PURPLE)
    .addFields(
      { name: `👑 ${tr(lang, 'lobby_host')}`, value: `<@${hostId}>`, inline: true },
      { name: '📡', value: status, inline: true },
    );
}

module.exports = { base, success, error, warning, info, lobbyEmbed };
