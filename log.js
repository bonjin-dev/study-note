/* =========================================================
   修練録 ― 日々の鍛錬の記録
   ========================================================= */

const today = new Date();
const todayKey = dayKey(today);
const G = goal();

/* ===== 上の見出し ===== */
// 第〇巻：はじめて記録した月から数えて何か月目か
const firstKey = Object.keys(LOG).sort()[0];
let vol = 1;
if (firstKey) {
  const f = new Date(firstKey);
  vol = (today.getFullYear() - f.getFullYear()) * 12 + (today.getMonth() - f.getMonth()) + 1;
}
setText("vol", "第" + kanjiNum(Math.min(vol, 99)) + "巻");
setText("wareki", wareki(today));

/* ===== 修練皆勤帳 ===== */
const streak = currentStreak();
const best = longestStreak();
setText("streak", streak);
setText("best", best);
setText("streak-badge", dayStat(todayKey).ok > 0 ? "鍛錬継続中" : streak > 0 ? "本日まだ" : "これから");

const solvedAll = DOJO_IDS.reduce((t, id) => t + solvedCount(id), 0);
const totalAll = DOJO_IDS.reduce((t, id) => t + DOJOS[id].total, 0);
setText("solved", solvedAll);

// 今月の正解率（正解 ÷ 答えた数）
let mOk = 0, mNg = 0;
for (let d = 1; d <= today.getDate(); d++) {
  const s = dayStat(dayKey(new Date(today.getFullYear(), today.getMonth(), d)));
  mOk += s.ok;
  mNg += s.ng;
}
const monthAcc = mOk + mNg ? Math.round(mOk / (mOk + mNg) * 1000) / 10 : null;
setText("month-acc", monthAcc === null ? "—" : monthAcc + "%");
setText("month-acc-num", monthAcc === null ? "—" : monthAcc);

// 証：三日坊主突破之証（3日連続）・皆勤の構え（7日連続）
document.querySelectorAll('[data-ach="three"]').forEach((el) => {
  el.classList.toggle("locked", best < 3);
  el.title = best < 3 ? "3日連続で修練すると手に入ります" : "3日連続の修練を達成";
});
document.querySelectorAll('[data-ach="seven"]').forEach((el) => {
  el.classList.toggle("locked", best < 7);
  el.title = best < 7 ? "7日連続で修練すると手に入ります" : "7日連続の修練を達成";
});

/* ===== 修練帖（今月のカレンダー） ===== */
const year = today.getFullYear(), month = today.getMonth();
const first = new Date(year, month, 1);
const lead = (first.getDay() + 6) % 7;            // 月曜はじまりにするための前の空き
const daysInMonth = new Date(year, month + 1, 0).getDate();
const cells = [];
for (let i = lead; i > 0; i--) cells.push({ date: addDays(first, -i), out: true });
for (let d = 1; d <= daysInMonth; d++) cells.push({ date: new Date(year, month, d) });
while (cells.length % 7) cells.push({ date: addDays(cells[cells.length - 1].date, 1), out: true });

// 正解数で濃さを4段階に（目標の数を基準にする）
function level(n) {
  if (n <= 0) return 0;
  if (n < G) return 1;
  if (n < G * 2) return 2;
  return 3;
}
const CAL = {
  l: {
    base: "aspect-square rounded flex items-center justify-center font-label-sm text-[10px]",
    out: "bg-surface-container-high/40 text-on-surface-variant/40",
    future: "bg-surface-container-high/40 text-on-surface-variant/40",
    lv: ["bg-surface-container-high text-on-surface-variant", "bg-primary-fixed-dim/60 text-on-primary-fixed",
         "bg-primary-container/80 text-on-primary", "bg-primary text-on-primary"],
    today: " shadow-sm ring-2 ring-primary",
    dot: ""
  },
  d: {
    base: "h-8 rounded-DEFAULT flex items-center justify-center font-label-sm text-label-sm",
    out: "bg-surface-container-highest/30 text-on-surface-variant/40",
    future: "bg-surface-container text-on-surface-variant/40",
    lv: ["bg-surface-container text-on-surface-variant/60", "bg-primary-container/30 text-on-surface",
         "bg-primary-container/60 text-on-surface font-semibold", "bg-primary-container text-on-primary font-bold"],
    today: " shadow-md shadow-primary-container/40 relative",
    dot: '<span class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-secondary-fixed"></span>'
  }
};
let studiedDays = 0;
["l", "d"].forEach((t) => {
  const c = CAL[t];
  const html = cells.map(({ date, out }) => {
    const key = dayKey(date);
    const n = dayStat(key).ok;
    const isToday = key === todayKey;
    let cls;
    if (out) cls = c.out;
    else if (date > today && !isToday) cls = c.future;
    else cls = c.lv[level(n)];
    const title = out ? "" : ` title="${date.getMonth() + 1}月${date.getDate()}日：${n}問"`;
    const num = isToday && c.dot ? `<span>${date.getDate()}</span>${c.dot}` : date.getDate();
    return `<div class="${c.base} ${cls}${isToday ? c.today : ""}"${title}>${num}</div>`;
  }).join("");
  document.querySelectorAll(`[data-list="cal-${t}"]`).forEach((el) => { el.innerHTML = html; });
});
for (let d = 1; d <= today.getDate(); d++) {
  if (dayStat(dayKey(new Date(year, month, d))).ok > 0) studiedDays++;
}
setText("days", studiedDays);
setText("attend", Math.round(studiedDays / today.getDate() * 100) + "%");

