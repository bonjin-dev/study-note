/* =========================================================
   bonjin's study note ― どのページでも使う共通の処理
   （記録の読み取り・ライト／ダーク・下のメニュー・準備中のお知らせ）
   ========================================================= */

/* ===== 道場の情報 ===== */
const DOJOS = {
  coding: { name: "Web & DB 道場", key: "coding-drill-v1", total: 240, href: "coding.html", badge: "入門" },
  java:   { name: "Java 道場",     key: "java-drill-v2",   total: 103, href: "java.html",   badge: "基礎強化" },
  run:    { name: "Java 実技道場", key: "java-run-v1",     total: 18,  href: "java-run.html", badge: "リアル実行" }
};
const DOJO_IDS = ["coding", "java", "run"];

/* ===== localStorage を安全に読む・書く ===== */
function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null || v === undefined ? fallback : v;
  } catch (e) {
    return fallback;
  }
}
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

/* ===== 日付 ===== */
function dayKey(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
const MONTH_NAMES = ["睦月", "如月", "弥生", "卯月", "皐月", "水無月", "文月", "葉月", "長月", "神無月", "霜月", "師走"];
const KANJI = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
// 1〜99 を漢数字に（例：24 → 二十四）
function kanjiNum(n) {
  if (n <= 10) return KANJI[n];
  const t = Math.floor(n / 10), o = n % 10;
  return (t > 1 ? KANJI[t] : "") + "十" + (o ? KANJI[o] : "");
}
// 例：2026年11月 → 令和八年 霜月
function wareki(date) {
  return "令和" + kanjiNum(date.getFullYear() - 2018) + "年 " + MONTH_NAMES[date.getMonth()];
}
// 例：今日→本日、1日前→昨日、それ以外→〇日前
function agoText(key) {
  if (!key) return "未着手";
  const diff = Math.round((new Date(dayKey(new Date())) - new Date(key)) / 86400000);
  if (diff <= 0) return "本日";
  if (diff === 1) return "昨日";
  return diff + "日前";
}

/* ===== 道場の記録 ===== */
function dojoStore(id) {
  return readJSON(DOJOS[id].key, null);
}
// 正解した問題の数（初めて正解した問題だけを数える）
function solvedCount(id) {
  const s = dojoStore(id);
  if (!s) return 0;
  return Object.keys(id === "run" ? s.done || {} : s.ok || {}).length;
}
function solvedPercent(id) {
  return Math.round(solvedCount(id) / DOJOS[id].total * 100);
}
// 最後に開いた項目（現在のチャプター）
function lastChapter(id) {
  return readJSON("dojo-last", {})[id] || null;
}

/* ===== 日付ごとの記録（dojo-log） =====
   {"2026-11-06": {"coding": {"ok": 3, "ng": 1}}} の形。前の形（数字だけ）も読めるようにする */
const LOG = readJSON("dojo-log", {});
function dayEntry(key, id) {
  const day = LOG[key];
  if (!day || !day[id]) return { ok: 0, ng: 0 };
  const v = day[id];
  return typeof v === "number" ? { ok: v, ng: 0 } : { ok: v.ok || 0, ng: v.ng || 0 };
}
// その日の正解数・不正解数（id を省くと3つの道場の合計）
function dayStat(key, id) {
  if (id) return dayEntry(key, id);
  return DOJO_IDS.reduce((t, d) => {
    const e = dayEntry(key, d);
    return { ok: t.ok + e.ok, ng: t.ng + e.ng };
  }, { ok: 0, ng: 0 });
}
function goal() {
  return Number(readJSON("dojo-goal", 5)) || 5;
}
// 今の連続日数（今日まだなら昨日から数える）
function currentStreak() {
  let d = new Date();
  if (dayStat(dayKey(d)).ok === 0) d = addDays(d, -1);
  let n = 0;
  while (dayStat(dayKey(d)).ok > 0) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
// これまででいちばん長い連続日数
function longestStreak() {
  const keys = Object.keys(LOG).filter((k) => dayStat(k).ok > 0).sort();
  let best = 0, run = 0, prev = null;
  keys.forEach((k) => {
    run = prev && dayKey(addDays(new Date(prev), 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  });
  return best;
}
// 道場ごとの正解率（これまでの合計）と、最後に学習した日
function dojoAccuracy(id) {
  let ok = 0, ng = 0;
  Object.keys(LOG).forEach((k) => {
    const e = dayEntry(k, id);
    ok += e.ok;
    ng += e.ng;
  });
  return ok + ng ? Math.round(ok / (ok + ng) * 100) : null;
}
function lastStudied(id) {
  const keys = Object.keys(LOG).filter((k) => {
    const e = dayEntry(k, id);
    return e.ok + e.ng > 0;
  }).sort();
  return keys.length ? keys[keys.length - 1] : null;
}

/* ===== 答えた記録を残す（鍛錬室で使う） ===== */
function logAnswer(id, ok) {
  const k = dayKey(new Date());
  const day = LOG[k] = LOG[k] || {};
  const e = dayEntry(k, id);
  e[ok ? "ok" : "ng"]++;
  day[id] = e;
  writeJSON("dojo-log", LOG);
}
// 苦手（不覚）を克服した記録 {"問題のid": {at: 時刻, n: 回数}}
function revengeLog() { return readJSON("dojo-revenge", {}) || {}; }
function addRevenge(qid) {
  const r = revengeLog();
  r[qid] = { at: Date.now(), n: ((r[qid] && r[qid].n) || 0) + 1 };
  writeJSON("dojo-revenge", r);
}
// コピー（写経）した回数
function countCopy() { writeJSON("dojo-copy", (Number(readJSON("dojo-copy", 0)) || 0) + 1); }

/* ===== 経験値（EXP）・段位・称号 =====
   1問正解（4択）10 ／ 穴埋め・記述・SQL・Java 実行の正解 20 ／ 雪辱 15 ／ 1日の目標達成 30 ／ 秘伝の書を1巻読む 5 */
const RANKS = [
  ["入門", 0], ["白帯", 100], ["黄帯", 300], ["緑帯", 700], ["青帯", 1500],
  ["茶帯", 3000], ["黒帯", 5000], ["師範代", 8000], ["師範", 12000]
];
function countKeys(o) { return o && typeof o === "object" ? Object.keys(o).filter((k) => o[k]).length : 0; }
function expParts() {
  const c = dojoStore("coding") || {}, j = dojoStore("java") || {}, r = dojoStore("run") || {};
  const quiz = countKeys(c.ok) + countKeys(j.ok);
  const input = countKeys(c.fill) + countKeys(c.write) + countKeys(c.sql) + countKeys(j.fill) + countKeys(j.write) + countKeys(j.sql) + countKeys(r.done);
  const revenge = Object.keys(revengeLog()).length;
  const goalDays = Object.keys(LOG).filter((k) => dayStat(k).ok >= goal()).length;
  const read = countKeys((readJSON("hiden-state", {}) || {}).read);
  return { quiz, input, revenge, goalDays, read };
}
function totalExp() {
  const p = expParts();
  return p.quiz * 10 + p.input * 20 + p.revenge * 15 + p.goalDays * 30 + p.read * 5;
}
// 段位 {name, exp, next(次の段位の名前), need(あと何 EXP), pct(次までの%)}
function rankInfo(exp) {
  if (exp === undefined) exp = totalExp();
  let i = 0;
  RANKS.forEach((r, k) => { if (exp >= r[1]) i = k; });
  const nx = RANKS[i + 1];
  return {
    name: RANKS[i][0], exp, level: i,
    next: nx ? nx[0] : null, need: nx ? nx[1] - exp : 0,
    pct: nx ? Math.round((exp - RANKS[i][1]) / (nx[1] - RANKS[i][1]) * 100) : 100
  };
}
// 称号
const TITLES = [
  { id: "first", name: "初陣", how: "はじめて1問正解", ok: (p) => p.quiz + p.input > 0 },
  { id: "three", name: "三日坊主卒業", how: "3日連続で修練", ok: () => longestStreak() >= 3 },
  { id: "seven", name: "七日の行", how: "7日連続で修練", ok: () => longestStreak() >= 7 },
  { id: "hundred", name: "百問斬り", how: "正解済みが100問", ok: () => DOJO_IDS.reduce((t, d) => t + solvedCount(d), 0) >= 100 },
  { id: "revenge", name: "雪辱の士", how: "まちがえた問題を10問克服", ok: (p) => p.revenge >= 10 },
  { id: "copy", name: "写経好き", how: "コードを10回写経（コピー）", ok: () => (Number(readJSON("dojo-copy", 0)) || 0) >= 10 },
  { id: "reader", name: "読書家", how: "秘伝の書を10巻読む", ok: (p) => p.read >= 10 },
  { id: "master", name: "皆伝", how: "どれか1つの道場を全問正解", ok: () => DOJO_IDS.some((d) => solvedCount(d) >= DOJOS[d].total) }
];
function titlesEarned() {
  const p = expParts();
  return TITLES.filter((t) => t.ok(p));
}

/* ===== 画面に値を入れる ===== */
// data-b="名前" がついている場所（ライト・ダーク両方）に文字を入れる
function setText(name, value) {
  document.querySelectorAll('[data-b="' + name + '"]').forEach((el) => {
    el.textContent = value;
  });
}
function setWidth(name, percent) {
  document.querySelectorAll('[data-w="' + name + '"]').forEach((el) => {
    el.style.width = percent + "%";
  });
}
function setShow(name, show) {
  document.querySelectorAll('[data-show="' + name + '"]').forEach((el) => {
    el.hidden = !show;
  });
}
function escapeHTML(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ===== ライト／ダーク ===== */
function currentTheme() {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // ページの外側の色を、いま見えている画面に合わせる
  const root = [...document.querySelectorAll(theme === "dark" ? ".theme-d .sc-root" : ".theme-l .sc-root")].find((r) => !r.closest("[hidden]"));
  if (root) document.body.style.backgroundColor = getComputedStyle(root).backgroundColor;
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
    b.setAttribute("aria-label", theme === "dark" ? "ライトモードにする" : "ダークモードにする");
  });
}
// あとから作り直した画面のボタンでも効くように、ページ全体で受け取る
document.addEventListener("click", (e) => {
  if (!e.target.closest("[data-theme-toggle]")) return;
  const next = currentTheme() === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", next); } catch (err) {}
  applyTheme(next);
});
applyTheme(currentTheme());

/* ===== 画面の下に出る、短いお知らせ ===== */
const toastBox = document.createElement("div");
toastBox.className = "soon-toast";
toastBox.setAttribute("role", "status");
toastBox.hidden = true;
document.body.appendChild(toastBox);
let toastTimer;
function showToast(message) {
  toastBox.textContent = message;
  toastBox.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastBox.hidden = true; }, 2200);
}

/* ===== まだ作っていないページ（準備中） ===== */
document.querySelectorAll("[data-soon]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    showToast("このページは準備中です。もう少し待ってね。");
  });
});

/* ===== 戻るボタン（前のページがなければトップへ） ===== */
document.querySelectorAll("[data-back]").forEach((b) => {
  b.addEventListener("click", (e) => {
    e.preventDefault();
    if (history.length > 1 && document.referrer.indexOf(location.host) >= 0) history.back();
    else location.href = "index.html";
  });
});
