// Prépare l'audio et le minutage mot par mot de chaque verset.
//
// Sources, dans l'ordre :
//   1. data/timings/<récitateur>/<sourate>.json  (fichier local, même format que quran.com)
//   2. github.com/baklarrrr/quran-timings        (Yasser Al-Dosari, Maher Al-Muaiqly, Nasser Al-Qatami, Islam Sobhi ; CC BY 4.0)
//   3. minutages officiels de quran.com          (Alafasy, Sudais, Shuraim, Husary… selon disponibilité)
//   4. everyayah.com, un MP3 par verset          (sans minutage : pas de surlignage mot par mot)
// Les sources 1 à 3 donnent l'audio de la sourate entière : on y découpe chaque verset.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { RECITERS } from "./reciters.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const QT_RAW = "https://raw.githubusercontent.com/baklarrrr/quran-timings/main";
const QC_API = "https://api.quran.com/api/v4";
const EVERYAYAH = "https://everyayah.com/data";
const ISTIADHA_FALLBACK = "Alafasy_128kbps";
const pad = (n) => String(n).padStart(3, "0");

const ffmpeg = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: ["ignore", "ignore", "pipe"] });
const duration = (file) =>
  parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return res.json();
}

async function download(url, dest) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return true;
  const res = await fetch(url);
  if (!res.ok) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  fs.writeFileSync(tmp, Buffer.from(await res.arrayBuffer()));
  fs.renameSync(tmp, dest);
  return true;
}

// ---------- Texte mot par mot (positions identiques à quran.com) ----------

function splitWords(text) {
  // Les signes de pause (ۖ ۗ ۚ …) sont collés au mot précédent, comme sur quran.com.
  const out = [];
  for (const tok of String(text).trim().split(/\s+/)) {
    if (/^[ۖ-ۭ]+$/.test(tok) && out.length) out[out.length - 1] += tok;
    else out.push(tok);
  }
  return out;
}

async function quranWords(surah, ayah, fallbackText) {
  try {
    const json = await getJson(`${QC_API}/verses/by_key/${surah}:${ayah}?words=true&word_fields=text_uthmani`);
    const words = (json.verse?.words ?? [])
      .filter((w) => w.char_type_name === "word")
      .sort((a, b) => a.position - b.position)
      .map((w) => w.text_uthmani);
    if (words.length) return words;
  } catch {
    /* repli sur le découpage du texte */
  }
  return splitWords(fallbackText);
}

// ---------- Sources de minutage ----------

let qtIndex;
async function fromQuranTimings(rec, surah) {
  if (!rec.qt) return null;
  qtIndex ??= await getJson(`${QT_RAW}/reciters.json`).catch(() => ({ reciters: [] }));
  const entry = qtIndex.reciters.find((r) => r.id === rec.qt);
  if (!entry?.chapters?.includes(surah)) return null;
  const data = await getJson(`${QT_RAW}/timings/${rec.qt}/${surah}.json`);
  return { source: `quran-timings (${entry.name}, CC BY 4.0)`, ...data.audio_file };
}

let qcReciters;
async function fromQuranCom(rec, surah) {
  if (!rec.qc) return null;
  qcReciters ??= (await getJson(`${QC_API}/resources/chapter_reciters`).catch(() => ({ reciters: [] }))).reciters ?? [];
  const match = qcReciters.find((r) => rec.qc.test(`${r.name ?? ""} ${r.style?.name ?? r.style ?? ""} ${r.translated_name?.name ?? ""}`));
  if (!match) return null;
  const json = await getJson(`${QC_API}/chapter_recitations/${match.id}/${surah}?segments=true`);
  const file = json.audio_file;
  if (!file?.audio_url || !file?.timestamps?.length) return null;
  return { source: `quran.com (${match.name})`, ...file };
}

function fromLocal(key, surah) {
  const file = path.join(ROOT, "data", "timings", key, `${surah}.json`);
  if (!fs.existsSync(file)) return null;
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return { source: `fichier local ${path.relative(ROOT, file)}`, ...(data.audio_file ?? data) };
}

/** Mots avec leur début en secondes (relatif au début du verset). */
function wordTimes(words, segments, from, clipDuration) {
  const starts = new Array(words.length).fill(null);
  for (const seg of segments ?? []) {
    if (!Array.isArray(seg) || seg.length !== 3) continue;
    const [pos, start] = seg;
    if (pos >= 1 && pos <= words.length && starts[pos - 1] === null) starts[pos - 1] = Math.max(0, (start - from) / 1000);
  }
  const known = starts.filter((s) => s !== null).length;
  if (known < Math.ceil(words.length * 0.8)) return null; // minutage trop incomplet : on ne surligne pas
  // Mots sans minutage : même début que le précédent ; débuts toujours croissants.
  let last = 0;
  return words.map((t, i) => {
    let s = starts[i] ?? last;
    s = Math.min(Math.max(s, last), clipDuration);
    last = s;
    return { t, s };
  });
}

