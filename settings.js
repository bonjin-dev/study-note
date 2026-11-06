/* =========================================================
   道場設定 ― 1日の目標・昼夜の構え・修練録の継承
   ========================================================= */

/* ===== 1日の目標問数 ===== */
let pendingGoal = goal();

// 選ばれている札・選ばれていない札の見た目を、Stitch のデザインからそのまま借りる
function chipLooks(root) {
  const chips = [...root.querySelectorAll(".target-chip")];
  const active = chips.find((c) => c.classList.contains("active-chip"));
  const normal = chips.find((c) => !c.classList.contains("active-chip"));
  const snap = (el) => [el.className, ...[...el.querySelectorAll("*")].map((x) => x.getAttribute("class") || "")];
  return { on: snap(active), off: snap(normal) };
}
const looks = {};
["l", "d"].forEach((t) => {
  const root = document.querySelector(".theme-" + t);
  if (root) looks[t] = chipLooks(root);
});

function showGoal(n) {
  ["l", "d"].forEach((t) => {
    const root = document.querySelector(".theme-" + t);
    if (!root) return;
    root.querySelectorAll(".target-chip").forEach((chip) => {
      const look = Number(chip.dataset.count) === n ? looks[t].on : looks[t].off;
      chip.className = look[0];
      [...chip.querySelectorAll("*")].forEach((el, i) => {
        if (look[i + 1] !== undefined) el.setAttribute("class", look[i + 1]);
      });
      chip.setAttribute("aria-pressed", Number(chip.dataset.count) === n);
    });
  });
  document.querySelectorAll('[id^="target-count-display"]').forEach((el) => { el.textContent = n; });
}
document.querySelectorAll(".target-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    pendingGoal = Number(chip.dataset.count);
    showGoal(pendingGoal);
  });
});
showGoal(pendingGoal);

/* ===== 昼夜の構え（押したらすぐ切り替える） ===== */
document.querySelectorAll('[id^="theme-btn-light"], [id^="theme-btn-dark"]').forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.id.indexOf("dark") >= 0 ? "dark" : "light";
    try { localStorage.setItem("theme", theme); } catch (e) {}
    applyTheme(theme);
  });
});

/* ===== 保存 ===== */
document.querySelectorAll('[data-act="save"]').forEach((b) => {
  b.addEventListener("click", () => {
    writeJSON("dojo-goal", pendingGoal);
    showToast("道場構えを保存しました（1日 " + pendingGoal + " 問）");
  });
});

/* ===== 修練録の継承（書き出し・読み込み） ===== */
const KEYS = ["coding-drill-v1", "java-drill-v2", "java-run-v1", "java-run-v1-pos", "dojo-log", "dojo-last", "dojo-goal", "theme", "hiden-state", "hiden-mine"];

function feedback(ok, text) {
  document.querySelectorAll('[id^="transfer-feedback"]').forEach((box) => {
    box.classList.remove("hidden");
    box.hidden = false;
  });
  document.querySelectorAll('[id^="feedback-icon"]').forEach((i) => { i.textContent = ok ? "check_circle" : "error"; });
  document.querySelectorAll('[id^="feedback-text"]').forEach((t) => { t.textContent = text; });
}
function boxes() {
  return [...document.querySelectorAll('[id^="transfer-data-input"]')];
}
// いま見えている画面の入力欄
function visibleBox() {
  return boxes().find((b) => b.closest(currentTheme() === "dark" ? ".theme-d" : ".theme-l"));
}

// 書き出す
document.querySelectorAll('[data-act="export"]').forEach((b) => {
  b.addEventListener("click", () => {
    const data = {};
    KEYS.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null) data[k] = v;
    });
    const text = JSON.stringify({ app: "bonjin-study-note", v: 1, data: data });
    boxes().forEach((box) => { box.value = text; });
    const done = () => feedback(true, "修練録を書き出し、写しました。引き継ぎ先の道場設定で「読み込む」を押してください。");
    const fail = () => {
      const box = visibleBox();
      if (box) { box.focus(); box.select(); }
      feedback(true, "修練録を書き出しました。欄の文字を全部選んでコピーしてください。");
    };
    try { navigator.clipboard.writeText(text).then(done, fail); } catch (e) { fail(); }
  });
});

// 貼りつけ
document.querySelectorAll('[data-act="paste"]').forEach((b) => {
  b.addEventListener("click", () => {
    const fail = () => feedback(false, "自動で貼りつけられませんでした。欄を長押し（Ctrl+V）して貼りつけてください。");
    try {
      navigator.clipboard.readText().then((t) => { boxes().forEach((box) => { box.value = t; }); }, fail);
    } catch (e) { fail(); }
  });
});

