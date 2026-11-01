'use strict';
/** Shared helpers: i18n (EN/AR), registries, formatting. */

// key: [English, العربية]
const S = {
  // --- errors ---
  err_guild: ["This command works in servers only.", "هذا الأمر يعمل داخل السيرفرات فقط."],
  err_perms: ["You don't have permission to do that.", "ليس لديك صلاحية لاستخدام هذا الأمر."],
  err_args: ["Invalid or missing arguments.", "المدخلات غير صحيحة أو ناقصة."],
  err_cooldown: ["Slow down! Try again in {s}s.", "على مهلك! حاول بعد {s} ثانية."],
  err_generic: ["Something went wrong. Please try again.", "حدث خطأ ما. حاول مرة أخرى."],
  not_yours: ["This menu isn't for you.", "هذه القائمة ليست لك."],
  game_disabled: ["This game is disabled on this server.", "هذه اللعبة معطّلة في هذا السيرفر."],
  channel_busy: ["A game is already running in this channel.", "توجد لعبة شغّالة بالفعل في هذه القناة."],
  soon: ["🚧 Coming soon!", "🚧 قريباً!"],
  // --- lobby ---
  join: ["Join", "انضمام"],
  leave: ["Leave", "مغادرة"],
  start: ["Start", "ابدأ"],
  cancel: ["Cancel", "إلغاء"],
  confirm: ["Confirm", "تأكيد"],
  lobby_players: ["Players", "اللاعبون"],
  lobby_host: ["Host", "المضيف"],
  lobby_waiting: ["⏳ Waiting for players…", "⏳ بانتظار اللاعبين…"],
  lobby_started: ["▶️ Game started!", "▶️ بدأت اللعبة!"],
  lobby_need: ["At least {n} players are required.", "يلزم {n} لاعبين على الأقل."],
  lobby_already: ["You already joined this lobby.", "أنت منضم بالفعل."],
  lobby_not_in: ["You're not in this lobby.", "أنت لست في هذه الغرفة."],
  lobby_full: ["The lobby is full.", "الغرفة ممتلئة."],
  lobby_began: ["The game already started.", "اللعبة بدأت بالفعل."],
  host_only: ["Only the host can do that.", "فقط صاحب الغرفة يستطيع ذلك."],
  // --- challenge ---
  challenge_title: ["⚔️ Challenge!", "⚔️ تحدّي!"],
  challenge_desc: [
    "{challenger} challenged {opponent} to **{game}**!\nPress ✅ to accept.",
    "{challenger} تحدّى {opponent} في **{game}**!\nاضغط ✅ للقبول.",
  ],
  only_opp: ["Only the challenged player can accept.", "فقط اللاعب المتحدَّى يستطيع القبول."],
  declined: ["❌ Challenge declined.", "❌ تم رفض التحدّي."],
  expired: ["⌛ Challenge expired.", "⌛ انتهى وقت التحدّي."],
  cant_self: ["You can't challenge yourself or a bot.", "لا يمكنك تحدّي نفسك أو بوت."],
  not_involved: ["This isn't your challenge.", "هذا التحدّي لا يخصّك."],
  // --- XO ---
  xo_title: ["❌⭕ XO", "❌⭕ إكس أو"],
  xo_teams: ["✕ Team X: {x}\n◯ Team O: {o}", "✕ فريق X: {x}\n◯ فريق O: {o}"],
  xo_turn: ["🎯 Turn: <@{uid}> ({sym})", "🎯 الدور على: <@{uid}> ({sym})"],
  xo_win: ["🏆 Team {sym} wins! +{pts} points each", "🏆 فريق {sym} فاز! +{pts} نقطة لكل لاعب"],
  xo_draw: ["🤝 It's a draw!", "🤝 تعادل!"],
  xo_timeout: [
    "⏰ <@{uid}> ran out of time. Team {sym} wins! (+{pts} pts)",
    "⏰ انتهى وقت <@{uid}>. فريق {sym} فاز! (+{pts} نقطة)",
  ],
  xo_not_turn: ["It's not your turn.", "ليس دورك."],
  xo_not_in: ["You're not part of this game.", "أنت لست جزءاً من هذه اللعبة."],
  xo_over: ["This game is over.", "انتهت هذه اللعبة."],
  xo_lobby_desc: [
    "Team battle! Players are split into ✕ and ◯ teams and take turns.",
    "معركة فرق! يتم تقسيم اللاعبين إلى فريقي ✕ و ◯ ويتناوبون على اللعب.",
  ],
  // --- RPS ---
  rps_title: ["✂️ Rock Paper Scissors", "✂️ حجر ورقة مقص"],
  rps_desc: ["{p1} vs {p2}\nPick your move — picks are hidden!", "{p1} ضد {p2}\nاختر حركتك — الاختيارات مخفية!"],
  rps_you: ["You chose {c}.", "اخترت {c}."],
  rps_already: ["You already picked.", "لقد اخترت بالفعل."],
  rps_waiting: ["{p}: ✅ picked", "{p}: ✅ اختار"],
  rps_pending: ["{p}: ⏳", "{p}: ⏳"],
  rps_result: ["{p1} {c1}  vs  {c2} {p2}", "{p1} {c1}  ضد  {c2} {p2}"],
  rps_win: ["🏆 {w} wins! +{pts} points", "🏆 {w} فاز! +{pts} نقطة"],
  rps_draw: ["🤝 Draw!", "🤝 تعادل!"],
  rps_rock: ["🪨 Rock", "🪨 حجر"],
  rps_paper: ["📄 Paper", "📄 ورقة"],
  rps_scissors: ["✂️ Scissors", "✂️ مقص"],
  replay: ["Replay", "إعادة"],
  // --- roulette ---
  roulette_title: ["🎡 Lucky Wheel", "🎡 عجلة الحظ"],
  roulette_desc: ["Everyone spins — one lucky winner takes the points!", "الكل يدور — فائز واحد محظوظ يأخذ النقاط!"],
  roulette_spin: ["🎡 Spinning the wheel…", "🎡 العجلة تدور…"],
  roulette_win: ["🎉 <@{uid}> won the wheel! +{pts} points", "🎉 <@{uid}> فاز بالعجلة! +{pts} نقطة"],
  // --- solo ---
  solo_math: ["Solve: **{q}**\n⏱️ 15 seconds", "حل: **{q}**\n⏱️ 15 ثانية"],
  solo_typing: ["Type this word as fast as you can:\n**`{w}`**", "اكتب هذه الكلمة بأسرع ما يمكن:\n**`{w}`**"],
  solo_flags: ["Which country is this flag? {f}", "من أي دولة هذا العلم؟ {f}"],
  solo_timeout: ["⏰ Time's up!", "⏰ انتهى الوقت!"],
  solo_right: ["✅ Correct! {t}s • +{pts} points", "✅ صحيح! {t} ث • +{pts} نقطة"],
  solo_wrong: ["❌ Wrong! The answer was **{a}**", "❌ خطأ! الإجابة كانت **{a}**"],
  // --- utility ---
  points_title: ["💰 {name}'s balance", "💰 رصيد {name}"],
  f_points: ["Points", "النقاط"],
  f_coins: ["Coins", "العملات"],
  f_rank: ["Rank", "الترتيب"],
  top_title: ["🏆 Server Leaderboard", "🏆 توب السيرفر"],
  top_empty: ["No players yet — go play something!", "لا يوجد لاعبين بعد — ابدأ اللعب!"],
  store_title: ["🛒 Lost Store", "🛒 متجر Lost"],
  store_empty: ["The store is empty.", "المتجر فارغ."],
  store_price: ["{p} 🪙", "{p} 🪙"],
  // --- admin ---
  about_title: ["About Lost", "عن Lost"],
  about_desc: [
    "Lost is a modern Discord games bot — solo, duo and up to 99-player lobbies.",
    "Lost بوت ألعاب ديسكورد عصري — ألعاب فردية وثنائية وغرف تصل إلى 99 لاعب.",
  ],
  about_version: ["Version", "الإصدار"],
  about_servers: ["Servers", "السيرفرات"],
  about_ping: ["Latency", "التأخير"],
  about_rights: ["Lost © 2026 — All rights reserved.", "Lost © 2026 — جميع الحقوق محفوظة."],
  help_title: ["📖 Lost Help", "📖 مساعدة Lost"],
  help_desc: [
    "Use the buttons to browse sections.\nPrefix: `{prefix}` • Slash: `/`",
    "استخدم الأزرار للتنقل بين الأقسام.\nالبريفكس: `{prefix}` • سلاش: `/`",
  ],
  help_intro: [
    "**Lost** is your all-in-one games hub.\n\nBrowse the sections with the buttons below, or type `/help <command>` for full details on any command, e.g. `/help xo`.\nEvery command works as a slash command (`/`), with your prefix `{prefix}`, and — by default — with no prefix at all.",
    "**Lost** هو مركز الألعاب الشامل الخاص بك.\n\nتصفّح الأقسام بالأزرار بالأسفل، أو اكتب `/help <الأمر>` لشرح كامل لأي أمر، مثل `/help xo`.\nكل الأوامر تعمل بالسلاش (`/`) وبالبريفكس `{prefix}` وكمان — افتراضياً — بدون أي بادئة.",
  ],
  help_home: ["Home", "الرئيسية"],
  help_usage: ["Usage", "طريقة الاستخدام"],
  help_names: ["Names", "الأسماء"],
  help_section: ["Section", "القسم"],
  help_unknown: [
    "I couldn't find a command called `{q}`. Try `/help` to browse them all.",
    "ما لقيت أمر اسمه `{q}`. جرّب `/help` لعرض كل الأوامر.",
  ],
  sec_admin: ["Admin", "الإدارة"],
  sec_solo: ["Solo", "فردي"],
  sec_two: ["Duo", "ثنائي"],
  sec_multi: ["Party", "جماعي"],
  sec_utility: ["Utility", "أدوات"],
  lang_prompt: ["🌐 Choose the server language:", "🌐 اختر لغة السيرفر:"],
  lang_changed: ["✅ Language changed to **{lang}**.", "✅ تم تغيير اللغة إلى **{lang}**."],
  prefix_current: ["Current prefix: `{p}`", "البريفكس الحالي: `{p}`"],
  prefix_changed: ["✅ Prefix changed to `{p}`", "✅ تم تغيير البريفكس إلى `{p}`"],
  prefix_invalid: ["Prefix must be 1–5 characters, no spaces.", "البريفكس يجب أن يكون 1–5 أحرف بدون مسافات."],
  reset_confirm: [
    "⚠️ This will reset **all** points & coins in this server. Continue?",
    "⚠️ سيتم تصفير **كل** النقاط والعملات في هذا السيرفر. متأكد؟",
  ],
  reset_done: ["✅ All points were reset.", "✅ تم تصفير كل النقاط."],
  reset_cancel: ["Cancelled.", "تم الإلغاء."],
  settings_title: ["⚙️ Server Settings", "⚙️ إعدادات السيرفر"],
  set_prefix: ["Prefix", "البريفكس"],
  set_lang: ["Language", "اللغة"],
  set_win: ["Win points", "نقاط الفوز"],
  set_max: ["Max players", "الحد الأقصى للاعبين"],
  // --- dashboard ---
  dash_title: ["🎛️ Lost Dashboard", "🎛️ لوحة تحكم Lost"],
  dash_desc: [
    "Pick a **section** from the menu below.\n\n" +
      "• **Command sections** — rename any command (Arabic & English), edit its description, and choose whether it works without a prefix.\n" +
      "• **Settings** — games, win points, prefix, language & economy.",
    "اختر **قسماً** من القائمة بالأسفل.\n\n" +
      "• **أقسام الأوامر** — عدّل اسم أي أمر (عربي وإنجليزي) ووصفه، وحدّد هل يشتغل بدون بادئة.\n" +
      "• **الإعدادات** — الألعاب ونقاط الفوز والبادئة واللغة والاقتصاد.",
  ],
  dash_pick: ["Choose a section…", "اختر قسم الأوامر…"],
  dash_cmd_pick: ["Choose a command to edit…", "اختر أمراً لتعديله…"],
  dash_opt_cmds: ["Edit this section's commands", "تعديل أوامر هذا القسم"],
  dash_opt_settings: ["Server settings", "إعدادات السيرفر"],
  dash_cmds_hint: [
    "Pick a command from the **second menu** to edit its names and description.",
    "اختر أمراً من **القائمة الثانية** لتعديل أسمائه ووصفه.",
  ],
  dash_games_ph: ["Enabled games (select to toggle)…", "الألعاب المفعّلة (اختر للتبديل)…"],
  dash_solo: ["🎮 Solo Games", "🎮 الألعاب الفردية"],
  dash_two: ["👥 Two-Player Games", "👥 ألعاب الثنائي"],
  dash_multi: ["🌐 Multiplayer Games", "🌐 الألعاب الجماعية"],
  dash_general: ["⚙️ General Settings", "⚙️ الإعدادات العامة"],
  dash_games: ["🎲 Games Settings", "🎲 إعدادات الألعاب"],
  dash_economy: ["💰 Economy & Points", "💰 الاقتصاد والنقاط"],
  lbl_general: ["General Settings", "الإعدادات العامة"],
  lbl_games: ["Games Settings", "إعدادات الألعاب"],
  lbl_economy: ["Economy & Points", "الاقتصاد والنقاط"],
  btn_win: ["Win points", "نقاط الفوز"],
  btn_max: ["Max players", "أقصى لاعبين"],
  btn_prefix: ["Prefix", "البريفكس"],
  btn_lang: ["Toggle language", "تبديل اللغة"],
  btn_reset: ["Reset points", "تصفير النقاط"],
  modal_win: ["Win points", "نقاط الفوز"],
  modal_max: ["Max players", "أقصى عدد لاعبين"],
  modal_prefix: ["Change prefix", "تغيير البريفكس"],
  invalid_number: ["Enter a number between {lo} and {hi}.", "أدخل رقماً بين {lo} و {hi}."],
  // --- dashboard: command editor ---
  btn_edit: ["Edit", "تعديل"],
  btn_np_on: ["No prefix: ON", "بدون بادئة: مفعّل"],
  btn_np_off: ["No prefix: OFF", "بدون بادئة: معطّل"],
  btn_cmd_reset: ["Reset to default", "استرجاع الافتراضي"],
  btn_back: ["Back", "رجوع"],
  f_names_en: ["🇬🇧 English name(s)", "🇬🇧 الاسم بالإنجليزي"],
  f_names_ar: ["🇸🇦 Arabic name(s)", "🇸🇦 الاسم بالعربي"],
  f_desc_en: ["📝 English description", "📝 الوصف بالإنجليزي"],
  f_desc_ar: ["📝 Arabic description", "📝 الوصف بالعربي"],
  f_noprefix: ["🔓 Without prefix", "🔓 بدون بادئة"],
  f_usage: ["⌨️ Usage", "⌨️ الاستخدام"],
  f_status: ["📌 Status", "📌 الحالة"],
  st_default: ["Default", "افتراضي"],
  st_custom: ["Customized", "معدّل"],
  state_on: ["✅ Enabled", "✅ مفعّل"],
  state_off: ["⛔ Disabled", "⛔ معطّل"],
  modal_cmd_title: ["Edit command", "تعديل الأمر"],
  lbl_name_en: ["English name(s) — comma separated", "الاسم بالإنجليزي (افصل بفاصلة)"],
  lbl_name_ar: ["Arabic name(s) — comma separated", "الاسم بالعربي (افصل بفاصلة)"],
  lbl_desc_en: ["English description", "الوصف بالإنجليزي"],
  lbl_desc_ar: ["Arabic description", "الوصف بالعربي"],
  cmd_err_empty: [
    "Enter at least one English name and one Arabic name.",
    "اكتب اسماً واحداً على الأقل بالإنجليزي واسماً بالعربي.",
  ],
  cmd_err_name: [
    "`{n}` is not valid. Names are 1–32 characters (letters, numbers, `-` or `_`, no spaces), max {max} per language.",
    "`{n}` غير صالح. الاسم من 1 إلى 32 حرفاً (حروف أو أرقام أو `-` أو `_` بدون مسافات) وبحد أقصى {max} أسماء لكل لغة.",
  ],
  cmd_err_taken: [
    "`{n}` is already used by another command (`{c}`).",
    "`{n}` مستخدم بالفعل في أمر آخر (`{c}`).",
  ],
};

