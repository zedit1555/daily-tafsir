// Génère les slides du carrousel (1080x1920, JPEG) avec Playwright.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { surahName, surahNameEn, arNum } from "./surahs.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const W = 1080;
const H = 1920;

// Colle les signes de pause (ۖ ۗ ۚ ۛ ۜ) au mot précédent, sinon la police les place mal.
const quranFix = (t) => String(t).replace(/\s+([\u06D6-\u06DC])/g, "$1");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const fontUrl = (pkg, file) => pathToFileURL(path.join(ROOT, "node_modules", "@fontsource", pkg, "files", file)).href;

function backgroundCss(config) {
  const bg = config.background && path.join(ROOT, config.background);
  if (bg && fs.existsSync(bg)) {
    return `background: #0f1c33 url("${pathToFileURL(bg).href}") center / cover no-repeat;`;
  }
  // Fond de secours dessiné en CSS (nuit étoilée) si aucun fond Canva n'est fourni.
  return `background:
    radial-gradient(2px 2px at 12% 18%, #fff8 50%, transparent 51%),
    radial-gradient(2px 2px at 78% 9%, #fff7 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 64% 27%, #fff6 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 30% 7%, #fff6 50%, transparent 51%),
    radial-gradient(2px 2px at 90% 33%, #fff5 50%, transparent 51%),
    radial-gradient(1.5px 1.5px at 6% 40%, #fff5 50%, transparent 51%),
    linear-gradient(180deg, #0c1730 0%, #16284a 55%, #24385c 100%);`;
}

// Arche dorée + montagnes, dessinées uniquement si aucun fond Canva n'est fourni.
function decorSvg(config) {
  const bg = config.background && path.join(ROOT, config.background);
  if (bg && fs.existsSync(bg)) return "";
  return `
  <svg class="decor" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="M70 1840 V560 Q70 300 540 110 Q1010 300 1010 560 V1840" fill="none" stroke="#d9b56a" stroke-width="3" opacity=".8"/>
    <path d="M95 1840 V570 Q95 330 540 145 Q985 330 985 570 V1840" fill="none" stroke="#d9b56a" stroke-width="1.2" opacity=".45"/>
    <circle cx="540" cy="80" r="14" fill="#d9b56a" opacity=".85"/>
    <path d="M0 1640 L180 1500 L330 1590 L520 1430 L700 1580 L860 1480 L1080 1620 V1920 H0 Z" fill="#1f3355" opacity=".9"/>
    <path d="M0 1730 L140 1660 L300 1720 L470 1640 L650 1720 L820 1650 L1080 1730 V1920 H0 Z" fill="#14233d"/>
  </svg>`;
}