// 2つの記録を合わせる（今ある記録は消さない）
function mergeStore(cur, add) {
  cur = cur || {};
  ["ok", "sql", "write", "fill", "fav", "done"].forEach((k) => {
    if (!add[k] || typeof add[k] !== "object") return;
    cur[k] = cur[k] || {};
    Object.keys(add[k]).forEach((id) => { if (add[k][id]) cur[k][id] = add[k][id]; });
  });
  if (add.miss && typeof add.miss === "object") {
    cur.miss = cur.miss || {};
    Object.keys(add.miss).forEach((id) => { cur.miss[id] = Math.max(cur.miss[id] || 0, +add.miss[id] || 1); });
  }
  if (add.code && typeof add.code === "object") cur.code = Object.assign({}, add.code, cur.code || {});
  if (!cur.last && add.last) cur.last = add.last;
  return cur;
}
function mergeLog(cur, add) {
  cur = cur || {};
  Object.keys(add).forEach((day) => {
    cur[day] = cur[day] || {};
    Object.keys(add[day]).forEach((id) => {
      const a = typeof add[day][id] === "number" ? { ok: add[day][id], ng: 0 } : add[day][id];
      const c = typeof cur[day][id] === "number" ? { ok: cur[day][id], ng: 0 } : cur[day][id] || { ok: 0, ng: 0 };
      // 同じ記録を2回読み込んでも増えすぎないよう、多いほうを使う
      cur[day][id] = { ok: Math.max(c.ok || 0, a.ok || 0), ng: Math.max(c.ng || 0, a.ng || 0) };
    });
  });
  return cur;
}

// 読み込む
document.querySelectorAll('[data-act="import"]').forEach((b) => {
  b.addEventListener("click", () => {
    const box = visibleBox();
    const text = (box ? box.value : "").trim();
    let obj;
    try { obj = JSON.parse(text); } catch (e) {
      feedback(false, "読み込めませんでした。書き出した文字を、全部そのまま貼りつけてください。");
      return;
    }
    // 道場の中の「記録の引き継ぎ」で書き出したもの（1つの道場だけ）
    const STORE_KEYS = ["coding-drill-v1", "java-drill-v2", "java-run-v1"];
    let data;
    if (obj && obj.app === "bonjin-study-note" && obj.data) {
      data = obj.data;
    } else if (obj && STORE_KEYS.indexOf(obj.app) >= 0 && obj.data) {
      data = {};
      data[obj.app] = JSON.stringify(obj.data);
    } else {
      feedback(false, "これは bonjin's study note の記録ではないようです。");
      return;
    }
    let before = DOJO_IDS.reduce((t, id) => t + solvedCount(id), 0);
    Object.keys(data).forEach((k) => {
      if (KEYS.indexOf(k) < 0) return;
      let v;
      try { v = JSON.parse(data[k]); } catch (e) { v = data[k]; }
      if (STORE_KEYS.indexOf(k) >= 0) writeJSON(k, mergeStore(readJSON(k, null), v || {}));
      else if (k === "dojo-log") writeJSON(k, mergeLog(readJSON(k, {}), v || {}));
      else if (k === "dojo-last") {
        const cur = readJSON(k, {});
        Object.keys(v || {}).forEach((id) => { if (!cur[id] || (v[id].at || 0) > (cur[id].at || 0)) cur[id] = v[id]; });
        writeJSON(k, cur);
      } else if (k === "hiden-state") {
        // 秘伝の書：読んだ・理解度・栞（多いほう・ついているほうを残す）
        const cur = readJSON(k, {}) || {};
        ["read", "rate", "mark"].forEach((f) => {
          cur[f] = cur[f] || {};
          Object.keys((v || {})[f] || {}).forEach((id) => { cur[f][id] = Math.max(cur[f][id] || 0, v[f][id] || 0); });
        });
        writeJSON(k, cur);
      } else if (k === "hiden-mine") {
        // 秘伝の書：自分の覚書（同じものは増やさない）
        const cur = readJSON(k, []) || [];
        (Array.isArray(v) ? v : []).forEach((m) => { if (m && m.id && !cur.some((c) => c.id === m.id)) cur.push(m); });
        writeJSON(k, cur);
      } else if (k === "theme") {
        // 見た目の設定は、今の端末のものを優先する
      } else {
        try { localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v)); } catch (e) {}
      }
    });
    const after = DOJO_IDS.reduce((t, id) => t + solvedCount(id), 0);
    pendingGoal = goal();
    showGoal(pendingGoal);
    feedback(true, "修練録を読み込みました。正解済みが " + (after - before) + " 問 増えました。");
  });
});