// game registry: category -> [[key, emoji]]
const GAMES = {
  solo: [["math", "🧮"], ["typing", "⌨️"], ["flags", "🏳️"]],
  two: [["xo", "❌"], ["rps", "✂️"], ["connect4", "🔴"]],
  multi: [["xo_multi", "❌"], ["roulette", "🎡"], ["race", "🏁"]],
};

const GAME_NAMES = {
  math: ["Math", "رياضيات"], typing: ["Typing", "كتابة سريعة"], flags: ["Flags", "الأعلام"],
  xo: ["XO (1v1)", "إكس أو (1×1)"], rps: ["Rock Paper Scissors", "حجر ورقة مقص"],
  connect4: ["Connect 4", "كونكت 4"],
  xo_multi: ["XO (Team)", "إكس أو (فرق)"], roulette: ["Roulette", "عجلة الحظ"], race: ["Race", "سباق"],
};

// help / dashboard sections, in display order -> command keys
const SECTIONS = {
  admin: ["dashboard", "settings", "language", "prefix", "reset_points", "help", "about"],
  solo: ["math", "typing", "flags"],
  two: ["xo", "rps", "connect4"],
  multi: ["xo", "roulette", "race"],
  utility: ["points", "top", "store"],
};
const SECTION_EMOJI = { admin: "🛡️", solo: "🎮", two: "👥", multi: "🌐", utility: "🛠️" };

