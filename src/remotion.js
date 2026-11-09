// Rendu des vidéos avec Remotion (dossier video/) : une vidéo MP4 + une image de couverture par langue.
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { surahName, surahNameEn } from "./surahs.js";
import { RECITERS } from "./reciters.js";
import { layoutAyah, layoutCover } from "./layout.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const FONT_FILES = {
  "amiri-quran": ["amiri-quran-arabic-400-normal.woff2"],
  amiri: ["amiri-arabic-400-normal.woff2", "amiri-arabic-700-normal.woff2"],
  "eb-garamond": ["eb-garamond-latin-400-normal.woff2", "eb-garamond-latin-600-normal.woff2", "eb-garamond-latin-400-italic.woff2"],
};

// Navigateur : celui de Remotion par défaut, ou un Chrome/Chromium local (REMOTION_BROWSER_EXECUTABLE).
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE || null;

function preparePublicDir(dir, recitation, config) {
  fs.mkdirSync(path.join(dir, "fonts"), { recursive: true });
  fs.mkdirSync(path.join(dir, "audio"), { recursive: true });
  for (const [pkg, files] of Object.entries(FONT_FILES)) {
    for (const f of files) fs.copyFileSync(path.join(ROOT, "node_modules", "@fontsource", pkg, "files", f), path.join(dir, "fonts", f));
  }
  let background = null;
  const bg = config.background && path.join(ROOT, config.background);
  if (bg && fs.existsSync(bg)) {
    background = `background${path.extname(bg)}`;
    fs.copyFileSync(bg, path.join(dir, background));
  }
  const audio = (file) => {
    const name = path.basename(file);
    fs.copyFileSync(file, path.join(dir, "audio", name));
    return `audio/${name}`;
  };
  return {
    background,
    istiadha: audio(recitation.istiadha.file),
    ayat: Object.fromEntries(Object.entries(recitation.ayat).map(([n, a]) => [n, audio(a.file)])),
  };
}

function buildProps(config, passage, recitation, files, lang) {
  const t = config.text[lang];
  const ayat = passage.ayat.map((a) => {
    const r = recitation.ayat[a.ayah];
    const tafsir = lang === "en" ? a.tafsirEn : a.tafsirAr;
    return {
      ayah: a.ayah,
      audio: files.ayat[a.ayah],
      duration: r.duration,
      timed: r.timed,
      words: r.words,
      ...layoutAyah(r.words, tafsir ?? "", lang, r.duration),
    };
  });
  const rec = RECITERS[passage.reciter];
  return {
    lang,
    handle: config.handle,
    background: files.background,
    text: { brand: t.brand, coverMessage: t.coverMessage, tafsirLabel: t.tafsirLabel, endTitle: t.endTitle, endText: t.endText },
    surah: { nameAr: surahName(passage.surah), nameEn: surahNameEn(passage.surah) },
    range: { from: passage.from, to: passage.to },
    part: passage.part ?? null,
    reciter: rec ? { ar: rec.ar, en: rec.en } : null,
    cover: { audio: files.istiadha, duration: recitation.istiadha.duration, ...layoutCover(ayat, config.coverFirstWords) },
    pauses: { cover: 0.6, ayah: 0.4 },
    endSeconds: 3,
    ayat,
  };
}

/**
 * Rend une vidéo par langue. outputs : { [lang]: { video, cover } } (chemins de sortie).
 */
export async function renderVideos(config, passage, recitation, outputs) {
  const publicDir = fs.mkdtempSync(path.join(ROOT, ".remotion-public-"));
  try {
    const files = preparePublicDir(publicDir, recitation, config);
    console.log("📦 Préparation du projet vidéo…");
    const serveUrl = await bundle({ entryPoint: path.join(ROOT, "video", "index.jsx"), publicDir });

    for (const [lang, out] of Object.entries(outputs)) {
      const inputProps = buildProps(config, passage, recitation, files, lang);
      const composition = await selectComposition({ serveUrl, id: "Tafsir", inputProps, browserExecutable });
      // Images isolées (pour vérifier une mise en page sans rendre toute la vidéo).
      for (const f of out.stills ?? []) {
        await renderStill({ composition, serveUrl, inputProps, browserExecutable, frame: f, output: path.join(out.stillsDir, `${lang}-${f}.jpg`), imageFormat: "jpeg" });
      }
      if (out.skipVideo) continue;
      fs.mkdirSync(path.dirname(out.video), { recursive: true });
      let last = -1;
      await renderMedia({
        composition, serveUrl, inputProps, browserExecutable,
        codec: "h264", crf: 20, audioCodec: "aac", outputLocation: out.video,
        onProgress: ({ progress }) => {
          const pct = Math.floor(progress * 10) * 10;
          if (pct !== last) { last = pct; console.log(`   [${lang}] ${pct} %`); }
        },
      });
      if (out.cover) {
        await renderStill({ composition, serveUrl, inputProps, browserExecutable, frame: 15, output: out.cover, imageFormat: "jpeg", jpegQuality: 90 });
      }
      console.log(`✅ [${lang}] ${(composition.durationInFrames / composition.fps).toFixed(1)} s -> ${path.relative(ROOT, out.video)}`);
    }
  } finally {
    fs.rmSync(publicDir, { recursive: true, force: true });
  }
}
