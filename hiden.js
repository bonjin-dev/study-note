/* =========================================================
   秘伝の書 ― Notion のまとめノートを「巻物」にして読む
   見た目は Stitch のデザインのカードをお手本にして、データを入れて並べる
   ========================================================= */

const CAT_NAME = { html: "HTML", css: "CSS", js: "JavaScript", db: "DB / SQL", java: "Java", mine: "自分の覚書" };
const RANK = ["未評価", "入門", "初伝", "中伝", "上伝", "極伝"];
const SEAL = ["未", "入", "初", "中", "上", "極"];
const STEP = 15;   // 一度に並べる巻の数

/* ===== 記録（読んだ・理解度・栞・自分の覚書） ===== */
const hs = Object.assign({ read: {}, rate: {}, mark: {} }, readJSON("hiden-state", {}) || {});
function saveState() { writeJSON("hiden-state", hs); }
let mine = readJSON("hiden-mine", []) || [];
function saveMine() { writeJSON("hiden-mine", mine); }

function allScrolls() {
  const list = HIDEN.map((h, i) => Object.assign({ vol: i + 1 }, h));
  mine.forEach((m, i) => list.push({
    id: m.id, vol: HIDEN.length + i + 1, cat: "mine", page: "凡人の手記", title: m.title || "（題なし）",
    summary: (m.body || "").replace(/\s+/g, " ").slice(0, 120), snippet: "", date: m.at ? dayKey(new Date(m.at)) : "",
    min: Math.max(1, Math.round((m.body || "").length / 500)),
    html: "<p>" + escapeHTML(m.body || "").replace(/\n/g, "<br>") + "</p>", mine: true,
  }));
  return list;
}

const state = { filter: "all", q: "", open: {}, sort: "vol", markOnly: false, shown: STEP, toc: false };

/* ===== 文字の探し方 ===== */
// text を含む、いちばん内側の要素
function deepest(root, text) {
  let hit = null;
  root.querySelectorAll("*").forEach((el) => {
    if (el.textContent.indexOf(text) >= 0) hit = el;   // 後ろ（内側）ほど上書きされる
  });
  // 同じ文字を含む子があれば、そちらへ
  while (hit) {
    const child = [...hit.children].find((c) => c.textContent.indexOf(text) >= 0);
    if (!child) break;
    hit = child;
  }
  return hit;
}
function leafExact(root, text) {
  return [...root.querySelectorAll("*")].find((el) => el.children.length === 0 && el.textContent.trim() === text);
}
function commonParent(a, b) {
  let p = a.parentElement;
  while (p && !p.contains(b)) p = p.parentElement;
  return p;
}
// 中の文字だけ変える（アイコンなどの子要素は残す）
function setOwnText(el, text) {
  if (!el) return;
  const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim());
  if (node) node.nodeValue = " " + text + " ";
  else el.appendChild(document.createTextNode(text));
}
function warekiMonth(key) {
  if (!key) return "";
  const d = new Date(key);
  return "令和" + kanjiNum(d.getFullYear() - 2018) + "年" + kanjiNum(d.getMonth() + 1) + "月";
}
function volName(n) { return "巻の" + kanjiNum(n); }

