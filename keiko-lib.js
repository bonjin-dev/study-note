/* =========================================================
   鍛錬室の共通の処理（本日の修練問・五本組手・雪辱戦で使う）
   Stitch のデザインの画面に、本物の問題と記録を入れて動かす
   ========================================================= */

/* ===== 画面の文字を探して入れかえる道具 ===== */
const norm = (s) => String(s).replace(/\s+/g, " ").trim();
function textNodes(root) {
  const out = [];
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement && n.parentElement.closest("pre, script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
  });
  while (w.nextNode()) out.push(w.currentNode);
  return out;
}
function findNode(root, sample) {
  const s = norm(sample);
  return textNodes(root).find((t) => norm(t.nodeValue).indexOf(s) >= 0) || null;
}
// sample の部分の文字を rep にする（html=true なら HTML として入れる）。見つからなければ何もしない
function R(root, samples, rep, html) {
  for (const sample of [].concat(samples)) {
    const node = findNode(root, sample);
    if (!node) continue;
    const v = norm(node.nodeValue), s = norm(sample), i = v.indexOf(s);
    const before = v.slice(0, i), after = v.slice(i + s.length);
    if (html) {
      const sp = document.createElement("span");
      sp.innerHTML = escapeHTML(before) + rep + escapeHTML(after);
      node.replaceWith(sp);
      return sp;
    }
    node.nodeValue = (before ? before : "") + rep + (after ? after : "");
    // 空になった札は隠す
    if (!norm(node.nodeValue) && node.parentElement && !norm(node.parentElement.textContent)) node.parentElement.style.display = "none";
    return node.parentElement;
  }
  return null;
}
// sample を含む、いちばん内側の要素
function E(root, samples) {
  for (const sample of [].concat(samples)) {
    const s = norm(sample);
    let hit = null;
    root.querySelectorAll("*").forEach((el) => { if (norm(el.textContent).indexOf(s) >= 0) hit = el; });
    while (hit) {
      const c = [...hit.children].find((x) => norm(x.textContent).indexOf(s) >= 0);
      if (!c) break;
      hit = c;
    }
    if (hit) return hit;
  }
  return null;
}
function EH(root, samples, html) {
  const el = E(root, samples);
  if (el) el.innerHTML = html;
  return el;
}
function commonParent(a, b) {
  let p = a && a.parentElement;
  while (p && !p.contains(b)) p = p.parentElement;
  return p;
}
// 2つの見本を含む「並び」と、それぞれの項目
function itemsOf(root, s1, s2) {
  const a = E(root, s1), b = E(root, s2);
  if (!a || !b) return null;
  const list = commonParent(a, b);
  if (!list) return null;
  return { list, a: [...list.children].find((c) => c.contains(a)), b: [...list.children].find((c) => c.contains(b)) };
}
// 幅が「60%」になっている棒を、pct% にする
function setBar(root, from, pct) {
  root.querySelectorAll("[style]").forEach((el) => {
    if (el.style.width === from) el.style.width = Math.max(0, Math.min(100, pct)) + "%";
  });
}
function removeEl(el) { if (el && el.parentElement) el.remove(); }
function onClick(root, samples, fn) {
  const el = E(root, samples);
  const btn = el && (el.closest("button, a, summary, label") || el);
  if (btn) {
    if (btn.tagName === "A") btn.setAttribute("href", "#");
    btn.addEventListener("click", (e) => { e.preventDefault(); fn(e); });
  }
  return btn;
}
function linkTo(root, samples, href) {
  const el = E(root, samples);
  const btn = el && el.closest("button, a");
  if (!btn) return;
  if (btn.tagName === "A") btn.setAttribute("href", href);
  else btn.addEventListener("click", () => { location.href = href; });
}