/* ===== 直近七日間 ===== */
const WEEK = ["日", "月", "火", "水", "木", "金", "土"];
const days7 = [];
for (let i = 6; i >= 0; i--) {
  const date = addDays(today, -i);
  days7.push({ label: i === 0 ? "今日" : WEEK[date.getDay()], n: dayStat(dayKey(date)).ok, today: i === 0 });
}
const sum7 = days7.reduce((t, d) => t + d.n, 0);
const max7 = Math.max(G, ...days7.map((d) => d.n));
const peak = Math.max(...days7.map((d) => d.n));
setText("sum7", sum7);
setText("avg7", (Math.round(sum7 / 7 * 10) / 10).toFixed(1));
setText("goal", G);
setText("goal7", Math.round(days7.filter((d) => d.n >= G).length / 7 * 100) + "%");

function barHTML(t, d) {
  const h = Math.max(d.n / max7 * 100, 3);
  const isPeak = d.n > 0 && d.n === peak;
  if (t === "l") {
    const num = d.today || isPeak ? "text-primary font-bold" : "text-on-surface font-semibold";
    let bar = d.n >= G ? "bg-primary-container" : "bg-primary-fixed-dim";
    if (isPeak) bar = "bg-primary shadow-sm";
    if (d.today) bar += " shadow-sm ring-1 ring-primary";
    const lab = d.today ? "text-primary font-bold" : "text-on-surface-variant";
    return `<div class="flex-1 flex flex-col items-center gap-1 h-full justify-end group">
      <span class="font-label-sm text-label-sm ${num}">${d.n}</span>
      <div class="w-full max-w-[28px] ${bar} rounded-t transition-all duration-300" style="height: ${h}%;"></div>
      <span class="font-label-sm text-label-sm ${lab} mt-1">${d.label}</span></div>`;
  }
  let num = "text-on-surface-variant", bar = d.n >= G ? "bg-primary/70 rounded-t-DEFAULT hover:bg-primary transition-colors" : "bg-surface-container-high rounded-t-DEFAULT hover:bg-primary/50 transition-colors";
  let lab = "text-on-surface-variant font-serif";
  if (isPeak) { num = "text-primary font-bold"; bar = "bg-primary-container rounded-t-DEFAULT shadow-sm shadow-primary-container/50"; lab = "text-primary font-serif font-bold"; }
  if (d.today) { num = "text-secondary-fixed-dim font-semibold"; bar = "bg-secondary-container rounded-t-DEFAULT"; lab = "text-secondary-fixed-dim font-serif font-semibold"; }
  return `<div class="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
    <span class="font-label-sm text-label-sm ${num}">${d.n}</span>
    <div class="w-full max-w-[28px] ${bar}" style="height: ${h}%;"></div>
    <span class="font-label-sm text-label-sm ${lab}">${d.label}</span></div>`;
}
["l", "d"].forEach((t) => {
  document.querySelectorAll(`[data-list="bars-${t}"]`).forEach((el) => {
    el.innerHTML = days7.map((d) => barHTML(t, d)).join("");
  });
});

/* ===== 三道場の習得状況 ===== */
setText("grand", solvedAll);
setText("grand-all", totalAll);
const SEP = { l: " • ", d: "・" };
DOJO_IDS.forEach((id) => {
  const last = lastChapter(id);
  const chapter = last ? "第" + kanjiNum(Math.min(last.ch, 99)) + "章" : "未着手";
  document.querySelectorAll(`[data-b="${id}-chapter"]`).forEach((el) => {
    const t = el.closest(".theme-d") ? "d" : "l";
    el.textContent = DOJOS[id].badge + SEP[t] + chapter;
  });
  setText(id + "-pct", solvedPercent(id) + "%");
  setText(id + "-solved", solvedCount(id));
  setText(id + "-total", DOJOS[id].total);
  setWidth(id, solvedPercent(id));
  const acc = dojoAccuracy(id);
  setText(id + "-acc", acc === null ? "—" : acc + "%");
  setText(id + "-ago", agoText(lastStudied(id)));
});
