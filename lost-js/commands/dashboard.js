'use strict';
/**
 * /dashboard — control panel that lives entirely inside Discord (no website).
 *
 *   1) a select bar with ALL sections
 *   2) pick a command section  → a second select bar with ALL its commands
 *   3) pick a command          → an editor: Arabic + English names, descriptions,
 *                                 and "works without prefix" toggle
 *
 * Besides command sections the first bar also has the server-settings pages
 * (general, games, economy) that the old dashboard had.
 */
const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder,
  TextInputBuilder, TextInputStyle, ComponentType, MessageFlags, PermissionFlagsBits,
} = require('discord.js');

const config = require('../config');
const { Colors } = config;
const embeds = require('../core/embeds');
const { buildSettingsEmbed } = require('../core/settings');
const { confirmRow, waitConfirm } = require('../core/views');
const { tr, GAMES, SECTIONS, SECTION_EMOJI, gameName } = require('../core/utils');
const { MAX_DESC } = require('../core/commandManager');
const log = require('../core/logger');

const EPH = MessageFlags.Ephemeral;
const IDLE_MS = 300000;
const SETTING_PAGES = { general: '⚙️', games: '🎲', economy: '💰' };
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

class Dashboard {
  constructor(bot, ctx) {
    this.bot = bot;
    this.authorId = ctx.author.id;
    this.guildId = ctx.guildId;
    this.lang = bot.getLang(ctx.guildId);
    this.section = null; // null | key of SECTIONS | 'general' | 'games' | 'economy'
    this.cmdKey = null; // selected command inside a command section
    this.message = null;
    this.collector = null;
  }

  get isCommandSection() { return !!this.section && this.section in SECTIONS; }

