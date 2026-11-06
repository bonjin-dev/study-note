/* =========================================================
   鍛錬室・本日の修練問 ― 1日の目標の数だけ、まだ正解していない問題を順に出す
   ========================================================= */
const DAY = "keiko-day";
let day = readJSON(DAY, {}) || {};
if (day.date !== today()) day = { date: today(), dojo: day.dojo || "coding", sets: {}, done: {} };
function saveDay() { writeJSON(DAY, day); }

// その道場の、今日の問題（まだ正解していないものを順番に。足りなければ復習）
function makeSet(dojo) {
  const s = storeOf(dojo);
  const list = DRILL.q.filter((q) => q.dojo === dojo);
  const order = list.slice().sort((a, b) => a.lv - b.lv);
  let ids = order.filter((q) => !s.ok[q.id]).slice(0, goal()).map((q) => q.id);
  if (ids.length < goal()) ids = ids.concat(shuffle(order.filter((q) => ids.indexOf(q.id) < 0)).slice(0, goal() - ids.length).map((q) => q.id));
  return ids;
}
function setOf(dojo) {
  if (!day.sets[dojo]) { day.sets[dojo] = makeSet(dojo); saveDay(); }
  return day.sets[dojo];
}
// 答えた結果から、結果の画面用の項目を作る
function doneItems(dojo) {
  return setOf(dojo).filter((id) => day.done[id]).map((id) => {
    const d = day.done[id];
    return { id, q: QMAP[id], c: d.c, a: d.a, result: d };
  });
}
let item = null;
function next() {
  const ids = setOf(day.dojo);
  const id = ids.find((x) => !day.done[x]);
  if (!id) { showEnd(); return; }
  item = makeItem(id);
  const no = ids.indexOf(id);
  clockStart = Date.now();
  showQuestion({
    item, kind: "day", no, total: ids.length, dojo: day.dojo, elapsed: () => 0,
    onDojo: (d) => { day.dojo = d; saveDay(); next(); },
    onJudge: () => judge(no, ids.length)
  });
}
function judge(no, total) {
  const res = recordAnswer(item, item.pick);
  day.done[item.id] = Object.assign({ c: item.c, a: item.a }, res);
  saveDay();
  const last = no + 1 >= total;
  showView(res.ok ? "ok" : "ng", (root, dark) => fillJudge(root, dark, {
    item, res, no,
    nextLabel: last ? "本日の修練の結びへ" : "次の修練へ進む（第" + (KNUM[no + 1]) + "問へ）",
    onNext: next,
    onRetry: () => { const again = makeItem(item.id); item = again; showQuestion({ item, kind: "day", no, total, dojo: day.dojo, elapsed: () => 0, onDojo: (d) => { day.dojo = d; saveDay(); next(); }, onJudge: () => judgeRetry(no, total) }); }
  }));
}
// 再戦：もう一度答える（記録は残す）
function judgeRetry(no, total) { judge(no, total); }
function showEnd() {
  const items = doneItems(day.dojo);
  const sec = items.reduce((t, x) => t + (x.result.sec || 0), 0);
  showView("res", (root, dark) => {
    fillResult(root, dark, { items, modeName: "本日の修練", modeLabel: "本日の修練問・" + DOJOS[day.dojo].name, sec });
    // もう一巡（同じ道場で次の問題）
    const again = E(root, ["道場トップへ凱旋"]);
    void again;
  });
}
next();