// long descriptions for /help <command>: key -> [en, ar]
const DETAILS = {
  dashboard: [
    "Interactive control panel. Pick a section, then pick a command to rename it (Arabic & English), edit its description, or choose whether it works without a prefix. Also manages games, win points, prefix, language and economy. Administrators only.",
    "لوحة تحكم تفاعلية. اختر قسماً ثم اختر أمراً لتعديل اسمه (عربي وإنجليزي) ووصفه وتحديد هل يشتغل بدون بادئة. كمان تدير الألعاب ونقاط الفوز والبادئة واللغة والاقتصاد. للإداريين فقط.",
  ],
  settings: [
    "Shows the current server settings: prefix, language, win points, max players, and which games are enabled.",
    "يعرض إعدادات السيرفر الحالية: البريفكس واللغة ونقاط الفوز والحد الأقصى للاعبين والألعاب المفعّلة.",
  ],
  language: [
    "Opens a menu to switch the whole bot between English and Arabic for this server.",
    "يفتح قائمة لتبديل لغة البوت بالكامل بين الإنجليزية والعربية في هذا السيرفر.",
  ],
  prefix: [
    "Shows or changes the text prefix (1–5 characters). Example: `/prefix ?` then use `?help`.",
    "يعرض أو يغيّر البريفكس (من 1 إلى 5 أحرف). مثال: `/prefix ?` ثم استخدم `?help`.",
  ],
  reset_points: [
    "Resets every player's points and coins on this server. Asks for confirmation first. Administrators only.",
    "يصفّر نقاط وعملات كل اللاعبين في السيرفر مع طلب تأكيد أولاً. للإداريين فقط.",
  ],
  help: [
    "Shows this menu. Use `/help <command>` for details about a single command.",
    "يعرض هذه القائمة. استخدم `/help <الأمر>` لتفاصيل أمر واحد.",
  ],
  about: ["Bot info: version, server count, latency, and credits.", "معلومات البوت: الإصدار وعدد السيرفرات والتأخير والحقوق."],
  math: [
    "Solve a random equation in 15 seconds. A 3-2-1 countdown starts the round; faster answers feel better and win points.",
    "حل معادلة عشوائية خلال 15 ثانية. تبدأ الجولة بعدّاد 3-2-1 والإجابة الصحيحة تمنحك نقاطاً.",
  ],
  typing: [
    "Type the shown word as fast as you can (10 seconds). Exact spelling is required.",
    "اكتب الكلمة الظاهرة بأسرع ما يمكن (10 ثوانٍ). يجب أن تكون مطابقة تماماً.",
  ],
  flags: [
    "Guess the country from its flag. English and Arabic names are accepted.",
    "خمّن الدولة من علمها. تُقبل الأسماء بالعربية والإنجليزية.",
  ],
  xo: [
    "Tic-tac-toe with buttons. `/xo @user` starts a 1v1 duel. `/xo` alone opens a team lobby for up to 99 players: everyone is split into ✕ and ◯ teams and takes turns. 30 seconds per turn; the winning line glows green.",
    "إكس أو بالأزرار. `/xo @user` يبدأ تحدّي 1×1. `/xo` بدون منشن يفتح غرفة جماعية حتى 99 لاعب: يُقسَّم الجميع إلى فريقي ✕ و ◯ ويتناوبون. 30 ثانية لكل دور وخط الفوز يضيء بالأخضر.",
  ],
  rps: [
    "Rock Paper Scissors against another player. Picks are hidden until both have chosen, then a short reveal animation plays. A Replay button appears afterwards.",
    "حجر ورقة مقص ضد لاعب آخر. الاختيارات مخفية حتى يختار الاثنان ثم تظهر النتيجة بأنيميشن قصير مع زر إعادة.",
  ],
  connect4: ["Connect 4 against another player. Coming soon.", "كونكت 4 ضد لاعب آخر. قريباً."],
  roulette: [
    "Opens a lobby. When the host presses Start, an animated wheel slows down on one random winner who takes the points.",
    "يفتح غرفة. عندما يضغط المضيف Start تدور عجلة متحركة وتتوقف على فائز عشوائي ياخد النقاط.",
  ],
  race: ["Race lobby. Coming soon.", "غرفة سباق. قريباً."],
  points: [
    "Shows your balance (points, coins, rank), or another player's with `/points @user`.",
    "يعرض رصيدك (النقاط والعملات والترتيب) أو رصيد لاعب آخر بـ `/points @user`.",
  ],
  top: ["The server leaderboard: top 10 players by points.", "توب السيرفر: أفضل 10 لاعبين حسب النقاط."],
  store: ["Browse items you can spend coins on.", "تصفّح العناصر التي يمكنك شراؤها بالعملات."],
};