  // ───────────────────────── components ─────────────────────────
  sectionSelect(disabled) {
    const { lang } = this;
    const options = [
      ...Object.keys(SECTIONS).map((k) => ({
        label: tr(lang, `sec_${k}`),
        value: k,
        emoji: { name: SECTION_EMOJI[k] },
        description: tr(lang, 'dash_opt_cmds'),
        default: this.section === k,
      })),
      ...Object.keys(SETTING_PAGES).map((k) => ({
        label: tr(lang, `lbl_${k}`),
        value: k,
        emoji: { name: SETTING_PAGES[k] },
        description: tr(lang, 'dash_opt_settings'),
        default: this.section === k,
      })),
    ];
    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dash:section')
        .setPlaceholder(tr(lang, 'dash_pick'))
        .addOptions(options)
        .setDisabled(disabled),
    );
  }

  commandSelect(disabled) {
    const { bot, lang, guildId, section } = this;
    const options = bot.cmds.inSection(section).map((def) => {
      const name = bot.cmds.displayName(guildId, def.key, lang);
      const desc = bot.cmds.describe(guildId, def.key, lang, section);
      return {
        label: `/${def.slash}`,
        value: def.key,
        emoji: { name: def.emoji },
        description: cut(`${name} — ${desc}`, 100),
        default: this.cmdKey === def.key,
      };
    });
    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('dash:cmd')
        .setPlaceholder(tr(lang, 'dash_cmd_pick'))
        .addOptions(options)
        .setDisabled(disabled),
    );
  }

  button(id, label, emoji, style = ButtonStyle.Secondary, disabled = false) {
    return new ButtonBuilder().setCustomId(`dash:${id}`).setLabel(label).setEmoji(emoji).setStyle(style).setDisabled(disabled);
  }

  gameSelect(cat, disabled) {
    const { lang } = this;
    const st = this.bot.db.allSettings(this.guildId);
    const options = GAMES[cat].map(([key, emoji]) => ({
      label: gameName(lang, key),
      value: key,
      emoji: { name: emoji },
      default: (st[`game_${key}_enabled`] || '1') === '1',
    }));
    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`dash:games:${cat}`)
        .setPlaceholder(`${tr(lang, `dash_${cat}`)} — ${tr(lang, 'dash_games_ph')}`.slice(0, 150))
        .setMinValues(0)
        .setMaxValues(options.length)
        .addOptions(options)
        .setDisabled(disabled),
    );
  }

  // ───────────────────────── embeds ─────────────────────────
  homeEmbed() {
    return embeds.base(tr(this.lang, 'dash_title'), tr(this.lang, 'dash_desc'), Colors.PURPLE);
  }

  sectionEmbed() {
    const { bot, lang, guildId, section } = this;
    const lines = bot.cmds.inSection(section).map((def) => {
      const eff = bot.cmds.effective(guildId, def.key);
      const names = [...eff.namesEn, ...eff.namesAr].map((n) => `\`${n}\``).join(' ');
      return `${def.emoji} **/${def.slash}** — ${bot.cmds.describe(guildId, def.key, lang, section)}\n┗ ${eff.noPrefix ? '🔓' : '🔒'} ${names}`;
    });
    return embeds.base(
      `🎛️ ${SECTION_EMOJI[section]} ${tr(lang, `sec_${section}`)}`,
      `${tr(lang, 'dash_cmds_hint')}\n\n${lines.join('\n\n')}`,
      Colors.PRIMARY,
    );
  }

  editorEmbed() {
    const { bot, lang, guildId, section } = this;
    const def = bot.cmds.get(this.cmdKey);
    const eff = bot.cmds.effective(guildId, def.key);
    const prefix = bot.db.ensureGuild(guildId).prefix;
    const usage = bot.cmds.usage(def, section);
    const argsPart = usage.split(' ').slice(1).join(' ');
    const usageLines = [`\`/${usage}\``, `\`${prefix}${usage}\``];
    if (eff.noPrefix) {
      usageLines.push(`\`${bot.cmds.displayName(guildId, def.key, lang)}${argsPart ? ` ${argsPart}` : ''}\``);
    }
    const list = (arr) => arr.map((n) => `\`${n}\``).join(' ');
    return embeds.base(`🎛️ ✏️ ${def.emoji} /${def.slash}`, bot.cmds.describe(guildId, def.key, lang, section), Colors.PRIMARY)
      .addFields(
        { name: tr(lang, 'f_names_en'), value: list(eff.namesEn), inline: true },
        { name: tr(lang, 'f_names_ar'), value: list(eff.namesAr), inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        { name: tr(lang, 'f_desc_en'), value: eff.descEn, inline: false },
        { name: tr(lang, 'f_desc_ar'), value: eff.descAr, inline: false },
        { name: tr(lang, 'f_noprefix'), value: tr(lang, eff.noPrefix ? 'state_on' : 'state_off'), inline: true },
        { name: tr(lang, 'f_status'), value: tr(lang, eff.customized ? 'st_custom' : 'st_default'), inline: true },
        { name: tr(lang, 'f_usage'), value: usageLines.join('\n'), inline: false },
      );
  }

  // ───────────────────────── render ─────────────────────────
  render(disabled = false) {
    const { lang } = this;
    const rows = [this.sectionSelect(disabled)];
    let embed;

    if (this.section === null) {
      embed = this.homeEmbed();
    } else if (this.isCommandSection) {
      rows.push(this.commandSelect(disabled));
      if (this.cmdKey) {
        const eff = this.bot.cmds.effective(this.guildId, this.cmdKey);
        embed = this.editorEmbed();
        rows.push(new ActionRowBuilder().addComponents(
          this.button('edit', tr(lang, 'btn_edit'), '✏️', ButtonStyle.Primary, disabled),
          this.button('np', tr(lang, eff.noPrefix ? 'btn_np_on' : 'btn_np_off'), eff.noPrefix ? '🔓' : '🔒',
            eff.noPrefix ? ButtonStyle.Success : ButtonStyle.Secondary, disabled),
          this.button('reset_cmd', tr(lang, 'btn_cmd_reset'), '♻️', ButtonStyle.Secondary, disabled || !eff.customized),
          this.button('back', tr(lang, 'btn_back'), '⬅️', ButtonStyle.Secondary, disabled),
        ));
      } else {
        embed = this.sectionEmbed();
      }
    } else {
      embed = buildSettingsEmbed(this.bot, this.guildId, lang, this.section);
      embed.setTitle(`🎛️ ${embed.data.title || ''}`);
      if (this.section === 'general') {
        rows.push(new ActionRowBuilder().addComponents(
          this.button('prefix', tr(lang, 'btn_prefix'), '✏️', ButtonStyle.Secondary, disabled),
          this.button('lang', tr(lang, 'btn_lang'), '🌐', ButtonStyle.Secondary, disabled),
        ));
      } else if (this.section === 'games') {
        for (const cat of Object.keys(GAMES)) rows.push(this.gameSelect(cat, disabled));
        rows.push(new ActionRowBuilder().addComponents(
          this.button('win', tr(lang, 'btn_win'), '🏆', ButtonStyle.Secondary, disabled),
          this.button('max', tr(lang, 'btn_max'), '👥', ButtonStyle.Secondary, disabled),
        ));
      } else if (this.section === 'economy') {
        rows.push(new ActionRowBuilder().addComponents(
          this.button('win', tr(lang, 'btn_win'), '🏆', ButtonStyle.Secondary, disabled),
          this.button('reset_points', tr(lang, 'btn_reset'), '🗑️', ButtonStyle.Danger, disabled),
        ));
      }
    }
    return { embeds: [embed], components: rows };
  }

  push(i) {
    return i.update(this.render());
  }

  // ───────────────────────── lifecycle ─────────────────────────
  async open(ctx) {
    this.message = await ctx.send(this.render());
    this.collector = this.message.createMessageComponentCollector({ idle: IDLE_MS });
    this.collector.on('collect', (i) => {
      this.handle(i).catch((err) => log.error('dashboard handler failed', err));
    });
    this.collector.on('end', (_c, reason) => {
      if (reason === 'idle' || reason === 'time') this.message.edit(this.render(true)).catch(() => {});
    });
  }

  async handle(i) {
    if (!i.customId.startsWith('dash:')) return undefined;
    const isAdmin = i.memberPermissions && i.memberPermissions.has(PermissionFlagsBits.Administrator);
    if (i.user.id !== this.authorId || !isAdmin) {
      return i.reply({ embeds: [embeds.error(tr(this.lang, 'err_perms'))], flags: EPH });
    }
    const [, action, extra] = i.customId.split(':');
    const { bot, guildId } = this;

    switch (action) {
      case 'section':
        this.section = i.values[0];
        this.cmdKey = null;
        return this.push(i);
      case 'cmd':
        this.cmdKey = i.values[0];
        return this.push(i);
      case 'back':
        this.cmdKey = null;
        return this.push(i);
      case 'edit':
        return this.onEditCommand(i);
      case 'np': {
        const eff = bot.cmds.effective(guildId, this.cmdKey);
        bot.cmds.setNoPrefix(guildId, this.cmdKey, !eff.noPrefix);
        return this.push(i);
      }
      case 'reset_cmd':
        bot.cmds.reset(guildId, this.cmdKey);
        return this.push(i);
      case 'games': // multi-select: chosen = enabled, the rest = disabled
        for (const [key] of GAMES[extra]) {
          bot.db.setSetting(guildId, `game_${key}_enabled`, i.values.includes(key) ? '1' : '0');
        }
        return this.push(i);
      case 'win': {
        const cur = bot.db.getSetting(guildId, 'win_points', String(config.DEFAULT_WIN_POINTS));
        return this.onNumber(i, 'win_points', 'modal_win', 1, 10000, cur);
      }
      case 'max': {
        const cur = bot.db.getSetting(guildId, 'max_players', String(config.MAX_PLAYERS));
        return this.onNumber(i, 'max_players', 'modal_max', 2, config.MAX_PLAYERS, cur);
      }
      case 'prefix':
        return this.onPrefix(i);
      case 'lang':
        this.lang = this.lang === 'en' ? 'ar' : 'en';
        bot.db.setLanguage(guildId, this.lang);
        return this.push(i);
      case 'reset_points':
        return this.onResetPoints(i);
      default:
        return undefined;
    }
  }

  // ───────────────────────── modals ─────────────────────────
  /** Show a modal for the component interaction `i` and wait for its submission. */
  async askModal(i, title, inputs) {
    const customId = `dash:modal:${i.id}`;
    const modal = new ModalBuilder().setCustomId(customId).setTitle(cut(title, 45));
    for (const f of inputs) {
      const input = new TextInputBuilder()
        .setCustomId(f.id)
        .setLabel(cut(f.label, 45))
        .setStyle(f.paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(f.required !== false)
        .setMaxLength(f.max || 100);
      if (f.value) input.setValue(cut(String(f.value), f.max || 100));
      modal.addComponents(new ActionRowBuilder().addComponents(input));
    }
    await i.showModal(modal);
    return i
      .awaitModalSubmit({ time: IDLE_MS, filter: (s) => s.customId === customId && s.user.id === i.user.id })
      .catch(() => null);
  }

  /** The heart of the new dashboard: edit one command's names (AR/EN) + descriptions. */
  async onEditCommand(i) {
    const { bot, guildId, lang } = this;
    const key = this.cmdKey;
    const eff = bot.cmds.effective(guildId, key);
    const sub = await this.askModal(i, tr(lang, 'modal_cmd_title'), [
      { id: 'en', label: tr(lang, 'lbl_name_en'), value: eff.namesEn.join(', '), max: 200 },
      { id: 'ar', label: tr(lang, 'lbl_name_ar'), value: eff.namesAr.join(', '), max: 200 },
      { id: 'den', label: tr(lang, 'lbl_desc_en'), value: eff.descEn, required: false, max: MAX_DESC },
      { id: 'dar', label: tr(lang, 'lbl_desc_ar'), value: eff.descAr, required: false, max: MAX_DESC },
    ]);
    if (!sub) return;
    const res = bot.cmds.updateText(guildId, key, {
      namesEn: sub.fields.getTextInputValue('en'),
      namesAr: sub.fields.getTextInputValue('ar'),
      descEn: sub.fields.getTextInputValue('den'),
      descAr: sub.fields.getTextInputValue('dar'),
    }, lang);
    if (res.error) return sub.reply({ embeds: [embeds.error(res.error)], flags: EPH });
    await this.push(sub);
  }

  async onNumber(i, settingKey, titleKey, lo, hi, current) {
    const { bot, guildId, lang } = this;
    const sub = await this.askModal(i, tr(lang, titleKey), [{ id: 'v', label: `${lo} – ${hi}`, value: current, max: 6 }]);
    if (!sub) return;
    const v = Number(sub.fields.getTextInputValue('v').trim());
    if (!Number.isInteger(v) || v < lo || v > hi) {
      return sub.reply({ embeds: [embeds.error(tr(lang, 'invalid_number', { lo, hi }))], flags: EPH });
    }
    bot.db.setSetting(guildId, settingKey, String(v));
    await this.push(sub);
  }

  async onPrefix(i) {
    const { bot, guildId, lang } = this;
    const cur = bot.db.ensureGuild(guildId).prefix;
    const sub = await this.askModal(i, tr(lang, 'modal_prefix'), [{ id: 'v', label: tr(lang, 'set_prefix'), value: cur, max: 5 }]);
    if (!sub) return;
    const raw = sub.fields.getTextInputValue('v').trim();
    if (raw.length < 1 || raw.length > 5 || /\s/.test(raw)) {
      return sub.reply({ embeds: [embeds.error(tr(lang, 'prefix_invalid'))], flags: EPH });
    }
    bot.db.setPrefix(guildId, raw);
    await this.push(sub);
  }

  async onResetPoints(i) {
    const { bot, guildId, lang } = this;
    await i.reply({ embeds: [embeds.warning(tr(lang, 'reset_confirm'))], components: [confirmRow(lang)], flags: EPH });
    const msg = await i.fetchReply();
    const ok = await waitConfirm(msg, i.user.id, lang);
    if (ok) {
      bot.db.resetPoints(guildId);
      await i.editReply({ embeds: [embeds.success(tr(lang, 'reset_done'))], components: [] });
    } else {
      await i.editReply({ embeds: [embeds.info(tr(lang, 'reset_cancel'))], components: [] });
    }
  }
}

module.exports = [
  {
    key: 'dashboard', slash: 'dashboard', emoji: '🎛️',
    names: { en: ['dashboard'], ar: ['داشبورد', 'لوحة'] },
    desc: { en: 'Interactive control panel', ar: 'لوحة تحكم تفاعلية' },
    slashDescription: '🎛️ Interactive control panel (Admin)',
    usage: 'dashboard',
    guildOnly: true,
    permissions: PermissionFlagsBits.Administrator,
    async run(ctx) {
      return new Dashboard(ctx.bot, ctx).open(ctx);
    },
  },
];