function pageHtml(config, inner, lang) {
  return `<!doctype html><html lang="${lang}" dir="${lang === "en" ? "ltr" : "rtl"}"><head><meta charset="utf-8">
<style>
@font-face { font-family: "AmiriQuran"; src: url("${fontUrl("amiri-quran", "amiri-quran-arabic-400-normal.woff2")}") format("woff2"); }
@font-face { font-family: "Amiri"; font-weight: 400; src: url("${fontUrl("amiri", "amiri-arabic-400-normal.woff2")}") format("woff2"); }
@font-face { font-family: "Amiri"; font-weight: 700; src: url("${fontUrl("amiri", "amiri-arabic-700-normal.woff2")}") format("woff2"); }
@font-face { font-family: "Garamond"; font-weight: 400; src: url("${fontUrl("eb-garamond", "eb-garamond-latin-400-normal.woff2")}") format("woff2"); }
@font-face { font-family: "Garamond"; font-weight: 700; src: url("${fontUrl("eb-garamond", "eb-garamond-latin-600-normal.woff2")}") format("woff2"); }
@font-face { font-family: "Garamond"; font-style: italic; src: url("${fontUrl("eb-garamond", "eb-garamond-latin-400-italic.woff2")}") format("woff2"); }
:root { --gold: #d9b56a; --cream: #f3ead7; --muted: #c9c1ae; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${W}px; height: ${H}px; overflow: hidden; }
body { ${backgroundCss(config)} color: var(--cream); font-family: "Amiri", serif; position: relative; }
.decor { position: absolute; inset: 0; width: 100%; height: 100%; }
/* Zone sûre TikTok : rien sous les boutons (droite) ni sous la légende (bas). */
.safe { position: absolute; top: 270px; bottom: 470px; left: 150px; right: 150px;
  display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
.panel { width: 100%; max-height: 100%; background: rgba(10, 20, 40, .55); border: 1px solid rgba(217,181,106,.35);
  border-radius: 28px; padding: 44px 40px; display: flex; flex-direction: column; align-items: center; gap: 26px; overflow: hidden; }
.label { font-size: 30px; color: var(--gold); letter-spacing: 1px; }
.en { font-family: "Garamond", serif; font-style: italic; color: var(--muted); direction: ltr; }
.gold { color: var(--gold); }
.latin { font-family: "Garamond", serif; direction: ltr; }
.tafsir.latin { line-height: 1.5; }
.quran { direction: rtl; }
.divider { width: 220px; height: 2px; background: linear-gradient(90deg, transparent, var(--gold), transparent); flex: none; }
.quran { font-family: "AmiriQuran", serif; line-height: 1.95; }
.tafsir { line-height: 1.75; }
.handle { position: absolute; top: 205px; left: 150px; right: 150px; text-align: center; font-family: "Garamond", serif;
  font-style: italic; color: rgba(243,234,215,.7); font-size: 30px; direction: ltr; }
.row { display: flex; justify-content: space-between; width: 100%; font-size: 32px; color: var(--gold); }
.swipe { font-size: 34px; color: var(--gold); }
</style></head><body>
${decorSvg(config)}
<div class="handle">${esc(config.handle)}</div>
<div class="safe"><div class="panel" id="panel">${inner}</div></div>
<script>
// Réduit toutes les polices [data-fit] ensemble jusqu'à ce que le contenu tienne dans le panneau.
window.__fit = () => {
  const panel = document.getElementById("panel");
  const els = [...document.querySelectorAll("[data-fit]")];
  const base = els.map((e) => +e.dataset.fit);
  const min = els.map((e) => +(e.dataset.min || 22));
  let scale = 1, overflow = true;
  while (scale > 0.2) {
    els.forEach((e, i) => (e.style.fontSize = Math.max(min[i], base[i] * scale) + "px"));
    if (panel.scrollHeight <= panel.clientHeight + 1) { overflow = false; break; }
    if (els.every((e, i) => base[i] * scale <= min[i])) break;
    scale -= 0.025;
  }
  return { overflow, scale };
};
</script></body></html>`;
}

// Libellés selon la langue du post. Le verset reste toujours en arabe.
function labels(lang, p) {
  if (lang === "en") {
    const n = (x) => String(x);
    return {
      surah: (s) => `Surah ${surahNameEn(s)}`,
      range: (a, b) => (a === b ? `Verse ${n(a)}` : `Verses ${n(a)} – ${n(b)}`),
      verse: (a) => `Verse ${n(a)}`,
      part: (x) => `Part ${n(x)}`,
      num: n,
    };
  }
  return {
    surah: (s) => `سورة ${surahName(s)}`,
    range: (a, b) => (a === b ? `الآية ${arNum(a)}` : `الآيات ${arNum(a)} – ${arNum(b)}`),
    verse: (a) => `الآية ${arNum(a)}`,
    part: (x) => `الجزء ${arNum(x)}`,
    num: arNum,
  };
}

function coverInner(config, p, lang) {
  const t = config.text[lang];
  const L = labels(lang, p);
  const first = quranFix(p.ayat[0].text).split(/\s+/).slice(0, config.coverFirstWords).join(" ");
  const en = lang === "en";
  return `
    <div class="label ${en ? "latin" : ""}">${esc(t.brand)}</div>
    <div class="gold ${en ? "latin" : ""}" style="font-weight:700" data-fit="${en ? 64 : 70}" data-min="40">${esc(t.coverMessage)}</div>
    <div class="divider"></div>
    <div class="quran gold" data-fit="150" data-min="90" style="line-height:1.5">سورة ${esc(surahName(p.surah))}</div>
    ${en ? `<div class="latin gold" data-fit="50" data-min="34">${esc(L.surah(p.surah))}</div>` : ""}
    <div class="${en ? "latin" : ""}" data-fit="54" data-min="36">${L.range(p.from, p.to)}</div>
    <div class="quran" data-fit="46" data-min="30" style="color:var(--muted)">﴿ ${esc(first)} … ﴾</div>
    <div class="divider"></div>
    <div class="swipe ${en ? "latin" : ""}">${esc(t.swipe)}${p.part ? ` &nbsp;•&nbsp; ${L.part(p.part)}` : ""}</div>`;
}