/* ===== ライト・ダークの画面を準備する ===== */
const views = [];
document.querySelectorAll(".theme-l, .theme-d").forEach((root) => {
  const v = { root };
  const arts = [...root.querySelectorAll("article")];
  v.tplOpen = arts[0].cloneNode(true);
  v.tplClosed = { css: arts[1].cloneNode(true), db: arts[2].cloneNode(true), java: arts[3].cloneNode(true) };
  v.box = document.createElement("div");
  v.box.className = "hiden-list";
  arts[0].parentElement.insertBefore(v.box, arts[0]);
  arts.forEach((a) => a.remove());
  // 絞り込みの札
  v.pills = {};
  const buttons = [...root.querySelectorAll("button")];
  [["all", "すべて"], ["html", "HTML"], ["css", "CSS"], ["js", "JavaScript"], ["db", "DB / SQL"], ["java", "Java"]].forEach(([k, label]) => {
    v.pills[k] = buttons.find((b) => b.textContent.replace(/\d+\s*$/, "").replace(/\s+/g, " ").trim() === label) || null;
  });
  v.pillOn = v.pills.all.className;
  v.pillOff = (v.pills.html || v.pills.css).className;
  v.numOn = [...v.pills.all.querySelectorAll("span")].pop().className;
  v.numOff = [...(v.pills.html || v.pills.css).querySelectorAll("span")].pop().className;
  v.pillRow = v.pills.all.parentElement;
  // デザインにない札は、ほかの札をまねて作る
  ["html", "css", "js", "db", "java", "mine"].forEach((k) => {
    if (v.pills[k]) return;
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = "<span></span><span></span>";
    b.firstChild.textContent = CAT_NAME[k];
    v.pillRow.appendChild(b);
    v.pills[k] = b;
  });
  // 数字のところ（登録覚書・読了）
  const statNum = (label) => {
    const l = leafExact(root, label);
    if (!l) return null;
    let n = l.nextElementSibling;
    if (!n) {
      const p = l.parentElement;
      n = [...p.querySelectorAll("span")].find((s) => /\d/.test(s.textContent) && !s.contains(l));
    }
    return n;
  };
  v.statAll = statNum("登録覚書");
  v.statRead = statNum("読了・習得済");
  // 検索
  v.input = root.querySelector("input");
  v.input.placeholder = "覚書の標題やキーワード（例：flex、JOIN、例外）で探す…";
  const tune = [...root.querySelectorAll(".material-symbols-outlined")].find((s) => s.textContent.trim() === "tune");
  v.tune = tune && tune.closest("button");
  if (v.tune) v.tune.setAttribute("aria-label", "栞を挟んだ巻だけを見る");
  // 並び順・目録・新規
  v.sortLabel = leafExact(root, "新着伝授順");
  v.sortBtn = leafExact(root, "全巻並び替え");
  v.tocBtn = deepest(root, "皆伝目録");
  const write = deepest(root, "新規奥義をしたためる");
  v.write = write && write.closest("button, a");
  views.push(v);
});

