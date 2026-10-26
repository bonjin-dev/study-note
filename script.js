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