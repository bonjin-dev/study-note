/* =========================================================
   五本組手 ― 弱点克服帳（まちがえた問題）から5問。足りなければ、まだ正解していない問題で埋める
   ========================================================= */
const N = 5;
const misses = shuffle(missList());
let pool = misses.map((m) => m.id);
if (pool.length < N + 1) {
  const unsolved = shuffle(DRILL.q.filter((q) => !storeOf(q.dojo).ok[q.id] && pool.indexOf(q.id) < 0).map((q) => q.id));
  pool = pool.concat(unsolved);
}
if (pool.length < N + 1) pool = pool.concat(shuffle(DRILL.q.map((q) => q.id)).filter((id) => pool.indexOf(id) < 0));
const items = pool.slice(0, N).map((id) => makeItem(id));
let spare = pool.slice(N);
let no = 0, skipsLeft = 1;
const started = Date.now();
const missOf = (id) => { const m = misses.find((x) => x.id === id); return m ? m.n : 0; };

function show() {
  const item = items[no];
  item.start = Date.now();
  showQuestion({
    item, items, kind: "kum", no, total: N, skipsLeft,
    elapsed: () => Math.round((Date.now() - started) / 1000),
    reason: (it) => missOf(it.id) ? "抽出理由: 過去" + missOf(it.id) + "回不覚" : "抽出理由: 未修得の型",
    onSkip: () => { skipsLeft--; items[no] = makeItem(spare.shift()); show(); },
    onJudge: () => judge()
  });
}
function judge() {
  const item = items[no];
  const res = recordAnswer(item, item.pick);
  const last = no + 1 >= N;
  showView(res.ok ? "ok" : "ng", (root, dark) => fillJudge(root, dark, {
    item, res, no,
    nextLabel: last ? "五本組手の結びへ" : "次の修練へ進む（第" + KNUM[no + 1] + "戦へ）",
    onNext: () => { if (last) end(); else { no++; show(); } },
    onRetry: () => { items[no] = makeItem(item.id); show(); }
  }));
}
function end() {
  showView("res", (root, dark) => fillResult(root, dark, {
    items, modeName: "五本組手", modeLabel: "急所克服モード・五本組手", sec: Math.round((Date.now() - started) / 1000)
  }));
}
clockStart = started;
show();