/* ===== カードを作る ===== */
function ratingText(id) {
  const r = hs.rate[id] || 0;
  return "理解度: " + RANK[r] + (r ? " (" + r + "/5)" : "");
}
function fillTitle(card, s) {
  const h = card.querySelector("h3, h4");
  if (h) h.textContent = volName(s.vol) + "：" + s.title;
}
function fillClosed(v, s) {
  const key = s.cat === "db" ? "db" : s.cat === "java" ? "java" : "css";
  const el = v.tplClosed[key].cloneNode(true);
  const badge = leafExact(el, key === "css" ? "CSS" : key === "db" ? "DB / SQL" : "Java");
  if (badge) badge.textContent = CAT_NAME[s.cat];
  setOwnText(deepest(el, key === "css" ? "奥義・配置術" : key === "db" ? "奥義・索引術" : "奥義・例外処理"), s.page + (s.ch ? " 第" + kanjiNum(s.ch) + "章" : ""));
  setOwnText(deepest(el, key === "css" ? "令和六年四月" : key === "db" ? "令和六年三月" : "令和六年二月"), warekiMonth(s.date));
  fillTitle(el, s);
  const p = el.querySelector("p");
  if (p) p.textContent = s.summary + (s.summary.length >= 120 ? "…" : "");
  const code = el.querySelector("code");
  if (code) {
    if (s.snippet) code.textContent = s.snippet;
    else code.parentElement.remove();
  } else if (s.snippet && p) {
    // デザインにコードのチラ見せがない札には、ほかの札から借りる
    const snip = v.tplClosed.css.querySelector("code").parentElement.cloneNode(true);
    snip.querySelector("code").textContent = s.snippet;
    p.insertAdjacentElement("afterend", snip);
  }
  const rate = deepest(el, "理解度");
  const marks = (hs.read[s.id] ? " ・読了" : "") + (hs.mark[s.id] ? " ・栞" : "");
  setOwnText(rate, ratingText(s.id) + marks);
  const star = rate && rate.parentElement.querySelector(".material-symbols-outlined");
  if (star) star.style.fontVariationSettings = (hs.rate[s.id] || 0) ? "'FILL' 1" : "'FILL' 0";
  const btn = deepest(el, "巻物をひらく");
  if (btn) btn.closest("button").addEventListener("click", () => openScroll(s.id));
  el.dataset.id = s.id;
  return el;
}
function fillOpen(v, s) {
  const el = v.tplOpen.cloneNode(true);
  const badge = leafExact(el, "JavaScript");
  if (badge) badge.textContent = CAT_NAME[s.cat];
  setOwnText(deepest(el, "奥義・非同期制御"), s.page + (s.ch ? " 第" + kanjiNum(s.ch) + "章" : ""));
  const seal = leafExact(el, "極") || deepest(el, "極");
  if (seal) {
    seal.textContent = SEAL[hs.rate[s.id] || 0];
    seal.title = "理解度：" + RANK[hs.rate[s.id] || 0];
  }
  fillTitle(el, s);
  setOwnText(deepest(el, "令和六年五月"), warekiMonth(s.date));
  // 理解度（押すたびに 1→5→未評価 と変わる）
  const rate = deepest(el, "理解度");
  if (rate) {
    setOwnText(rate, ratingText(s.id) + " ▸ 押して変える");
    const star = rate.parentElement.querySelector(".material-symbols-outlined") || rate.querySelector(".material-symbols-outlined");
    if (star) star.style.fontVariationSettings = (hs.rate[s.id] || 0) ? "'FILL' 1" : "'FILL' 0";
    const target = rate.closest("span") || rate;
    target.style.cursor = "pointer";
    target.setAttribute("role", "button");
    target.setAttribute("tabindex", "0");
    target.title = "押すと理解度を変えられます";
    const change = () => {
      hs.rate[s.id] = ((hs.rate[s.id] || 0) + 1) % 6;
      saveState();
      showToast("理解度を「" + RANK[hs.rate[s.id]] + "」にしました");
      render();
    };
    target.addEventListener("click", change);
    target.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); change(); } });
  }
  setOwnText(deepest(el, "読了目安"), "読了目安: " + s.min + "分");
  // 本文（Stitch の見本の中身と入れかえる）
  const a = deepest(el, "一、なぜ非同期で詰まるのか"), b = deepest(el, "三、凡人の勘所");
  const inner = commonParent(a, b);
  inner.innerHTML = '<div class="hiden-body">' + s.html + "</div>";
  // 栞・共有・巻き戻す
  const markBtn = deepest(el, "栞を挟む").closest("button");
  setOwnText(deepest(markBtn, "栞を挟む"), hs.mark[s.id] ? "栞を外す" : "栞を挟む");
  markBtn.addEventListener("click", () => {
    if (hs.mark[s.id]) delete hs.mark[s.id]; else hs.mark[s.id] = 1;
    saveState();
    showToast(hs.mark[s.id] ? "栞を挟みました（右上の絞り込みボタンで、栞の巻だけ見られます）" : "栞を外しました");
    render();
  });
  const shareBtn = deepest(el, "共有").closest("button");
  shareBtn.addEventListener("click", () => {
    const url = location.href.split("#")[0] + "#" + s.id;
    const ok = () => showToast("この巻へのリンクを写しました");
    try { navigator.clipboard.writeText(url).then(ok, () => showToast(url)); } catch (e) { showToast(url); }
  });
  const closeBtn = deepest(el, "巻物を巻き戻す").closest("button");
  closeBtn.addEventListener("click", () => { delete state.open[s.id]; render(); scrollToCard(s.id); });
  // 自分の覚書は消せる
  if (s.mine) {
    const del = shareBtn.cloneNode(true);
    del.querySelector(".material-symbols-outlined").textContent = "delete";
    setOwnText(del, "消す");
    del.addEventListener("click", () => {
      if (!confirmDelete(s)) return;
      mine = mine.filter((m) => m.id !== s.id);
      saveMine();
      render();
    });
    shareBtn.insertAdjacentElement("afterend", del);
  }
  el.dataset.id = s.id;
  return el;
}
// 「消す」を2回押したら消える（ブラウザの確認ダイアログは使わない）
let delArmed = null;
function confirmDelete(s) {
  if (delArmed === s.id) { delArmed = null; showToast("覚書を消しました"); return true; }
  delArmed = s.id;
  showToast("もう一度「消す」を押すと、この覚書を消します");
  setTimeout(() => { if (delArmed === s.id) delArmed = null; }, 4000);
  return false;
}

