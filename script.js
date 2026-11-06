/* =========================================================
   bonjin's study note ― トップページの動き
   ========================================================= */

/* ===== Web & DB 道場 ===== */
const codingData=localStorage.getItem("coding-drill-v1");

const codingStore = JSON.parse(codingData);
let codingCount =0;
if (codingStore){
  codingCount = Object.keys(codingStore.ok).length;
}

const codingTotal = 240;
const codingPercent = Math.round(codingCount / codingTotal * 100);

document.getElementById("coding-text").textContent = codingPercent + "% 正解済み";
document.getElementById("coding-fill").style.width =codingPercent + "%";

/* ===== Java 道場 ===== */
const javaData=localStorage.getItem("java-drill-v2");

const javaStore = JSON.parse(javaData);
let javaCount =0;
if (javaStore){
  javaCount = Object.keys(javaStore.ok).length;
}

const javaTotal = 103;
const javaPercent = Math.round(javaCount / javaTotal * 100);

document.getElementById("java-text").textContent = javaPercent + "% 正解済み";
document.getElementById("java-fill").style.width =javaPercent + "%";

/* ===== Java 実技道場 ===== */
const runData=localStorage.getItem("java-run-v1");

const runStore = JSON.parse(runData);
let runCount =0;
if (runStore){
  runCount = Object.keys(runStore.done).length;
}

const runTotal = 18;
const runPercent = Math.round(runCount / runTotal * 100);

document.getElementById("run-text").textContent = runPercent + "% 正解済み";
document.getElementById("run-fill").style.width =runPercent + "%";

/* ===== 現在のチャプター（道場で最後に開いた項目） ===== */
const lastData = JSON.parse(localStorage.getItem("dojo-last")) || {};

["coding", "java", "run"].forEach((dojo) => {
  const last = lastData[dojo];
  if (last) {
    // 4 → "04" のように、2けたにそろえる
    document.getElementById(dojo + "-ch").textContent = "Chapter " + String(last.ch).padStart(2, "0");
    document.getElementById(dojo + "-last").textContent = last.title;
  }
});

/* ===== 連続修練日数・本日達成 ===== */
// 日付を "2026-11-06" の形の文字にする
function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

// その日に正解した数（3つの道場の合計）
const log = JSON.parse(localStorage.getItem("dojo-log")) || {};
function countOf(date) {
  const day = log[toKey(date)];
  if (!day) {
    return 0;
  }
  // 前の形（数字だけ）と、今の形（{ ok: 正解数, ng: 不正解数 }）のどちらでも数えられるようにする
  return Object.values(day).reduce((sum, n) => sum + (typeof n === "number" ? n : n.ok || 0), 0);
}

const today = new Date();
const todayCount = countOf(today);

// 今日（今日まだなら昨日）から、1問以上解いた日が何日続いているか数える
let streak = 0;
const day = new Date();
if (todayCount === 0) {
  day.setDate(day.getDate() - 1);
}
while (countOf(day) > 0) {
  streak++;
  day.setDate(day.getDate() - 1);
}

const goal = Number(localStorage.getItem("dojo-goal")) || 5;

document.getElementById("streak").textContent = streak + "日目";
document.getElementById("today-count").textContent = todayCount;
document.getElementById("today-goal").textContent = goal;

let note = "今日から始めよう";
if (todayCount >= goal) {
  note = "本日の目標達成🎉";
} else if (streak > 0) {
  note = "鍛錬継続中✨";
}
document.getElementById("streak-note").textContent = note;

/* ===== 凡人のコツ（開くたびに1つ選ぶ） ===== */
const advices = [
  "「エラーが出たらラッキー！」動かない理由を1つ知るたびに、プログラミングは必ず上達します。焦らず1問ずつ、我がペースで歩みを進めましょう。",
  "わからない問題は、ヒントを見てから、もう一度自分で書いてみよう。答えを写すより、ずっと身につきます。",
  "1日1問でも、毎日さわることが大事。昨日の自分より1問多く解けたら、それで十分な前進です。",
  "まちがえた問題は「苦手リスト」に入ります。苦手をつぶすのが、いちばんの近道です。",
  "エラーメッセージは敵ではなく道しるべ。何行目で、何が起きたのかを、まず落ち着いて読んでみよう。"
];
const numbers = ["壱", "弐", "参", "肆", "伍"];
const pick = Math.floor(Math.random() * advices.length);
document.getElementById("advice-text").textContent = advices[pick];
document.getElementById("advice-no").textContent = "• 凡人のコツ（巻の" + numbers[pick] + "）";

/* ===== ライト / ダーク切り替え ===== */
const themeBtn = document.getElementById("themeBtn");

function showTheme(theme) {
  if (theme === "dark") {
    themeBtn.setAttribute("aria-label", "ライトモードにする");
  } else {
    themeBtn.setAttribute("aria-label", "ダークモードにする");
  }
}

const savedTheme=localStorage.getItem("theme");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
  showTheme(savedTheme);
}

themeBtn.addEventListener("click",() => {
  const current = document.documentElement.getAttribute("data-theme");
  let next;
  if (current === "dark") {
    next = "light";
  } else {
    next = "dark";
  }
  document.documentElement.setAttribute("data-theme",next);
  localStorage.setItem("theme",next);
  showTheme(next);
});

/* ===== まだ作っていないページ（準備中） ===== */
const toast = document.getElementById("toast");
let toastTimer;
document.querySelectorAll("[data-soon]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 2000);
  });
});