/** Translate `key` into `lang` ("en" | "ar"). `{name}` placeholders are filled from `vars`. */
function tr(lang, key, vars) {
  const pair = S[key];
  if (!pair) return key;
  const text = lang === "ar" ? pair[1] : pair[0];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

function gameName(lang, key) {
  const pair = GAME_NAMES[key] || [key, key];
  return lang === "ar" ? pair[1] : pair[0];
}

/** Join user mentions, truncating with '+N' so embeds never overflow. */
function mentions(ids, limit = 1500) {
  const out = [];
  let total = 0;
  for (let i = 0; i < ids.length; i++) {
    const m = `<@${ids[i]}>`;
    if (total + m.length + 1 > limit) {
      out.push(`+${ids.length - i}`);
      break;
    }
    out.push(m);
    total += m.length + 1;
  }
  return out.join(" ") || "—";
}

function gameEnabled(db, guildId, key) {
  return db.getSetting(guildId, `game_${key}_enabled`, "1") === "1";
}

/**
 * Normalize a word for matching command names / answers:
 * lowercase, strip Arabic diacritics + tatweel, unify alef / yaa forms.
 */
function norm(s) {
  return String(s)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .trim();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mod = (a, n) => ((a % n) + n) % n;
const isAscii = (s) => /^[\x00-\x7F]*$/.test(s);

/** Fisher–Yates shuffle (returns a new array). */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = {
  S, GAMES, GAME_NAMES, SECTIONS, SECTION_EMOJI, DETAILS,
  tr, gameName, mentions, gameEnabled, norm, sleep, mod, isAscii, shuffle,
};