/* ===== 問題のデータ ===== */
const QMAP = {};
DRILL.q.forEach((q) => { QMAP[q.id] = q; });
const KATA = ["型・壱", "型・弐", "型・参", "型・四"];
const KNUM = ["壱", "弐", "参", "四", "伍", "六", "七", "八", "九", "十"];
const ABCD = "ABCD";
function topicOf(q) { return (q && DRILL.topics[q.topic]) || null; }
function md(s) {
  return escapeHTML(s || "").replace(/`([^`]+)`/g, '<code class="kc">$1</code>').replace(/\n/g, "<br>");
}
function plainMd(s) { return String(s || "").replace(/`/g, ""); }
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function fileOf(q) {
  if (q.dojo === "java") return /^\s*spring:/m.test(q.code) ? "application.yml" : ((q.code.match(/class\s+([A-Z]\w*)/) || [0, "Main"])[1] + ".java");
  return { html: "index.html", css: "style.css", js: "script.js", db: "query.sql" }[q.cat] || "code.txt";
}
function langOf(q) {
  if (q.dojo === "java") return "Java";
  return { html: "HTML", css: "CSS", js: "JavaScript", db: "SQL" }[q.cat] || "";
}
function topicLabel(q) {
  const t = topicOf(q);
  return q.catName + "・" + (t ? t.title : "応用");
}
function hintParas(q) {
  const t = topicOf(q);
  return t && t.body ? t.body.split("\n").filter((x) => x.trim()) : [];
}
// まちがいの選択肢の説明
function whyOf(q, txt) {
  const i = q.c.indexOf(txt);
  if (i >= 0 && q.w && q.w[i]) return q.w[i];
  const m = /^`([^`]+)`$/.exec(txt), k = m ? m[1] : txt;
  const terms = (DRILL.terms || {})[q.dojo] || {};
  if (Object.prototype.hasOwnProperty.call(terms, k)) return terms[k] === null ? "このような書き方はありません。" : terms[k];
  return "";
}
// 1問ぶんの出題（正解1つ＋まちがい3つ、並びはばらばら）
function makeItem(id) {
  const q = QMAP[id];
  const right = q.c[q.a];
  const wrong = shuffle(q.c.filter((x, i) => i !== q.a)).slice(0, 3);
  const c = shuffle([right].concat(wrong));
  return { id, q, c, a: c.indexOf(right), pick: -1, start: Date.now() };
}

/* ===== 記録 ===== */
const today = () => dayKey(new Date());
function storeOf(dojo) {
  const s = readJSON(DOJOS[dojo].key, {}) || {};
  s.ok = s.ok || {};
  s.miss = s.miss || {};
  return s;
}
function missList() {
  const out = [];
  ["coding", "java"].forEach((d) => {
    const s = storeOf(d);
    Object.keys(s.miss).forEach((id) => { if (QMAP[id]) out.push({ id, n: s.miss[id], dojo: d }); });
  });
  return out;
}
function overallAccuracy() {
  let ok = 0, ng = 0;
  Object.keys(LOG).forEach((k) => DOJO_IDS.forEach((d) => { const e = dayEntry(k, d); ok += e.ok; ng += e.ng; }));
  return ok + ng ? Math.round(ok / (ok + ng) * 1000) / 10 : 0;
}
// 答えを記録して、結果を返す
function recordAnswer(item, pick) {
  const q = item.q, ok = pick === item.a;
  const s = storeOf(q.dojo);
  const wasMiss = !!s.miss[q.id];
  const goalBefore = dayStat(today()).ok >= goal();
  if (ok) {
    s.ok[q.id] = true;
    if (wasMiss) { delete s.miss[q.id]; addRevenge(q.id); }
  } else {
    s.miss[q.id] = (s.miss[q.id] || 0) + 1;
  }
  writeJSON(DOJOS[q.dojo].key, s);
  logAnswer(q.dojo, ok);
  const goalNow = ok && !goalBefore && dayStat(today()).ok >= goal();
  const res = {
    id: q.id, ok, pick, wasMiss, goalNow,
    sec: Math.max(1, Math.round((Date.now() - item.start) / 1000)),
    exp: ok ? 10 + (wasMiss ? 15 : 0) + (goalNow ? 30 : 0) : 0
  };
  item.result = res;
  return res;
}
function dayInfo() {
  const n = dayStat(today()).ok, g = goal();
  return { n, g, pct: Math.min(100, Math.round(n / g * 100)), rest: Math.max(0, g - n), streak: currentStreak() };
}
function secText(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return String(m).padStart(2, "0") + "分" + String(s).padStart(2, "0") + "秒";
}
function clockText(sec) {
  return String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
}

/* ===== 画面の切りかえ ===== */
// ページの中の画面（data-view）を、最初の形で取っておく
const VIEWS = {};
document.querySelectorAll(".theme-l [data-view], .theme-d [data-view]").forEach((v) => {
  const name = v.dataset.view;
  VIEWS[name] = VIEWS[name] || [];
  VIEWS[name].push({ el: v, html: v.innerHTML, dark: !!v.closest(".theme-d") });
});
// name の画面を作り直して出す。fill(root, dark) で中身を入れる
function showView(name, fill) {
  Object.keys(VIEWS).forEach((k) => VIEWS[k].forEach((v) => { v.el.hidden = k !== name; }));
  (VIEWS[name] || []).forEach((v) => {
    v.el.innerHTML = v.html;
    try { fill(v.el, v.dark); } catch (e) { console.error(e); }
  });
  applyTheme(currentTheme());
  window.scrollTo(0, 0);
}

/* ===== 問題の画面（本日の修練問・五本組手・雪辱戦） =====
   ctx: {item, no(何問目), total, kind:"day"|"kum"|"rev", onJudge, onSkip, ...} */
function fillChoices(root, item, kind, rerender) {
  const it = itemsOf(root, "型・壱", "型・弐");
  if (!it) return;
  const on = it.a.cloneNode(true), off = it.b.cloneNode(true);
  [...it.list.children].forEach((c) => { if (/型・[壱弐参四]/.test(c.textContent)) c.remove(); });
  item.c.forEach((txt, i) => {
    const el = (item.pick === i ? on : off).cloneNode(true);
    el.querySelectorAll("input").forEach((x) => x.remove());
    R(el, [item.pick === i ? "型・壱" : "型・弐"], KATA[i]);
    if (kind === "rev") {
      R(el, ["型・壱（選定中）"], KATA[i] + "（選定中）");
      R(el, ["本命の手"], "選択中");
      const num = [...el.querySelectorAll("span")].find((x) => /^\d$/.test(x.textContent.trim()));
      if (num) num.textContent = String(i + 1);
    }
    const p = el.querySelector("p");
    if (p) p.innerHTML = md(txt);
    el.style.cursor = "pointer";
    el.setAttribute("role", "radio");
    el.setAttribute("aria-checked", item.pick === i);
    el.setAttribute("tabindex", "0");
    const choose = (e) => { e.preventDefault(); item.pick = i; rerender(); };
    el.addEventListener("click", choose);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") choose(e); });
    it.list.appendChild(el);
  });
  // 選んでいないときは、どの札も「選択中」にしない
  if (item.pick < 0) root.querySelectorAll("[aria-checked]").forEach(() => {});
}
function fillCode(root, q, nameSamples, codeLineSample) {
  const nameEl = E(root, nameSamples);
  let block = null;
  const pre = root.querySelector("pre");
  if (codeLineSample) {
    const line = E(root, codeLineSample);
    block = line && commonParent(nameEl, line);
  } else if (pre && nameEl) {
    block = commonParent(nameEl, pre);
  }
  if (!q.code) { removeEl(block); return; }
  R(root, nameSamples, fileOf(q));
  if (codeLineSample) {
    const line = E(root, codeLineSample);
    const box = line && line.parentElement;
    if (box) box.innerHTML = '<pre class="kpre">' + escapeHTML(q.code) + "</pre>";
  } else if (pre) {
    const code = pre.querySelector("code");
    (code || pre).textContent = q.code;
  }
}
function copyText(text) {
  countCopy();
  try {
    navigator.clipboard.writeText(text).then(() => showToast("型を写経台（クリップボード）に複写しました"), () => showToast("コピーできませんでした"));
  } catch (e) { showToast("コピーできませんでした"); }
}
function fillQuestion(root, dark, ctx) {
  const { item, kind } = ctx, q = item.q, d = dayInfo();
  const k = KNUM[ctx.no] || String(ctx.no + 1);
  const rerender = () => fillQuestionAgain(ctx);
  // 上の帯
  R(root, ["実戦百人組手 本日 3 / 5 問 済", "本日 3 / 5 問"], kind === "day" ? (dark ? "本日 " + d.n + " / " + d.g + " 問" : "本日の修練 " + d.n + " / " + d.g + " 問 済") : "本日 " + d.n + " / " + d.g + " 問");
  R(root, ["実戦百人組手"], "本日の修練");
  R(root, ["連続5日修練中"], d.streak ? "連続" + d.streak + "日修練中" : "今日から修練");
  R(root, ["[第参問]", "［第参問］"], (dark ? "［第" : "[第") + k + (dark ? "問］" : "問]"));
  R(root, ["目標達成率 60%"], "目標達成率 " + d.pct + "%");
  if (!dark) R(root, ["60%"], d.pct + "%");
  setBar(root, "60%", d.pct);
  // 五本組手：戦の数・時間
  R(root, ["第一戦"], "第" + ["一", "二", "三", "四", "五"][ctx.no] + "戦");
  R(root, ["/ 全五問"], "/ 全" + kanjiNum(ctx.total) + "問");
  R(root, ["一本目 交戦中"], kanjiNum(ctx.no + 1) + "本目 交戦中");
  const clk = R(root, ["特訓経過 00:24", "00:28", "00:15", "00:19"], kind === "kum" && !dark ? "特訓経過 " + clockText(ctx.elapsed()) : clockText(ctx.elapsed()));
  if (clk) clk.dataset.clock = kind === "kum" && !dark ? "特訓経過 " : "";
  if (kind === "kum") {
    // 壱〜伍の札：今の札の見た目を、最初の札（壱）から借りる
    const cells = ["壱", "弐", "参", "四", "伍"].map((ch) => [...root.querySelectorAll("div")].find((x) => x.children.length === 0 && x.textContent.trim() === ch));
    if (cells.every(Boolean)) {
      const look = (el) => [el.className, el.parentElement.className];
      const on = look(cells[0]), off = look(cells[1]);
      const box = (el) => (el.parentElement.children.length > 1 ? el.parentElement : null);
      cells.forEach((el, i) => {
        const L = i === ctx.no ? on : off;
        el.className = L[0];
        if (box(el) && box(cells[0])) el.parentElement.className = L[1];
      });
    }
    cells.forEach((lab, i) => {
      if (!lab) return;
      const st = i < ctx.no ? (ctx.items[i].result && ctx.items[i].result.ok ? "一本" : "不覚") : i === ctx.no ? "現在" : (i === 4 ? "大将戦" : "未受撃");
      const cell = lab.parentElement;
      const tag = cell && [...cell.querySelectorAll("span")].find((x) => /現在|未受撃|大将戦/.test(x.textContent));
      if (tag) tag.textContent = st;
      if (i < ctx.no && cell) cell.style.opacity = "0.6";
    });
    const reason = ctx.reason ? ctx.reason(item) : "";
    R(root, ["抽出理由: 不覚率高（過去2回不覚）", "抽出理由：不覚率高（過去2回不覚）"], reason);
    const prev = E(root, ["前回敗戦：2日前"]);
    if (prev) (prev.closest("span") || prev).remove();
  }
  // 道場と篇
  R(root, ["Web & DB 道場"], DOJOS[q.dojo].name);
  R(root, ["篇四：非同期処理の極意"], topicLabel(q));
  R(root, ["Web & DB 篇四：非同期処理の急所"], DOJOS[q.dojo].name + " " + topicLabel(q));
  if (dark && kind === "kum") { R(root, ["Web & DB 篇四"], DOJOS[q.dojo].name); R(root, ["非同期処理の急所"], topicLabel(q)); }
  R(root, ["Java 実技篇 ・ 並列処理と副作用の急所", "JAVA 実技篇 ・ 並列処理と副作用の急所"], DOJOS[q.dojo].name + " ・ " + topicLabel(q));
  // 問題
  if (kind === "day") {
    const sealEl = [...root.querySelectorAll("span, div")].find((x) => x.children.length === 0 && x.textContent.trim() === "参");
    if (sealEl) sealEl.textContent = k;
  }
  const qh = md(q.q);
  EH(root, ["【問の参】async/await における例外捕捉の構え", "【問の壱】async/await 例外捕捉における"], "【問の" + k + "】" + qh);
  EH(root, ["【雪辱の一刀】Java Stream API"], "【雪辱の一刀】" + qh);
  const desc = "「" + topicLabel(q) + "」の型を問う。" + (q.code ? "下のコードを読み、" : "") + "正しい型を一つ選べ。";
  EH(root, ["下記の関数", "下記の fetchDojoScroll", "複数スレッドから同時に実行される"], escapeHTML(desc));
  // コード
  if (kind === "rev") {
    fillCode(root, q, ["OrderAggregator.java"], ["// ❌ 前回の不覚コード"]);
    R(root, ["不覚箇所の再現"], "問題のコード");
    R(root, ["JDK 17 LTS"], langOf(q));
  } else {
    fillCode(root, q, ["Scroll_Practice.js", "道場木簡コード // Scroll_Async_Trap.js", "// Scroll_Async_Trap.js (UTF-8)"]);
    R(root, ["道場木簡コード // " + fileOf(q)], "道場木簡コード // " + fileOf(q));
    R(root, ["UTF-8"], langOf(q));
    R(root, ["陥穽コード"], "問題のコード");
  }
  onClick(root, ["写経", "写本", "型を写経"], () => q.code ? copyText(q.code) : showToast("この問題にはコードがありません"));
  // 選択肢
  R(root, ["1つ選択中"], item.pick >= 0 ? "1つ選択中" : "未選択");
  R(root, ["1択 選択中"], item.pick >= 0 ? KATA[item.pick] + " 選択中" : "未選択");
  fillChoices(root, item, kind, rerender);
  // 勘所（ヒント）
  const paras = hintParas(q);
  const h1 = paras[0] || "この型の要点を思い出してから選ぼう。", h2 = paras[1] || "";
  const hintBody = E(root, ["非同期構文", "師範の注釈", "師範の言葉", "師範の金言", "師範の指南書"]);
  let hintBox = null;
  if (kind === "day") {
    hintBox = dark ? E(root, ["師範の注釈"]) : E(root, ["【要点】"]);
    hintBox = hintBox && (dark ? hintBox.closest("div").parentElement.parentElement : hintBox.parentElement.parentElement);
    if (dark) EH(root, ["は完了を待つが"], md(h1 + (h2 ? "\n" + h2 : "")));
    else R(root, ["非同期構文 await は"], md(h1 + (h2 ? "\n" + h2 : "")), true);
    if (!dark) { const st = E(root, ["非同期構文"]); if (st && st.tagName === "SPAN") st.innerHTML = md(h1 + (h2 ? "\n" + h2 : "")); }
  } else if (kind === "kum") {
    if (dark) {
      R(root, ["師範の金言：例外の連鎖と戻り値の契約"], "師範の金言：" + (topicOf(q) ? topicOf(q).title : "要点"));
      EH(root, ["内で例外を処理しても"], md(h1 + (h2 ? "\n" + h2 : "")));
    } else {
      EH(root, ["「師範の言葉："], md(h1));
      const p2 = E(root, ["が null を返すと"]);
      if (p2) { if (h2) p2.innerHTML = md(h2); else p2.remove(); }
    }
    hintBox = dark ? (E(root, ["師範の金言"]) || {}).parentElement : null;
  } else {
    const box = E(root, ["💡 師範の指南書："]);
    const holder = box && box.parentElement;
    if (holder) holder.innerHTML = "<p>💡 師範の指南書：</p>" + md(h1 + (h2 ? "\n" + h2 : ""));
    hintBox = holder && holder.parentElement;
    EH(root, ["並列ストリーム処理の本領は"], md(h1));
    R(root, ["集約（Reduction）は言語仕様と Collector に任せるべし。"], h2 ? plainMd(h2).slice(0, 80) : (topicOf(q) ? topicOf(q).title + " を思い出せ。" : "要点を思い出せ。"));
    const det = root.querySelector("details");
    if (det) det.open = !!ctx.hintOpen;
  }
  void hintBody;
  // ヒントを開く・閉じる
  const hintBtn = E(root, ["凡人の勘所（秘伝ヒントを開く）", "凡人の勘所（急所想起のヒントを開く）", "凡人の勘所（雪辱の急所ヒント）"]);
  const btn = hintBtn && hintBtn.closest("button");
  if (btn && hintBox) {
    const body = btn.nextElementSibling || hintBox;
    const set = (open) => {
      body.style.display = open ? "" : "none";
      body.classList.remove("hidden");
      btn.setAttribute("aria-expanded", open);
      const ic = [...btn.querySelectorAll(".material-symbols-outlined")].pop();
      if (ic) ic.textContent = open ? "expand_less" : "expand_more";
    };
    set(!!ctx.hintOpen);
    btn.addEventListener("click", (e) => { e.preventDefault(); ctx.hintOpen = !ctx.hintOpen; set(ctx.hintOpen); });
  }
  // 砂場（道場の書いて練習）
  linkTo(root, ["写経して試す", "砂場で試す"], DOJOS[q.dojo].href);
  // 判定
  onClick(root, ["いざ尋常に勝負（判定する）", "いざ一本判定へ（次へ進む）", "いざ雪辱の判定へ（一本を取り返す！）"], () => {
    if (item.pick < 0) { showToast("型を一つ選んでから判定しよう"); return; }
    ctx.onJudge();
  });
  // 中断・印・スキップ・再点検
  onClick(root, ["特訓中断"], () => { location.href = "weak.html"; });
  onClick(root, ["あとで再戦"], () => { location.href = "weak.html"; });
  onClick(root, ["急所を再点検"], () => { ctx.hintOpen = true; rerender(); });
  const star = readJSON("keiko-star", {}) || {};
  const markLabel = E(root, ["急所に印をつける", "急所に印"]);
  if (markLabel) {
    R(root, ["急所に印をつける", "急所に印"], star[q.id] ? "急所の印を外す" : (dark ? "急所に印" : "急所に印をつける"));
    onClick(root, [star[q.id] ? "急所の印を外す" : "急所に印"], () => {
      const s = readJSON("keiko-star", {}) || {};
      if (s[q.id]) delete s[q.id]; else s[q.id] = 1;
      writeJSON("keiko-star", s);
      showToast(s[q.id] ? "急所に印をつけました（弱点克服帳の「重要星付き」で見られます）" : "印を外しました");
      rerender();
    });
  }
  const skip = E(root, ["スキップ(残1回)", "スキップ"]);
  if (skip) {
    const left = ctx.skipsLeft || 0;
    R(root, ["スキップ(残1回)", "(残1)"], kind === "kum" && dark ? "(残" + left + ")" : "スキップ(残" + left + "回)");
    onClick(root, ["スキップ"], () => { if ((ctx.skipsLeft || 0) <= 0) { showToast("スキップはもう使えません"); return; } ctx.onSkip(); });
  }
  // 他の道場へ切りかえ（本日の修練問）
  if (kind === "day") fillDojoSwitch(root, dark, ctx);
  // 雪辱戦の上の帯
  if (kind === "rev") {
    const n = ctx.missCount || 1;
    R(root, ["参本目の雪辱戦（単問集中・一騎打ち）"], "不覚" + kanjiNum(n) + "回の型・雪辱戦（単問集中・一騎打ち）");
    R(root, ["前回の不覚（2分前）："], "前回の不覚：");
    R(root, ["前回の不覚（2分前）"], "前回の不覚");
    if (!R(root, ["parallelStream 内での可変コレクション操作により並列競合が発生"], "この型で" + kanjiNum(n) + "回、一本取られている")) {
      EH(root, ["内での可変コレクション操作により並列競合が発生"], "この型で" + kanjiNum(n) + "回、一本取られている");
    }
  }
}
function fillDojoSwitch(root, dark, ctx) {
  const it = itemsOf(root, ["Web & DB (実践演習中)"], ["Java 基礎鍛錬"]);
  if (!it) return;
  const on = it.a.cloneNode(true), off = it.b.cloneNode(true);
  [...it.list.children].forEach((c) => c.remove());
  [["coding", "Web & DB 道場"], ["java", "Java 道場"], ["run", "Java 実技道場"]].forEach(([id, name]) => {
    const active = ctx.dojo === id;
    const el = (active ? on : off).cloneNode(true);
    R(el, [active ? "Web & DB (実践演習中)" : "Java 基礎鍛錬"], active ? name + "（修練中）" : name);
    el.addEventListener("click", (e) => {
      e.preventDefault();
      if (id === "run") { location.href = "java-run.html"; return; }
      if (!active) ctx.onDojo(id);
    });
    it.list.appendChild(el);
  });
  // 弱点克服帳へ
  const w = off.cloneNode(true);
  R(w, ["Java 基礎鍛錬"], "弱点克服帳");
  w.addEventListener("click", (e) => { e.preventDefault(); location.href = "weak.html"; });
  it.list.appendChild(w);
  R(root, ["全3巻"], "全3道場");
}
// 選択肢を押したとき：画面全体を作り直す（ライト・ダーク両方）
let currentQ = null;
function fillQuestionAgain(ctx) {
  const y = window.scrollY;
  showView("q", (root, dark) => fillQuestion(root, dark, ctx));
  window.scrollTo(0, y);
}
function showQuestion(ctx) {
  currentQ = ctx;
  ctx.item.start = ctx.item.start || Date.now();
  showView("q", (root, dark) => fillQuestion(root, dark, ctx));
}

/* ===== 判定の画面（正解・不正解） =====
   j: {item, res, no, total, nextLabel, onNext, onRetry, kindName} */
function fillHeaderStrip(root, dark, res) {
  const d = dayInfo(), rk = rankInfo();
  R(root, ["実戦百人組手 本日 3 / 5 問 済", "本日 3 / 5 問 完"], "本日 " + d.n + " / " + d.g + " 問 " + (d.rest ? "済" : "完"));
  R(root, ["実戦百人組手"], "本日の修練");
  R(root, ["5日連続"], d.streak + "日連続");
  const goalTxt = d.rest ? "目標まであと" + d.rest + "問" : "本日の目標達成！";
  R(root, ["60% 完了 (目標 80% まであと1問)"], d.pct + "% 完了（" + goalTxt + "）");
  R(root, ["目標 80% まであと1問", "目標 80% まであと 1 問"], goalTxt);
  R(root, ["日課達成率 60%"], "日課達成率 " + d.pct + "%");
  R(root, ["60%"], d.pct + "%");
  setBar(root, "60%", d.pct);
  root.querySelectorAll('[title="目標 80%"]').forEach((x) => x.remove());
  R(root, ["正解判定 +30pt 獲得"], "正解判定 +" + res.exp + " EXP 獲得");
  R(root, ["凡人参段"], rk.name);
}
function fillJudge(root, dark, j) {
  const { item, res } = j, q = item.q, t = topicOf(q);
  const k = KNUM[j.no] || String(j.no + 1);
  const correct = item.c[item.a], chosen = item.c[res.pick];
  fillHeaderStrip(root, dark, res);
  R(root, ["問の参：async/await における例外捕捉の構え"], "問の" + k + "：" + plainMd(q.q));
  R(root, ["問の参："], "問の" + k + "：");
  R(root, ["async/await における例外捕捉の構え"], plainMd(q.q));
  // 数字
  R(root, ["42秒", "58秒"], res.sec + "秒");
  R(root, ["42", "58"], String(res.sec));
  R(root, ["+50 EXP", "+15 EXP"], "+" + res.exp + " EXP");
  R(root, ["+50", "+15"], "+" + res.exp);
  const acc = overallAccuracy();
  R(root, ["91.4%", "43.2"], dark && res.ok ? acc + "%" : String(acc));
  R(root, ["91.4"], String(acc));
  // ライトの不正解画面は「自分の正答率」が2つ並んでいるので、2つ目を数字にする
  const accNodes = textNodes(root).filter((n) => norm(n.nodeValue) === "自分の正答率");
  if (accNodes.length === 2) accNodes[1].nodeValue = acc + "%";
  const paras = t && t.body ? t.body.split("\n").filter((x) => x.trim()) : [];
  const code = (t && t.code) || q.code || "";
  if (res.ok) {
    // 審判の記録
    R(root, ["型・壱（選んだ型）", "型・壱 (選んだ型)"], KATA[res.pick] + "（選んだ型）");
    EH(root, ["try/catch ブロックで await fetch を包み"], md(chosen));
    const ri = E(root, ["ネットワーク寸断などの拒絶"]);
    if (ri) ri.innerHTML = (dark ? "<strong>判定の理：</strong>" : "") + md(q.e);
    // 秘伝解説
    R(root, ["秘伝の巻物 其の参"], "秘伝の巻物 其の" + k);
    fillPoints(root, dark, t, paras, ["try/catch の結界で囲むべし", "一、try/catch の結界で囲むべし"], ["通信不首尾（HTTP 4xx/5xx）の落とし穴", "二、通信不首尾（HTTP 4xx/5xx）の落とし穴"],
      ["は、通信断絶やDNS解決不能", "は通信切断・DNS解決失敗時"], ["でも fetch 自体は完了とみなされ", "でも fetch 自体は Reject されません"]);
    fillSolution(root, q, code, ["Scroll_Solution.js"], ["ES2024"]);
    onClick(root, ["写経（コピー）"], () => code ? copyText(code) : showToast("コードはありません"));
    onClick(root, ["模範コードをマイ巻物（ノート）に転記する"], () => saveToHiden(q, code));
    R(root, ["模範コードをマイ巻物（ノート）に転記する"], "模範コードを秘伝の書（自分の覚書）に転記する");
    // 他の型の講評
    const others = item.c.map((txt, i) => ({ txt, i })).filter((x) => x.i !== item.a);
    const it = itemsOf(root, dark ? ["型・弐"] : ["型・弐：await と .catch() の混用"], dark ? ["型・参"] : ["型・参：エラー握り潰し"]);
    if (it) {
      const tpl = it.a.cloneNode(true);
      [...it.list.children].forEach((c) => { if (/型・[弐参四]/.test(c.textContent)) c.remove(); });
      others.forEach((o) => {
        const el = tpl.cloneNode(true);
        const why = whyOf(q, o.txt) || "正解の型とくらべて、どこが違うかを確かめよう。";
        if (dark) {
          R(el, ["型・弐"], KATA[o.i]);
          EH(el, ["と", "の混用"], md(o.txt) + "：" + md(why));
          const spans = el.querySelectorAll("span");
          if (spans[1]) spans[1].innerHTML = md(o.txt) + "：" + md(why);
        } else {
          R(el, ["型・弐：await と .catch() の混用"], KATA[o.i] + "：" + plainMd(o.txt));
          R(el, ["乱れた構え"], "誤りの型");
          const p = el.querySelector("p");
          if (p) p.innerHTML = md(why);
        }
        it.list.appendChild(el);
      });
    }
    R(root, ["次の修練へ進む（第四問へ）"], j.nextLabel);
    onClick(root, ["次の修練へ進む", j.nextLabel], j.onNext);
    onClick(root, ["復習巻物に登録"], () => {
      const s = readJSON("keiko-star", {}) || {};
      s[q.id] = 1;
      writeJSON("keiko-star", s);
      showToast("急所の印をつけました（弱点克服帳の「重要星付き」で見られます）");
    });
    R(root, ["復習巻物に登録"], "急所に印をつける");
    linkTo(root, ["写経道場で試す"], DOJOS[q.dojo].href);
  } else {
    // 審判録・型の相違
    R(root, ["OPTION A"], "OPTION_C");
    R(root, ["OPTION B"], "OPTION " + ABCD[res.pick]);
    R(root, ["OPTION_C"], "OPTION " + ABCD[item.a]);
    EH(root, ["型・弐：fetch の直後に"], KATA[res.pick] + "：" + md(chosen));
    EH(root, ["型・壱：一連の処理を"], KATA[item.a] + "：" + md(correct));
    const why = whyOf(q, chosen) || "この型では、問われていることに答えられていない。正解の型とくらべてみよう。";
    EH(root, ["で握り潰しても await の戻り値は"], (dark ? "<strong>陥穽（かんせい）：</strong>" : "") + md(why));
    EH(root, ["非同期処理群をひとつの境界線の中に"], (dark ? "<strong>極意：</strong>" : "") + md(q.e));
    // 敗北指南巻
    R(root, ["秘伝 其の参：非同期の防壁設計"], "秘伝 其の" + k + "：" + (t ? t.title : q.catName));
    R(root, ["秘伝 其の参"], "秘伝 其の" + k);
    R(root, ["JS奥義"], q.catName);
    fillPoints(root, dark, t, paras, [".catch() 単体では await の結界を維持できず"], ["実戦の鉄則：境界線（例外結界）は外側に張る"],
      ["Promiseチェーンの catch はその式単体で完結し", "は Promise の拒否を解決済みにすり替えるだけです"], ["関数全体の責務として", "非同期呼び出しが連鎖する局面では"]);
    // コード（模範の型）
    const nameEl = E(root, ["Scroll_Mistake_vs_Correct.js"]);
    const first = E(root, ["// ❌ 不覚の構え（あなたのコード）"]);
    const box = dark ? (E(root, ["// ⭕ 堅牢なる正解の構え（模範）"]) || first) && E(root, ["// ⭕ 堅牢なる正解の構え（模範）"]).parentElement.parentElement : first && first.parentElement;
    if (code) {
      R(root, ["Scroll_Mistake_vs_Correct.js"], fileOf({ dojo: q.dojo, cat: q.cat, code }));
      R(root, ["構えの崩落箇所"], "模範の型");
      if (box) box.innerHTML = '<pre class="kpre">' + escapeHTML(code) + "</pre>";
      const tg = E(root, ["模範の型へ切替"]);
      if (tg) tg.remove();
    } else if (nameEl) {
      const block = commonParent(nameEl, box || nameEl);
      if (block) [...block.children].forEach((c) => { if (c.contains(nameEl) || (box && c.contains(box))) c.remove(); });
    }
    onClick(root, ["写経して型を刻む"], () => code ? copyText(code) : showToast("コードはありません"));
    R(root, ["弱点巻物に登録"], "弱点克服帳に登録済み");
    linkTo(root, ["弱点克服帳に登録済み"], "weak.html");
    R(root, ["次の修練へ進む（第四問へ）"], j.nextLabel);
    onClick(root, [j.nextLabel], j.onNext);
    onClick(root, ["この問に再戦"], j.onRetry);
    onClick(root, ["解説を熟読する"], () => {
      const target = E(root, ["師範の敗北指南巻"]);
      if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
    });
  }
  linkTo(root, ["鍛錬を一時中断して道場へ戻る"], "index.html");
}
// 解説の「壱・弐」：トピックの題名と説明の段落を入れる（2つ目がなければ消す）
function fillPoints(root, dark, t, paras, h1s, h2s, p1s, p2s) {
  const it = itemsOf(root, h1s, h2s);
  R(root, h1s, t ? t.title : "要点");
  EH(root, p1s, md(paras[0] || ""));
  if (paras[1]) {
    R(root, h2s, "覚えておくこと");
    EH(root, p2s, md(paras.slice(1).join("\n")));
  } else if (it && it.b) {
    it.b.remove();
  }
}
function fillSolution(root, q, code, names, langs) {
  const nameEl = E(root, names);
  const pre = root.querySelector("pre");
  if (!code) { const b = nameEl && pre && commonParent(nameEl, pre); removeEl(b); return; }
  R(root, names, fileOf({ dojo: q.dojo, cat: q.cat, code }));
  R(root, langs, langOf(q));
  if (pre) { const c = pre.querySelector("code"); (c || pre).textContent = code; }
}
// 模範コードを秘伝の書の「自分の覚書」に入れる
function saveToHiden(q, code) {
  const mine = readJSON("hiden-mine", []) || [];
  const t = topicOf(q);
  mine.push({ id: "mine-" + Date.now(), title: (t ? t.title : q.catName) + " の模範コード", body: plainMd(q.q) + "\n\n" + plainMd(q.e) + (code ? "\n\n" + code : ""), at: Date.now() });
  writeJSON("hiden-mine", mine);
  showToast("秘伝の書の「自分の覚書」に転記しました");
}

/* ===== 結果の画面 =====
   r: {items, modeName, modeLabel, sec, onRevenge} */
function fillResult(root, dark, r) {
  const items = r.items.filter((x) => x.result);
  const win = items.filter((x) => x.result.ok).length, lose = items.length - win;
  const pct = items.length ? Math.round(win / items.length * 100) : 0;
  const exp = items.reduce((t, x) => t + x.result.exp, 0);
  const over = items.filter((x) => x.result.ok && x.result.wasMiss).length;
  R(root, ["急所克服モード・五本組手 完遂"], r.modeLabel + " 完遂");
  R(root, ["二分四十五秒 稽古"], secText(r.sec) + " 稽古");
  R(root, ["五本組手 結び・修練完了"], r.modeName + " 結び・修練完了");
  R(root, ["総特訓時間 02分45秒"], "総特訓時間 " + secText(r.sec));
  R(root, ["四勝"], kanjiNum(win) + "勝");
  R(root, ["一敗"], kanjiNum(lose) + "敗");
  R(root, ["五戦中四撃的中（勝率 80%）"], kanjiNum(items.length) + "戦中" + kanjiNum(win) + "撃的中（勝率 " + pct + "%）");
  const big = textNodes(root).find((n) => norm(n.nodeValue) === "80");
  if (big) big.nodeValue = String(pct);
  R(root, ["克服昇格 +2 巻"], "克服昇格 +" + over + " 巻");
  R(root, ["+2"], "+" + over);
  const rest = missList().length;
  R(root, ["残る急所 5 巻"], "残る急所 " + rest + " 巻");
  const five = textNodes(root).find((n) => norm(n.nodeValue) === "5");
  if (five) five.nodeValue = String(rest);
  R(root, ["五本組手 結びの戦歴"], r.modeName + " 結びの戦歴");
  R(root, ["壱 〜 伍本"], "壱 〜 " + (KNUM[items.length - 1] || items.length) + "本");
  // 戦歴
  const it = itemsOf(root, ["壱本目"], ["弐本目"]);
  if (it) {
    const winTpl = it.b.cloneNode(true);
    const lose3 = E(it.list, ["参本目"]);
    const loseTpl = lose3 ? [...it.list.children].find((c) => c.contains(lose3)).cloneNode(true) : winTpl.cloneNode(true);
    [...it.list.children].forEach((c) => c.remove());
    let streak = 0;
    items.forEach((x, i) => {
      const q = x.q, ok = x.result.ok;
      streak = ok ? streak + 1 : 0;
      const el = (ok ? winTpl : loseTpl).cloneNode(true);
      const nm = (KNUM[i] || i + 1) + "本目" + (i === items.length - 1 && items.length >= 5 ? "（大将戦）" : "");
      R(el, [ok ? "弐本目" : "参本目"], nm);
      if (ok) R(el, ["二連勝"], x.result.wasMiss ? "克服昇格！" : (streak >= 2 ? kanjiNum(streak) + "連勝" : "見事な見切り！"));
      R(el, [ok ? "34秒" : "42秒"], x.result.sec + "秒");
      R(el, ["SQL JOIN における NULL値の落とし穴", "Java Stream API の副作用混入"], plainMd(q.q));
      R(el, ["典拠：Web & DB 篇二", "典拠：Java実技篇", "典拠：Java 実技篇"], "典拠：" + DOJOS[q.dojo].name + " " + topicLabel(q));
      EH(el, ["LEFT OUTER JOIN時のWHERE句"], md(q.e));
      R(el, ["急所：parallelStream 内の可変コレクション操作"], "正解：" + plainMd(x.c[x.a]));
      EH(el, ["並列パイプライン内での"], md(q.e));
      onClick(el, ["直ちに再戦"], () => { location.href = "revenge.html?id=" + encodeURIComponent(q.id); });
      // ダークの開け閉め
      const head = el.querySelector("button");
      const body = head && head.nextElementSibling;
      if (dark && head && body) {
        body.style.display = "none";
        head.addEventListener("click", (e) => {
          e.preventDefault();
          const open = body.style.display === "none";
          body.style.display = open ? "" : "none";
          const ic = [...head.querySelectorAll(".material-symbols-outlined")].pop();
          if (ic) ic.textContent = open ? "expand_less" : "expand_more";
        });
      }
      it.list.appendChild(el);
    });
  }
  // 総括
  const missed = items.filter((x) => !x.result.ok);
  let words;
  if (!items.length) words = "まだ一本も交えておらぬ。まずは一問、構えてみよ。";
  else if (!lose) words = kanjiNum(win) + "戦全勝、見事なり。迷いなき太刀筋は日々の積み重ねの証。明日は一段難しい型にも挑んでみよ。";
  else if (win >= lose) words = kanjiNum(win) + "勝" + kanjiNum(lose) + "敗、よき太刀筋なり。落とした「" + plainMd(missed[0].q.q).slice(0, 30) + "」も、一度の不覚を恐れるなかれ。弱点克服帳で再戦し、技を血肉とせよ。";
  else words = kanjiNum(win) + "勝" + kanjiNum(lose) + "敗。一本取られた数だけ、伸び代がある。解説を読み直し、弱点克服帳で一問ずつ取り返していこう。";
  EH(root, ["四勝一敗、実に見事な太刀筋なり"], escapeHTML(words));
  R(root, ["+120 EXP"], "+" + exp + " EXP");
  R(root, ["7日連続継続中"], currentStreak() + "日連続継続中");
  const rv = onClick(root, ["不覚を取った一問を直ちに復習する（リベンジ）"], () => {
    location.href = missed.length ? "revenge.html?id=" + encodeURIComponent(missed[0].q.id) : "weak.html";
  });
  if (rv && !missed.length) R(root, ["不覚を取った一問を直ちに復習する（リベンジ）"], "弱点克服帳で、ほかの急所に挑む");
  linkTo(root, ["弱点巻物一覧へ戻る"], "weak.html");
  R(root, ["弱点巻物一覧へ戻る"], "弱点克服帳へ");
  const back = E(root, ["道場トップへ凱旋"]);
  if (back) { const b = back.closest("button"); if (b) b.addEventListener("click", () => { location.href = dayStat(dayKey(new Date())).ok >= goal() ? "gaisen.html" : "index.html"; }); }
}

/* ===== 経過時間の表示（1秒ごと） ===== */
let clockStart = Date.now();
setInterval(() => {
  const sec = Math.round((Date.now() - clockStart) / 1000);
  document.querySelectorAll("[data-clock]").forEach((el) => { el.textContent = el.dataset.clock + clockText(sec); });
}, 1000);
