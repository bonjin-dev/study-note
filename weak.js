/* =========================================================
   弱点克服帳 ― まちがえた問題（急所）と、克服した問題の一覧
   ========================================================= */
const W = { view: "miss", dojo: "all", sort: "n" };
const TARGET = 2;   // 1日に克服したい数

function entries() {
  const miss = missList();
  const missIds = miss.map((m) => m.id);
  const rv = revengeLog();
  const done = Object.keys(rv).filter((id) => QMAP[id] && missIds.indexOf(id) < 0).map((id) => ({ id, at: rv[id].at, n: rv[id].n, dojo: QMAP[id].dojo }));
  const star = readJSON("keiko-star", {}) || {};
  const starred = Object.keys(star).filter((id) => QMAP[id]).map((id) => {
    const m = miss.find((x) => x.id === id);
    return m ? m : { id, n: 0, dojo: QMAP[id].dojo, done: missIds.indexOf(id) < 0 };
  });
  return { miss, done, starred, rv, star };
}
function filtered(list) {
  const l = list.filter((x) => W.dojo === "all" || x.dojo === W.dojo);
  if (W.sort === "n") l.sort((a, b) => (b.n || 0) - (a.n || 0));
  else l.sort((a, b) => (b.at || 0) - (a.at || 0));
  return l;
}
function swapLook(btn, on, onCls, offCls) {
  btn.className = on ? onCls : offCls;
  btn.setAttribute("aria-pressed", on);
}