function verseInner(config, p, a, idx, mode, lang) {
  const t = config.text[lang];
  const L = labels(lang, p);
  const en = lang === "en";
  const tafsirText = en ? a.tafsirEn : a.tafsirAr;
  const head = `<div class="row ${en ? "latin" : ""}"><span>${esc(L.surah(p.surah))}</span><span>${L.verse(a.ayah)}</span></div>`;
  const ayah = `<div class="quran" data-fit="64" data-min="${mode === "ayah" ? 30 : 36}">${esc(quranFix(a.text))}&nbsp;﴿${arNum(a.ayah)}﴾</div>`;
  const tafsir = `
    <div class="label ${en ? "latin" : ""}">${esc(t.tafsirLabel)}</div>
    <div class="tafsir ${en ? "latin" : ""}" data-fit="${en ? 40 : 46}" data-min="${mode === "tafsir" ? 24 : en ? 32 : 28}">${esc(tafsirText)}</div>`;
  const counter = `<div class="label ${en ? "latin" : ""}" style="font-size:26px;opacity:.8">${L.num(idx + 1)} / ${L.num(p.ayat.length)}</div>`;
  if (mode === "ayah") return head + ayah + counter;
  if (mode === "tafsir") return head + tafsir + counter;
  return head + ayah + `<div class="divider"></div>` + tafsir + counter;
}

function endInner(config, p, lang) {
  const t = config.text[lang];
  const L = labels(lang, p);
  const en = lang === "en";
  const next = p.next
    ? `<div class="${en ? "latin" : ""}" data-fit="46" data-min="30">${esc(L.surah(p.next.surah))} • ${L.range(p.next.from, p.next.to)}</div>`
    : "";
  return `
    <div class="gold ${en ? "latin" : ""}" style="font-weight:700" data-fit="76" data-min="46">${esc(t.endTitle)}</div>
    ${next}
    <div class="divider"></div>
    <div class="${en ? "latin" : ""}" data-fit="46" data-min="30">${esc(t.endText)}</div>
    <div class="gold en" style="font-size:52px">${esc(config.handle)}</div>`;
}

/**
 * Rend un passage en slides JPEG dans outDir. Retourne la liste des fichiers.
 * passage = { surah, from, to, part, ayat: [{ ayah, text, tafsirAr, tafsirEn? }], next: {surah, from, to} | null }
 */
export async function renderPassage(config, passage, outDir, lang = "ar") {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const files = [];
  const tmp = path.join(outDir, "_slide.html");

  const shoot = async (inner, name) => {
    fs.writeFileSync(tmp, pageHtml(config, inner, lang));
    await page.goto(pathToFileURL(tmp).href);
    await page.evaluate(() => document.fonts.ready);
    const fit = await page.evaluate(() => window.__fit());
    if (!fit.overflow) {
      const file = path.join(outDir, name);
      await page.screenshot({ path: file, type: "jpeg", quality: config.jpegQuality ?? 92 });
      files.push(file);
    }
    return fit;
  };

  try {
    await shoot(coverInner(config, passage, lang), "01-cover.jpg");
    let n = 2;
    for (const [i, a] of passage.ayat.entries()) {
      const id = String(n).padStart(2, "0");
      const fit = await shoot(verseInner(config, passage, a, i, "both", lang), `${id}-ayah-${a.ayah}.jpg`);
      if (fit.overflow) {
        // Verset trop long : on sépare verset et tafsir sur deux slides.
        const f1 = await shoot(verseInner(config, passage, a, i, "ayah", lang), `${id}a-ayah-${a.ayah}.jpg`);
        const f2 = await shoot(verseInner(config, passage, a, i, "tafsir", lang), `${id}b-tafsir-${a.ayah}.jpg`);
        if (f1.overflow || f2.overflow) console.warn(`⚠️  Verset ${passage.surah}:${a.ayah} trop long même sur 2 slides — à vérifier.`);
      }
      n++;
    }
    await shoot(endInner(config, passage, lang), `${String(n).padStart(2, "0")}-end.jpg`);
  } finally {
    await browser.close();
    fs.rmSync(tmp, { force: true });
  }
  return files;
}
