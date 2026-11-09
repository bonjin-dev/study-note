/* =========================================================
   凱旋 ― 1日の目標を達成した日のトップ（今日の成果のまとめ）
   ========================================================= */

/* ===== 文字を探して入れかえる道具 ===== */
const norm = (s) => String(s).replace(/\s+/g, " ").trim();
function textNodes(root) {
  const out = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) out.push(w.currentNode);
  return out;
}
function R(root, sample, rep) {
  const s = norm(sample);
  const node = textNodes(root).find((t) => norm(t.nodeValue).indexOf(s) >= 0);
  if (!node) return null;
  node.nodeValue = norm(node.nodeValue).replace(s, rep);
  return node.parentElement;
}
function E(root, sample) {
  const s = norm(sample);
  let hit = null;
  root.querySelectorAll("*").forEach((el) => { if (norm(el.textContent).indexOf(s) >= 0) hit = el; });
  while (hit) {
    const c = [...hit.children].find((x) => norm(x.textContent).indexOf(s) >= 0);
    if (!c) break;
    hit = c;
  }
  return hit;
}
function exact(root, text) {
  return textNodes(root).find((t) => norm(t.nodeValue) === text);
}
function link(root, sample, href) {
  const el = E(root, sample);
  const a = el && el.closest("a, button");
  if (!a) return;
  if (a.tagName === "A") a.setAttribute("href", href);
  else a.addEventListener("click", () => { location.href = href; });
}

/* ===== 今日の数字 ===== */
const today = dayKey(new Date());
const st = dayStat(today);
const g = goal();
const rk = rankInfo();
const titles = titlesEarned();
const rv = revengeLog();
const revToday = Object.keys(rv).filter((id) => dayKey(new Date(rv[id].at)) === today).length;
const okOf = (d) => dayEntry(today, d).ok;
const expToday = okOf("coding") * 10 + okOf("java") * 10 + okOf("run") * 20 + revToday * 15 + (st.ok >= g ? 30 : 0);
const accToday = st.ok + st.ng ? Math.round(st.ok / (st.ok + st.ng) * 100) : 0;
const perfect = st.ng === 0 && st.ok >= g;
const MONTHS = ["睦月", "如月", "弥生", "卯月", "皐月", "水無月", "文月", "葉月", "長月", "神無月", "霜月", "師走"];
const missN = ["coding", "java"].reduce((t, d) => t + Object.keys((dojoStore(d) || {}).miss || {}).length, 0);
// 今日いちばん修練した道場を先頭に
const order = DOJO_IDS.slice().sort((a, b) => okOf(b) - okOf(a));

