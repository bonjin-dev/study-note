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
  const root = document.querySelector(theme === "dark" ? ".theme-d .sc-root" : ".theme-l .sc-root");
  if (root) document.body.style.backgroundColor = getComputedStyle(root).backgroundColor;
  document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
    b.setAttribute("aria-label", theme === "dark" ? "ライトモードにする" : "ダークモードにする");
  });
}
document.querySelectorAll("[data-theme-toggle]").forEach((b) => {
  b.addEventListener("click", () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", next); } catch (e) {}
    applyTheme(next);
  });
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
