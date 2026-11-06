/* =========================================================
   巻物・ノート ― コード集（実践の型）と道場用語録
   見た目は Stitch のデザインのカードをお手本にして、データを入れて並べる
   ========================================================= */

const CAT_SHORT = { coding: "Web", java: "Java" };
const state = { tab: "code", filter: "all", q: "", shown: 10 };
const STEP = 10;   // 一度に並べるカードの数

/* ===== お気に入り（道場の中のコード集の★と同じ記録を使う） ===== */
function favStore(dojo) {
  return readJSON(DOJOS[dojo].key, {}) || {};
}
function isFav(c) {
  const s = favStore(c.dojo);
  return !!(s.fav && s.fav[c.id]);
}
function toggleFav(c) {
  const s = favStore(c.dojo);
  s.fav = s.fav || {};
  if (s.fav[c.id]) delete s.fav[c.id];
  else s.fav[c.id] = true;
  writeJSON(DOJOS[c.dojo].key, s);
  return !!s.fav[c.id];
}

/* ===== 文字の探し方 ===== */
// 中の文字がぴったり text になっている、いちばん内側の要素
function findByText(root, text, from) {
  const all = [...root.querySelectorAll(from || "*")];
  return all.find((el) => el.children.length === 0 && el.textContent.trim() === text) ||
         all.find((el) => el.textContent.trim() === text);
}
function findContains(root, text) {
  return [...root.querySelectorAll("*")].reverse().find((el) => el.children.length === 0 && el.textContent.indexOf(text) >= 0);
}
// a と b の両方を含む、いちばん近い親
function commonParent(a, b) {
  let p = a.parentElement;
  while (p && !p.contains(b)) p = p.parentElement;
  return p;
}
// list の子どものうち、el を含んでいるもの
function childOf(list, el) {
  return [...list.children].find((c) => c.contains(el));
}
function md(s) {
  return escapeHTML(s).replace(/`([^`]+)`/g, '<code class="font-mono">$1</code>');
}
function fileName(c) {
  if (c.cat === "html") return "index.html";
  if (c.cat === "css") return "style.css";
  if (c.cat === "js") return "script.js";
  if (c.cat === "db") return "query.sql";
  if (/^\s*spring:/m.test(c.code)) return "application.yml";
  const m = c.code.match(/(?:class|interface)\s+([A-Z]\w*)/);
  return (m ? m[1] : "Main") + ".java";
}

/* ===== ライト・ダークそれぞれの画面を準備する ===== */
const views = [];
document.querySelectorAll(".theme-l, .theme-d").forEach((root) => {
  const v = { root };
  // コードのカード（1枚目＝Web & DB、2枚目＝Java、3枚目＝Java 実技）
  const f1 = findByText(root, "api-fetch.js"), f2 = findByText(root, "NoteRepository.java");
  v.list = commonParent(f1, f2);
  const cards = [childOf(v.list, f1), childOf(v.list, f2)];
  v.tpl = { coding: cards[0].cloneNode(true), java: cards[1].cloneNode(true) };
  [...v.list.children].forEach((c) => { if (c.querySelector("pre")) c.remove(); });
  // 絞り込みの札
  v.pills = {};
  [["all", "すべて"], ["coding", "Web & DB"], ["java", "Java"], ["run", "Java 実技"]].forEach(([k, label]) => {
    // 札の文字（数字をのぞく）がぴったり同じボタン
    v.pills[k] = [...root.querySelectorAll("button")].find((b) => b.textContent.replace(/\d+\s*$/, "").trim() === label) || null;
  });
  v.pillOn = v.pills.all.className;
  v.pillOff = v.pills.coding.className;
  v.pillNumOn = [...v.pills.all.querySelectorAll("span")].pop().className;
  v.pillNumOff = [...v.pills.coding.querySelectorAll("span")].pop().className;
  if (v.pills.run) v.pills.run.remove();           // Java 実技道場にはコード集がないので外す
  v.pillRow = v.pills.all.parentElement;
  // 上のタブ
  const tc = findByText(root, "コード集（実践の型）"), tg = findByText(root, "道場用語録", "button *");
  v.tabs = { code: tc.closest("button"), gloss: tg.closest("button") };
  v.tabOn = v.tabs.code.className;
  v.tabOff = v.tabs.gloss.className;
  v.tabNumOn = [...v.tabs.code.querySelectorAll("span")].pop().className;
  v.tabNumOff = [...v.tabs.gloss.querySelectorAll("span")].pop().className;
  // 用語録
  const g1 = findByText(root, "非同期処理"), g2 = findByText(root, "JPA");
  v.glist = commonParent(g1, g2);
  const gitems = [childOf(v.glist, g1), childOf(v.glist, g2)];
  v.gtpl = { coding: gitems[0].cloneNode(true), java: gitems[1].cloneNode(true) };
  v.glist.innerHTML = "";
  v.gHead = findByText(root, "道場用語録（抜粋）");
  v.gMore = findContains(root, "全34語を開く");
  v.gMoreBtn = v.gMore.closest("button, a");
  v.gRow = commonParent(v.gHead, v.gMore);   // 用語録の見出しの行
  // 検索
  v.input = root.querySelector("input");
  v.input.placeholder = "やりたいことや用語で探す（例：flex, JOIN, Stream）";
  v.clear = root.querySelector('[aria-label="検索条件をクリア"]');
  views.push(v);
});

/* ===== カード・用語を作る ===== */
function fillCard(v, c) {
  const el = v.tpl[c.dojo].cloneNode(true);
  const set = (sample, text, html) => {
    const t = findByText(el, sample) || findContains(el, sample);
    if (!t) return null;
    if (html) t.innerHTML = text; else t.textContent = text;
    return t;
  };
  set(c.dojo === "coding" ? "Web & DB 道場" : "Java 道場", DOJOS[c.dojo].name);
  set(c.dojo === "coding" ? "JavaScript / REST" : "Spring Boot / JPA", c.catName + " / " + c.g);
  const titleEl = set(c.dojo === "coding" ? "非同期通信で" : "Spring Data JPAで", c.t);
  const memoEl = findContains(el, c.dojo === "coding" ? "Fetch API と" : "命名規約による");
  if (memoEl) memoEl.innerHTML = md(c.memo);
  else if (titleEl) {
    // ダークの画面は、題目と説明が1つの段落になっているので、題目を太字にして並べる
    titleEl.innerHTML = '<strong style="display:block;font-size:1.05em;margin-bottom:2px">' + escapeHTML(c.t) + "</strong>" + md(c.memo);
  }
  set(c.dojo === "coding" ? "api-fetch.js" : "NoteRepository.java", fileName(c));
  const foot = [...el.querySelectorAll("*")].filter((x) => x.children.length === 0 && /^(型修練度|登録|更新)/.test(x.textContent.trim()));
  if (foot[0]) foot[0].textContent = "分類：" + c.g;
  if (foot[1]) foot[1].textContent = c.link ? "関連：" + c.link : "";
  const pre = el.querySelector("pre");
  pre.innerHTML = "<code>" + escapeHTML(c.code) + "</code>";
  pre.style.maxHeight = "260px";
  pre.style.overflow = "auto";
  // コピー
  const copyLabel = findByText(el, "写経写し");
  const copyBtn = copyLabel && copyLabel.closest("button");
  if (copyBtn) copyBtn.addEventListener("click", () => {
    const done = () => { copyLabel.textContent = "写経済!"; showToast("型を写経台（クリップボード）に複写しました"); setTimeout(() => { copyLabel.textContent = "写経写し"; }, 1500); };
    try { navigator.clipboard.writeText(c.code).then(done, () => showToast("コピーできませんでした。コードを選んでコピーしてください。")); } catch (e) { showToast("コピーできませんでした。"); }
  });
  // お気に入り（★）
  const star = [...el.querySelectorAll(".material-symbols-outlined")].find((s) => s.textContent.trim() === "star");
  const favBtn = star && star.closest("button");
  if (favBtn) {
    const paint = (on) => {
      star.style.fontVariationSettings = on ? "'FILL' 1" : "'FILL' 0";
      favBtn.style.opacity = on ? "1" : "0.55";
      favBtn.setAttribute("aria-pressed", on);
      favBtn.setAttribute("aria-label", on ? "お気に入りを外す" : "お気に入りに入れる");
    };
    paint(isFav(c));
    favBtn.addEventListener("click", () => {
      const on = toggleFav(c);
      paint(on);
      showToast(on ? "お気に入りに入れました（道場のコード集にも★がつきます）" : "お気に入りを外しました");
    });
  }
  return el;
}
function fillTerm(v, g) {
  const el = v.gtpl[g.dojo].cloneNode(true);
  const t1 = findByText(el, g.dojo === "coding" ? "非同期処理" : "JPA");
  const t2 = findByText(el, g.dojo === "coding" ? "Asynchronous" : "Java Persistence API");
  const t3 = findByText(el, g.dojo === "coding" ? "Web" : "Java");
  const p = el.querySelector("p");
  if (t1) t1.textContent = g.w;
  if (t2) t2.textContent = g.catName;
  if (t3) t3.textContent = CAT_SHORT[g.dojo];
  if (p) {
    p.innerHTML = md(g.d);
    // 全部を見るときは、説明を省略せずに出す
    if (state.tab === "gloss") p.classList.remove("truncate", "line-clamp-1", "line-clamp-2");
  }
  return el;
}

/* ===== 検索と絞り込み ===== */
function match(text) {
  return !state.q || text.toLowerCase().indexOf(state.q) >= 0;
}
function codesShown() {
  return SCROLLS.codes.filter((c) => (state.filter === "all" || c.dojo === state.filter) &&
    match([c.t, c.memo, c.g, c.catName, c.link, c.code].join(" ")));
}
function termsShown() {
  return SCROLLS.gloss.filter((g) => (state.filter === "all" || g.dojo === state.filter) && match([g.w, g.d, g.catName].join(" ")));
}
// 今日の「抜粋」：日付で決まる3語（毎日入れ替わる）
function excerpt(list) {
  if (list.length <= 3) return list;
  const seed = Number(dayKey(new Date()).replace(/-/g, ""));
  const start = seed % list.length;
  return [0, 1, 2].map((i) => list[(start + i * 7) % list.length]);
}

function render() {
  const codes = codesShown(), terms = termsShown();
  views.forEach((v) => {
    // タブ
    ["code", "gloss"].forEach((k) => {
      const on = state.tab === k;
      v.tabs[k].className = on ? v.tabOn : v.tabOff;
      [...v.tabs[k].querySelectorAll("span")].pop().className = on ? v.tabNumOn : v.tabNumOff;
      v.tabs[k].setAttribute("aria-pressed", on);
    });
    [...v.tabs.code.querySelectorAll("span")].pop().textContent = SCROLLS.codes.length;
    [...v.tabs.gloss.querySelectorAll("span")].pop().textContent = SCROLLS.gloss.length;
    // 絞り込みの札（数は、検索の結果に合わせる）
    ["all", "coding", "java"].forEach((k) => {
      const b = v.pills[k];
      if (!b) return;
      const on = state.filter === k;
      b.className = on ? v.pillOn : v.pillOff;
      const num = [...b.querySelectorAll("span")].pop();
      num.className = on ? v.pillNumOn : v.pillNumOff;
      const base = state.tab === "code" ? SCROLLS.codes : SCROLLS.gloss;
      num.textContent = base.filter((x) => (k === "all" || x.dojo === k) &&
        match(state.tab === "code" ? [x.t, x.memo, x.g, x.catName, x.link, x.code].join(" ") : [x.w, x.d, x.catName].join(" "))).length;
      b.setAttribute("aria-pressed", on);
    });
    // コード集
    v.list.hidden = state.tab !== "code";
    v.list.innerHTML = "";
    if (state.tab === "code") {
      v.list.appendChild(v.pillRow);
      if (!codes.length) {
        const p = document.createElement("p");
        p.className = "font-body-sm text-body-sm text-on-surface-variant";
        p.style.textAlign = "center";
        p.style.padding = "24px 0";
        p.textContent = "見つかりませんでした。別の言葉で探してみてください。";
        v.list.appendChild(p);
      }
      codes.slice(0, state.shown).forEach((c) => v.list.appendChild(fillCard(v, c)));
      // 残りがあれば「もっと見る」
      if (codes.length > state.shown) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = v.pillOff;
        more.style.cssText = "display:block;width:100%;padding:12px;border-radius:12px;";
        more.textContent = "もっと見る（残り " + (codes.length - state.shown) + " 件）";
        more.addEventListener("click", () => { state.shown += STEP; render(); });
        v.list.appendChild(more);
      }
    }
    // 用語録（コード集のときは抜粋3語、用語録のときは全部）
    v.glist.innerHTML = "";
    if (state.tab === "code") {
      v.gHead.textContent = "道場用語録（抜粋）";
      v.gMoreBtn.style.display = "";
      v.gMore.textContent = "全" + SCROLLS.gloss.length + "語を開く";
      excerpt(SCROLLS.gloss).forEach((g) => v.glist.appendChild(fillTerm(v, g)));
    } else {
      v.gHead.textContent = "道場用語録（" + terms.length + "語）";
      v.gMoreBtn.style.display = "none";
      // 用語録のときも絞り込みの札を使えるように、見出しの上に移す
      v.gRow.parentElement.insertBefore(v.pillRow, v.gRow);
      if (!terms.length) {
        const p = document.createElement("p");
        p.className = "font-body-sm text-body-sm text-on-surface-variant";
        p.textContent = "見つかりませんでした。";
        v.glist.appendChild(p);
      }
      terms.forEach((g) => v.glist.appendChild(fillTerm(v, g)));
    }
    if (v.clear) v.clear.classList.toggle("hidden", !state.q);
  });
}

/* ===== 操作 ===== */
views.forEach((v) => {
  v.tabs.code.addEventListener("click", () => { state.tab = "code"; state.shown = STEP; render(); });
  v.tabs.gloss.addEventListener("click", () => { state.tab = "gloss"; state.shown = STEP; render(); });
  v.gMoreBtn.addEventListener("click", (e) => { e.preventDefault(); state.tab = "gloss"; state.shown = STEP; render(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  ["all", "coding", "java"].forEach((k) => {
    if (v.pills[k]) v.pills[k].addEventListener("click", () => { state.filter = k; state.shown = STEP; render(); });
  });
  v.input.addEventListener("input", () => {
    state.q = v.input.value.trim().toLowerCase();
    state.shown = STEP;
    views.forEach((o) => { if (o !== v) o.input.value = v.input.value; });
    render();
  });
  if (v.clear) v.clear.addEventListener("click", () => {
    state.q = "";
    views.forEach((o) => { o.input.value = ""; });
    render();
  });
});
render();
// 「〇〇式伝授中」（コード集の型の数を漢数字で）
setText("scrollCount", kanjiNum(SCROLLS.codes.length) + "式伝授中");