function fill(root, dark) {
  const en = entries();
  const missN = en.miss.length, overN = Object.keys(en.rv).length;
  const todayOver = Object.keys(en.rv).filter((id) => dayKey(new Date(en.rv[id].at)) === today()).length;
  const rate = missN + overN ? Math.round(overN / (missN + overN) * 100) : 0;
  R(root, ["現在7巻"], "現在" + missN + "巻");
  R(root, ["目標 2巻"], "目標 " + TARGET + "巻");
  R(root, ["残り1巻", "残り 1巻"], todayOver >= TARGET ? "達成！" : "残り" + (TARGET - todayOver) + "巻");
  R(root, ["68%"], rate + "%");
  const n68 = textNodes(root).find((n) => norm(n.nodeValue) === "68");
  if (n68) n68.nodeValue = String(rate);
  setBar(root, "68%", rate);
  R(root, ["7 巻"], missN + " 巻");
  R(root, ["24 巻"], overN + " 巻");
  linkTo(root, ["一括特訓（ランダム5本組手）"], "kumite.html");

  // 道場の札
  const btns = [...root.querySelectorAll("button")];
  const findBtn = (label) => btns.find((b) => norm(b.textContent).replace(/\(?\d+\)?$/, "").trim() === label || norm(b.textContent).indexOf(label + " (") === 0);
  const dAll = findBtn("すべて"), dWeb = findBtn("Web & DB"), dJava = findBtn("Java 基礎"), dRun = findBtn("Java 実技");
  if (dRun) dRun.remove();
  const base = W.view === "miss" ? en.miss : W.view === "done" ? en.done : en.starred;
  if (dAll && dWeb) {
    const on = dAll.className, off = dWeb.className;
    [[dAll, "all", "すべて"], [dWeb, "coding", "Web & DB"], [dJava, "java", "Java"]].forEach(([b, k, label]) => {
      if (!b) return;
      const n = base.filter((x) => k === "all" || x.dojo === k).length;
      const spans = b.querySelectorAll("span");
      if (spans.length >= 2) {
        spans[spans.length - 2].textContent = label;
        spans[spans.length - 1].textContent = k === "all" ? String(n) : "(" + n + ")";
        if (k === "all" && spans.length === 2) spans[0].textContent = label;
      } else b.textContent = label + " (" + n + ")";
      swapLook(b, W.dojo === k, on, off);
      b.addEventListener("click", () => { W.dojo = k; render(); });
    });
  }
  // 見る範囲の札
  const vMiss = E(root, ["未克服のみ (7)"]), vDone = E(root, ["克服済 (24)"]), vStar = E(root, ["重要星付き"]);
  const vb = [vMiss, vDone, vStar].map((x) => x && x.closest("button"));
  if (vb[0] && vb[1]) {
    const on = vb[0].className, off = vb[1].className;
    R(root, ["未克服のみ (7)"], "未克服のみ (" + missN + ")");
    R(root, ["克服済 (24)"], "克服済 (" + en.done.length + ")");
    R(root, ["重要星付き"], "重要星付き (" + en.starred.length + ")");
    [["miss", vb[0]], ["done", vb[1]], ["star", vb[2]]].forEach(([k, b]) => {
      if (!b) return;
      swapLook(b, W.view === k, on, off);
      b.addEventListener("click", () => { W.view = k; render(); });
    });
  }

  // 一覧
  const it = itemsOf(root, ["【急所】SQL JOIN"], ["【急所】Java Stream"]);
  if (it) {
    const missTpl = it.a.cloneNode(true);
    const doneEl = E(it.list, ["【克服完了】"]);
    const doneTpl = doneEl ? [...it.list.children].find((c) => c.contains(doneEl)).cloneNode(true) : missTpl.cloneNode(true);
    [...it.list.children].forEach((c) => c.remove());
    const list = filtered(base);
    list.forEach((x) => {
      const q = QMAP[x.id], t = topicOf(q);
      const isDone = W.view === "done" || x.done;
      const el = (isDone ? doneTpl : missTpl).cloneNode(true);
      if (!isDone) {
        R(el, ["Web & DB 篇二"], DOJOS[q.dojo].name + " " + q.catName);
        R(el, ["5日前登録"], en.star[x.id] ? "★ 急所の印" : "");
        R(el, ["不覚二回 (正答 1/3)"], "不覚" + kanjiNum(Math.min(x.n || 1, 99)) + "回");
        R(el, ["不覚二回"], "不覚" + kanjiNum(Math.min(x.n || 1, 99)) + "回");
        R(el, ["正答 1/3"], "");
        R(el, ["【急所】SQL JOINにおけるNULL値の落とし穴"], "【急所】" + plainMd(q.q));
        R(el, ["陥穽（かんせい）：落とし穴の構造"], "急所の篇：" + (t ? t.title : q.catName));
        const p = el.querySelector("p");
        const para = hintParas(q)[0];
        if (p) p.innerHTML = md(para || "解説を思い出してから、もう一度挑もう。");
        onClick(el, ["いざ再戦"], () => { location.href = "revenge.html?id=" + encodeURIComponent(x.id); });
        onClick(el, ["指南書"], () => { location.href = DOJOS[q.dojo].href; });
      } else {
        const r = en.rv[x.id];
        R(el, ["CSS & Web組手", "Web & DB 道場"], DOJOS[q.dojo].name);
        R(el, ["昨日克服"], r ? agoText(dayKey(new Date(r.at))) + "克服" : "克服済み");
        R(el, ["3連続正解達成"], r ? "克服" + kanjiNum(Math.min(r.n, 99)) + "回" : "");
        R(el, ["【克服完了】CSS Gridの明示的配置と暗黙トラック"], "【克服完了】" + plainMd(q.q));
        EH(el, ["grid-template-areas", "grid-template"], md(q.e));
        onClick(el, ["記憶の確認"], () => { location.href = "revenge.html?id=" + encodeURIComponent(x.id); });
      }
      // 星（急所の印）
      const starBtn = el.querySelector('[aria-label="星を付ける"]');
      if (starBtn) {
        const ic = starBtn.querySelector(".material-symbols-outlined");
        if (ic) ic.style.fontVariationSettings = en.star[x.id] ? "'FILL' 1" : "'FILL' 0";
        starBtn.addEventListener("click", () => {
          const s = readJSON("keiko-star", {}) || {};
          if (s[x.id]) delete s[x.id]; else s[x.id] = 1;
          writeJSON("keiko-star", s);
          render();
        });
      }
      it.list.appendChild(el);
    });
    if (!list.length) {
      const p = document.createElement("p");
      p.style.cssText = "text-align:center;padding:24px 8px;opacity:.75;font-size:14px;line-height:1.8";
      p.textContent = W.view === "miss" ? "いまは急所（まちがえた問題）がありません。道場や本日の修練問で、新しい型に挑もう。"
        : W.view === "done" ? "まだ克服した問題はありません。まちがえた問題に「いざ再戦」で挑むと、ここに並びます。"
        : "急所の印をつけた問題はありません。問題の画面の「急所に印」で印をつけられます。";
      it.list.appendChild(p);
    }
  }
  // 下のボタン
  R(root, ["過去の克服履歴（全24件）を見る"], "過去の克服履歴（全" + en.done.length + "件）を見る");
  onClick(root, ["過去の克服履歴"], () => { W.view = "done"; render(); });
  R(root, ["巻物の並び替え"], W.sort === "n" ? "並び替え：不覚の多い順" : "並び替え：新しい順");
  onClick(root, ["並び替え："], () => { W.sort = W.sort === "n" ? "at" : "n"; render(); });
  const tidy = E(root, ["克服巻物の整理"]);
  if (tidy) {
    const a = tidy.closest("a, button") || tidy;
    const sep = a.previousElementSibling;
    if (sep && sep.textContent.trim() === "|") sep.remove();
    a.remove();
  }
}
function render() {
  const y = window.scrollY;
  showView("list", fill);
  window.scrollTo(0, y);
}
render();
