'use strict';
/** Shared UI pieces: Confirm + Challenge (collector-based "Views"). */
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags,
} = require('discord.js');

const embeds = require('./embeds');
const { tr } = require('./utils');
const log = require('./logger');

const EPHEMERAL = MessageFlags.Ephemeral;

// ───────────────────────── Confirm ─────────────────────────
function confirmRow(lang) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('confirm:yes').setEmoji('⚠️').setLabel(tr(lang, 'confirm')).setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('confirm:no').setEmoji('✖️').setLabel(tr(lang, 'cancel')).setStyle(ButtonStyle.Secondary),
  );
}

/**
 * Wait for the author to press Confirm/Cancel on `message`.
 * Resolves true (confirm), false (cancel) or null (timed out).
 */
function waitConfirm(message, authorId, lang, timeoutMs = 30000) {
  return new Promise((resolve) => {
    let value = null;
    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, idle: timeoutMs });
    collector.on('collect', async (i) => {
      try {
        if (!i.customId.startsWith('confirm:')) return;
        if (i.user.id !== authorId) {
          return await i.reply({ embeds: [embeds.error(tr(lang, 'not_yours'))], flags: EPHEMERAL });
        }
        value = i.customId === 'confirm:yes';
        await i.deferUpdate();
        collector.stop('done');
      } catch (err) {
        log.error('confirm collector failed', err);
      }
    });
    collector.on('end', () => resolve(value));
  });
}

// ───────────────────────── Challenge (1v1 invite) ─────────────────────────
/**
 * Validate + post a challenge. `onAccept(interaction)` must respond to the interaction.
 * Returns true if the challenge was posted.
 */
async function sendChallenge(bot, ctx, opponent, gameTitle, lang, onAccept) {
  const channelId = ctx.channel.id;
  if (opponent.user.bot || opponent.id === ctx.author.id) {
    await ctx.send({ embeds: [embeds.error(tr(lang, 'cant_self'))], ephemeral: true });
    return false;
  }
  if (bot.activeChannels.has(channelId)) {
    await ctx.send({ embeds: [embeds.warning(tr(lang, 'channel_busy'))], ephemeral: true });
    return false;
  }
  bot.activeChannels.add(channelId);

  const challenger = ctx.author;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ch:accept').setEmoji('✅').setLabel(lang === 'ar' ? 'قبول' : 'Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ch:decline').setEmoji('✖️').setLabel(lang === 'ar' ? 'رفض' : 'Decline').setStyle(ButtonStyle.Danger),
  );
  const embed = embeds.base(
    tr(lang, 'challenge_title'),
    tr(lang, 'challenge_desc', { challenger: `<@${challenger.id}>`, opponent: `<@${opponent.id}>`, game: gameTitle }),
  );

  let message;
  try {
    message = await ctx.send({ content: `<@${opponent.id}>`, embeds: [embed], components: [row] });
  } catch (err) {
    bot.activeChannels.delete(channelId);
    throw err;
  }

  const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, idle: 60000 });
  collector.on('collect', async (i) => {
    try {
      if (!i.customId.startsWith('ch:')) return;
      if (i.user.id !== challenger.id && i.user.id !== opponent.id) {
        return await i.reply({ embeds: [embeds.error(tr(lang, 'not_involved'))], flags: EPHEMERAL });
      }
      if (i.customId === 'ch:accept') {
        if (i.user.id !== opponent.id) {
          return await i.reply({ embeds: [embeds.error(tr(lang, 'only_opp'))], flags: EPHEMERAL });
        }
        collector.stop('accepted');
        try {
          await onAccept(i);
        } catch (err) {
          log.error('Challenge accept failed', err);
          bot.activeChannels.delete(channelId);
          throw err;
        }
      } else {
        collector.stop('declined');
        bot.activeChannels.delete(channelId);
        await i.update({ content: null, embeds: [embeds.warning(tr(lang, 'declined'))], components: [] });
      }
    } catch (err) {
      log.error('challenge handler failed', err);
    }
  });
  collector.on('end', async (_c, reason) => {
    if (reason !== 'idle' && reason !== 'time') return;
    bot.activeChannels.delete(channelId);
    await message.edit({ content: null, embeds: [embeds.warning(tr(lang, 'expired'))], components: [] }).catch(() => {});
  });
  return true;
}

module.exports = { confirmRow, waitConfirm, sendChallenge };