/* ===== 開く・探す ===== */
function openScroll(id) {
  state.open[id] = true;
  if (!hs.read[id]) { hs.read[id] = 1; saveState(); }
  render();
  scrollToCard(id);
}
function scrollToCard(id) {
  const v = views.find((x) => x.root.closest(currentTheme() === "dark" ? ".theme-d" : ".theme-l") || x.root.classList.contains(currentTheme() === "dark" ? "theme-d" : "theme-l"));
  const el = v && v.box.querySelector('[data-id="' + id + '"]');
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
}
function textOf(s) {
  return (s.title + " " + s.page + " " + CAT_NAME[s.cat] + " " + s.html.replace(/<[^>]+>/g, " ")).toLowerCase();
}
function shownList() {
  let list = allScrolls().filter((s) =>
    (state.filter === "all" || s.cat === state.filter) &&
    (!state.markOnly || hs.mark[s.id]) &&
    (!state.q || textOf(s).indexOf(state.q) >= 0));
  if (state.sort === "new") list = list.slice().sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.vol - a.vol);
  return list;
}

function render() {
  const all = allScrolls();
  const list = shownList();
  views.forEach((v) => {
    // 数
    if (v.statAll) setOwnText(v.statAll, String(all.length));
    if (v.statRead) setOwnText(v.statRead, String(all.filter((s) => hs.read[s.id]).length));
    // 札
    Object.keys(v.pills).forEach((k) => {
      const b = v.pills[k];
      if (!b) return;
      const on = state.filter === k;
      b.className = on ? v.pillOn : v.pillOff;
      const num = [...b.querySelectorAll("span")].pop();
      num.className = on ? v.numOn : v.numOff;
      const n = all.filter((s) => (k === "all" || s.cat === k) && (!state.markOnly || hs.mark[s.id]) && (!state.q || textOf(s).indexOf(state.q) >= 0)).length;
      num.textContent = n;
      b.style.display = k === "mine" && !mine.length ? "none" : "";
      b.setAttribute("aria-pressed", on);
    });
    if (v.tune) {
      v.tune.style.color = state.markOnly ? "var(--hiden-accent)" : "";
      v.tune.setAttribute("aria-pressed", state.markOnly);
    }
    if (v.sortLabel) v.sortLabel.textContent = state.sort === "new" ? "新着伝授順" : "巻の順";
    // 目録
    v.box.innerHTML = "";
    if (state.toc) {
      const toc = document.createElement("div");
      toc.className = "hiden-toc";
      toc.innerHTML = "<p class=\"hiden-toc-h\">皆伝目録（" + list.length + "巻）</p><ol>" +
        list.map((s) => '<li><a href="#' + s.id + '" data-go="' + s.id + '">' + volName(s.vol) + "：" + escapeHTML(s.title) +
          (hs.read[s.id] ? " <small>読了</small>" : "") + "</a></li>").join("") + "</ol>";
      v.box.appendChild(toc);
    }
    if (!list.length) {
      const p = document.createElement("p");
      p.className = "hiden-empty";
      p.textContent = state.markOnly ? "栞を挟んだ巻はまだありません。巻物をひらいて「栞を挟む」を押してください。" : "見つかりませんでした。別の言葉で探してみてください。";
      v.box.appendChild(p);
    }
    // 開いている巻は、数に関係なく出す
    const limit = Math.max(state.shown, list.findIndex((s) => state.open[s.id]) + 1);
    list.slice(0, limit).forEach((s) => v.box.appendChild(state.open[s.id] ? fillOpen(v, s) : fillClosed(v, s)));
    if (list.length > limit) {
      const more = document.createElement("button");
      more.type = "button";
      more.className = v.pillOff + " hiden-more";
      more.textContent = "もっと見る（残り " + (list.length - limit) + " 巻）";
      more.addEventListener("click", () => { state.shown += STEP; render(); });
      v.box.appendChild(more);
    }
  });
}

