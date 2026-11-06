/* =========================================================
   雪辱戦 ― まちがえた問題に、もう一度だけ挑む（単問集中）
   ========================================================= */
const params = new URLSearchParams(location.search);
let qid = params.get("id");
if (!qid || !QMAP[qid]) { const m = missList()[0]; qid = m ? m.id : DRILL.q[0].id; }
const missN = () => storeOf(QMAP[qid].dojo).miss[qid] || 0;
let item;
function start() {
  item = makeItem(qid);
  clockStart = Date.now();
  showQuestion({
    item, kind: "rev", no: 0, total: 1, missCount: missN(), elapsed: () => 0,
    onJudge: judge
  });
}
function judge() {
  const res = recordAnswer(item, item.pick);
  showView(res.ok ? "ok" : "ng", (root, dark) => {
    fillJudge(root, dark, {
      item, res, no: 0,
      nextLabel: "弱点克服帳へ戻る",
      onNext: () => { location.href = "weak.html"; },
      onRetry: start
    });
    if (res.ok && res.wasMiss) {
      R(root, ["判定完了・一本勝ち", "判定完了 ・ 一本勝ち"], "雪辱を果たした・克服昇格");
    }
  });
}
start();
