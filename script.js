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

const themeBtn = document.getElementById("themeBtn");
const savedTheme=localStorage.getItem("theme");
if (savedTheme) {
  document.documentElement.setAttribute("data-theme", savedTheme);
  if (savedTheme === "dark") {
    themeBtn.textContent = "☀ ライト";
  }
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
  if (next === "dark") {
    themeBtn.textContent = "☀ ライト";
  } else {
    themeBtn.textContent = "🌙 ダーク";
  }
});