/* ===== 操作 ===== */
views.forEach((v) => {
  Object.keys(v.pills).forEach((k) => {
    if (v.pills[k]) v.pills[k].addEventListener("click", () => { state.filter = k; state.shown = STEP; render(); });
  });
  v.input.addEventListener("input", () => {
    state.q = v.input.value.trim().toLowerCase();
    state.shown = STEP;
    views.forEach((o) => { if (o !== v) o.input.value = v.input.value; });
    render();
  });
  if (v.tune) v.tune.addEventListener("click", () => {
    state.markOnly = !state.markOnly;
    state.shown = STEP;
    showToast(state.markOnly ? "栞を挟んだ巻だけを表示しています" : "すべての巻を表示しています");
    render();
  });
  const toggleSort = () => {
    state.sort = state.sort === "new" ? "vol" : "new";
    showToast(state.sort === "new" ? "新しく書いた順に並べました" : "巻の順に並べました");
    render();
  };
  [v.sortLabel, v.sortBtn].forEach((el) => {
    if (!el) return;
    el.style.cursor = "pointer";
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.addEventListener("click", toggleSort);
  });
  if (v.tocBtn) {
    const t = v.tocBtn.closest("button, a, span") || v.tocBtn;
    t.style.cursor = "pointer";
    t.setAttribute("role", "button");
    t.addEventListener("click", (e) => { e.preventDefault(); state.toc = !state.toc; render(); });
  }
  v.box.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) { e.preventDefault(); state.toc = false; openScroll(go.dataset.go); return; }
    const copy = e.target.closest(".hiden-body .copy");
    if (copy) {
      const code = copy.closest(".code").querySelector("code").textContent;
      countCopy();
      try { navigator.clipboard.writeText(code).then(() => showToast("型を写経台（クリップボード）に複写しました"), () => showToast("コピーできませんでした")); } catch (err) { showToast("コピーできませんでした"); }
    }
  });
  if (v.write) v.write.addEventListener("click", (e) => { e.preventDefault(); openEditor(); });
});

/* ===== 自分の覚書を書く ===== */
function openEditor() {
  let wrap = document.querySelector(".hiden-editor");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "hiden-editor";
    wrap.innerHTML = '<div class="hiden-editor-card" role="dialog" aria-label="新しい覚書">' +
      '<p class="hiden-editor-h">新規奥義をしたためる</p>' +
      '<p class="hiden-editor-note">自分の言葉でまとめた覚書を残せます。この端末（ブラウザ）だけに保存されます。</p>' +
      '<input type="text" maxlength="60" placeholder="標題（例：flex で横並びにするコツ）">' +
      '<textarea rows="8" placeholder="なぜ動くのか、どこで詰まったのかを一行でも書いておこう"></textarea>' +
      '<div class="hiden-editor-btns"><button type="button" data-x="cancel">やめる</button><button type="button" data-x="save">保存する</button></div></div>';
    document.body.appendChild(wrap);
    wrap.addEventListener("click", (e) => {
      const x = e.target.closest("[data-x]");
      if (e.target === wrap || (x && x.dataset.x === "cancel")) wrap.hidden = true;
      if (x && x.dataset.x === "save") {
        const title = wrap.querySelector("input").value.trim();
        const body = wrap.querySelector("textarea").value.trim();
        if (!title && !body) { showToast("標題か本文を書いてください"); return; }
        const id = "mine-" + Date.now();
        mine.push({ id, title, body, at: Date.now() });
        saveMine();
        wrap.hidden = true;
        state.filter = "mine";
        state.q = "";
        views.forEach((o) => { o.input.value = ""; });
        openScroll(id);
        showToast("覚書を保存しました");
      }
    });
  }
  wrap.querySelector("input").value = "";
  wrap.querySelector("textarea").value = "";
  wrap.hidden = false;
  wrap.querySelector("input").focus();
}

/* ===== はじめに ===== */
const hashId = decodeURIComponent(location.hash.slice(1));
render();
if (hashId && allScrolls().some((s) => s.id === hashId)) openScroll(hashId);