function estimatedTimes(words, clipDuration) {
  const total = words.reduce((n, w) => n + w.length + 1, 0);
  let before = 0;
  return words.map((t) => {
    const s = (clipDuration * 0.95 * before) / total;
    before += t.length + 1;
    return { t, s };
  });
}

// ---------- Préparation ----------

/**
 * Retourne { source, istiadha: { file, duration }, ayat: { [n]: { file, duration, words, timed } } }.
 * Les fichiers audio (WAV) sont écrits dans dir ; l'audio des sourates est mis en cache dans cacheDir.
 */
export async function prepareRecitation(reciterKey, passage, dir, cacheDir = path.join(ROOT, ".cache", "audio")) {
  const rec = RECITERS[reciterKey];
  if (!rec) throw new Error(`Récitateur inconnu : ${reciterKey} (voir src/reciters.js)`);
  const { surah, from, to } = passage;
  fs.mkdirSync(dir, { recursive: true });

  // Isti'adha : assets/istiadha.mp3 > everyayah du récitateur > Alafasy
  let istSrc = path.join(ROOT, "assets", "istiadha.mp3");
  if (!fs.existsSync(istSrc)) {
    istSrc = path.join(cacheDir, `istiadha-${rec.everyayah ?? ISTIADHA_FALLBACK}.mp3`);
    const ok =
      (rec.everyayah && (await download(`${EVERYAYAH}/${rec.everyayah}/audhubillah.mp3`, istSrc))) ||
      (await download(`${EVERYAYAH}/${ISTIADHA_FALLBACK}/audhubillah.mp3`, (istSrc = path.join(cacheDir, "istiadha-fallback.mp3"))));
    if (!ok) throw new Error("Isti'adha introuvable — ajoute assets/istiadha.mp3");
  }
  const istiadha = path.join(dir, "istiadha.wav");
  ffmpeg(["-i", istSrc, "-ar", "44100", "-ac", "2", istiadha]);

  // Source de minutage
  let timed = null;
  for (const get of [() => fromLocal(reciterKey, surah), () => fromQuranTimings(rec, surah), () => fromQuranCom(rec, surah)]) {
    try {
      timed = await get();
    } catch (e) {
      console.warn(`⚠️  Source de minutage ignorée : ${e.message}`);
    }
    if (timed) break;
  }

  let surahAudio = null;
  if (timed) {
    surahAudio = path.join(cacheDir, reciterKey, `${pad(surah)}${path.extname(new URL(timed.audio_url).pathname) || ".mp3"}`);
    if (!(await download(timed.audio_url, surahAudio))) {
      console.warn(`⚠️  Audio introuvable (${timed.audio_url}) : passage sans minutage.`);
      timed = null;
    }
  }
  if (!timed && !rec.everyayah) throw new Error(`Aucune source audio pour ${rec.en} sur la sourate ${surah}`);
  console.log(`🎧 ${rec.en} — ${timed ? `minutage mot par mot : ${timed.source}` : "everyayah.com (sans minutage)"}`);

  const ayat = {};
  for (let ayah = from; ayah <= to; ayah++) {
    const file = path.join(dir, `${pad(surah)}${pad(ayah)}.wav`);
    const words = await quranWords(surah, ayah, passage.ayat.find((a) => a.ayah === ayah)?.text ?? "");
    const ts = timed?.timestamps?.find((t) => t.verse_key === `${surah}:${ayah}`);

    if (ts && ts.timestamp_to > ts.timestamp_from) {
      ffmpeg(["-ss", (ts.timestamp_from / 1000).toFixed(3), "-to", (ts.timestamp_to / 1000).toFixed(3), "-i", surahAudio,
        "-ar", "44100", "-ac", "2", file]);
      const d = duration(file);
      const times = ts.left_out ? null : wordTimes(words, ts.segments, ts.timestamp_from, d);
      ayat[ayah] = { file, duration: d, words: times ?? estimatedTimes(words, d), timed: Boolean(times) };
    } else {
      if (!rec.everyayah) throw new Error(`Verset ${surah}:${ayah} absent de la source ${timed?.source}`);
      const mp3 = path.join(cacheDir, rec.everyayah, `${pad(surah)}${pad(ayah)}.mp3`);
      const url = `${EVERYAYAH}/${rec.everyayah}/${pad(surah)}${pad(ayah)}.mp3`;
      if (!(await download(url, mp3))) throw new Error(`Récitation introuvable : ${url}`);
      ffmpeg(["-i", mp3, "-ar", "44100", "-ac", "2", file]);
      const d = duration(file);
      ayat[ayah] = { file, duration: d, words: estimatedTimes(words, d), timed: false };
    }
  }
  return { source: timed?.source ?? "everyayah.com", istiadha: { file: istiadha, duration: duration(istiadha) }, ayat };
}