function fill(root) {
  // 結びの見出し
  R(root, "五本組手 結び・凱旋帰還", "本日の修練 結び・凱旋帰還");
  R(root, "五本組手 結び", "本日の修練 結び");
  textNodes(root).filter((n) => norm(n.nodeValue) === "全勝制覇").forEach((n) => {
    n.nodeValue = perfect ? "全勝制覇" : "目標達成";
    if (n.parentElement.tagName === "SPAN") n.parentElement.style.marginLeft = "0.4em"; // 「結び」との間をあける
  });
  const msg = "本日の目標 " + g + " 問を達成。鍛錬値 +" + expToday + " EXP を積み、段位は「" + rk.name + "」。" +
    (perfect ? "一本も取られぬ見事な太刀筋でした。" : "取られた一本は、弱点克服帳で取り返しましょう。");
  const p = E(root, "見事雪辱を果たし"); // 文章は最後に入れる（あとの数字の入れかえに巻きこまれないように）
  R(root, "リベンジ正解率 100%", "本日の正答率 " + accToday + "%");
  R(root, "皆伝印可 授与", "段位：" + rk.name);
  // 写真のかわりの帯
  R(root, "夜更けの道場・静謐の境地", "本日の稽古、ここに結ぶ");
  R(root, "水無月の段", MONTHS[new Date().getMonth()] + "の段");
  // 連続・本日達成
  const seven = exact(root, "7");
  if (seven) seven.nodeValue = String(currentStreak());
  R(root, "5 / 5", st.ok + " / " + g);
  R(root, "問完勝", perfect ? "問完勝" : "問達成");
  const dots = E(root, "問達成") || E(root, "問完勝");
  const dotBox = dots && dots.closest("div").parentElement.querySelector("div:last-child");
  if (dotBox && dotBox.children.length === 5) [...dotBox.children].forEach((d, i) => { d.style.opacity = i < Math.min(5, Math.round(st.ok / g * 5)) ? "1" : "0.25"; });
  // EXP
  // 「80 EXP」は先に入れかえる（ほかの数字に「80 EXP」がふくまれても巻きこまないように）
  R(root, "80 EXP", rk.next ? rk.need.toLocaleString() + " EXP" : "");
  R(root, "次の階位まであと", rk.next ? "「" + rk.next + "」まであと" : "最高の段位");
  R(root, "+170 EXP 獲得済", "+" + expToday + " EXP 獲得済");
  R(root, "1,420 EXP", rk.exp.toLocaleString() + " EXP");
  R(root, "本日の累計:", "これまでの累計:");
  const ws = [...root.querySelectorAll('[style*="width"]')];
  if (ws[0]) ws[0].style.width = Math.max(0, rk.pct - 6) + "%";
  if (ws[1]) ws[1].style.width = rk.pct + "%";
  // 称号
  const last = titles[titles.length - 1];
  R(root, "新規印可 獲得", "手に入れた称号 " + titles.length + " / " + TITLES.length);
  const h4 = E(root, "称号【雪辱の達人】");
  if (h4) h4.textContent = last ? "称号【" + last.name + "】" : "称号はまだありません";
  const hp = E(root, "誤謬をその日のうちに");
  if (hp) hp.textContent = last ? last.how + "の証" : "まずは「初陣」（はじめて1問正解）を目指そう";
  // 道場
  const cards = [
    { s: ["直前の雪辱により進捗更新！", "実技・リアル実行", "Java 実技道場", "+10% UP!", "Chapter 01 / 標準入出力とStream APIの実行確認", "次章解放まで 5問", "次の型へ挑む"], w: [2, 3] },
    { s: [null, "入門基礎", "Web & DB 道場", "進捗 68%", "Chapter 04 / 非同期処理とコネクションプール", "修練可能問題: 12問", "つづける"], w: [4] },
    { s: [null, "基礎強化", "Java 道場 (基礎強化)", "進捗 42%", "Chapter 02 / Spring Data JPA リポジトリ構築", "修練可能問題: 8問", "つづける"], w: [5] }
  ];
  const blocks = cards.map((c) => { const h = E(root, c.s[2]); return h && h.closest("section > div"); });
  cards.forEach((c, k) => {
    const d = order[k], info = DOJOS[d], el = blocks[k];
    if (!el) return;
    const pct = solvedPercent(d), solved = solvedCount(d), last = lastChapter(d);
    if (c.s[0]) R(el, c.s[0], okOf(d) ? "本日の修練で進捗更新！" : "次の修練へ");
    R(el, c.s[1], info.badge || info.name);
    const h = E(el, c.s[2]);
    if (h) h.textContent = info.name;
    if (k === 0) R(el, c.s[3], "本日 +" + okOf(d) + "問");
    else R(el, c.s[3], "進捗 " + pct + "%");
    const ch = E(el, c.s[4]);
    if (ch) ch.textContent = last ? (last.ch ? "Chapter " + String(last.ch).padStart(2, "0") + " / " : "") + last.title : "まだはじめていません";
    R(el, c.s[5], "残り " + Math.max(0, info.total - solved) + "問");
    link(el, c.s[6], info.href);
    if (k === 0) {
      R(el, "15% →", "");
      R(el, "25% 正解済み", pct + "% 正解済み");
      const note = E(el, "parallelStreamの急所を完全克服！");
      if (note && note.parentElement) note.parentElement.textContent = okOf(d) ? "本日 " + okOf(d) + " 問に正解しました。この調子で次の型へ。" : "今日はまだこの道場の問題を解いていません。";
    }
    const bars = [...el.querySelectorAll('[style*="width"]')];
    if (k === 0) { if (bars[0]) bars[0].style.width = pct + "%"; if (bars[1]) bars[1].style.width = "0%"; }
    else if (bars[0]) bars[0].style.width = pct + "%";
  });
  // 金言・コツ
  const q = E(root, "不覚を恐れず");
  if (q) q.textContent = "「一問ずつの積み重ねこそが、凡人を達人へと昇華させる。今日の鍛錬、見事であった。明日もまた、この道場にて待つ。」";
  R(root, "凡人のコツ：眠る前の忘却防止", "凡人のコツ：眠る前のふり返り");
  const tip = E(root, "雪辱したコードの形を");
  if (tip) tip.textContent = "今日解いた問題を1つだけ頭の中で思い出してから眠りにつこう。寝ている間に記憶が整理され、明日も思い出しやすくなります。";
  // 更なる精進へ
  R(root, "残り4巻を確認", missN ? "残り" + missN + "巻を確認" : "急所はありません");
  link(root, "弱点巻物", "weak.html");
  R(root, "弱点巻物", "弱点克服帳");
  R(root, "並列集約の型を読む", "まとめノートを読む");
  link(root, "秘伝の書", "secrets.html");
  if (p) p.textContent = msg;
}
document.querySelectorAll(".theme-l, .theme-d").forEach(fill);
// 今日はもう見た（トップから何度も来ないように）
try { localStorage.setItem("gaisen-seen", today); } catch (e) {}
