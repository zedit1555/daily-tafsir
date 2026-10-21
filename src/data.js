// Récupère le texte des versets et le tafsir.
//
// Texte coranique : API quran.com (texte uthmani officiel), ou fichier local data/quran/{surah}.json.
// Tafsir (arabe et anglais) : dans cet ordre de priorité
//   1. fichier local data/tafsir/{ar|en}/{surah}.json  ->  { "142": "texte...", ... }
//   2. API Al-Mukhtasar (admin.mokhtasr.com) : MUKHTASAR_EMAIL, MUKHTASAR_PASSWORD, BOOK_AR, BOOK_EN
//   3. autre API via TAFSIR_AR_URL / TAFSIR_EN_URL (gabarit avec {surah} et {ayah})
//      + TAFSIR_AR_PATH / TAFSIR_EN_PATH : chemin du champ texte dans la réponse JSON (ex. "data.text")
//   4. TAFSIR_FALLBACK=muyassar : Tafsir al-Muyassar via quran.com (dépannage seulement)
import fs from "node:fs";
import path from "node:path";
import { ayahCount } from "./surahs.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const readJson = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null);

const getPath = (obj, p) =>
  p.split(".").filter(Boolean).reduce((o, k) => (o == null ? o : Array.isArray(o) ? o[+k] : o[k]), obj);

// Retire les balises HTML (<br>, <p>…) et entités renvoyées par certaines API.
const clean = (s) =>
  String(s ?? "")
    .replace(/<sup[^>]*>.*?<\/sup>/gs, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`);
  return res.json();
}

async function quranText(surah, ayah) {
  const local = readJson(path.join(ROOT, "data", "quran", `${surah}.json`));
  if (local?.[ayah]) return local[ayah];
  const json = await getJson(`https://api.quran.com/api/v4/quran/verses/uthmani?verse_key=${surah}:${ayah}`);
  const text = json.verses?.[0]?.text_uthmani;
  if (!text) throw new Error(`Texte introuvable pour ${surah}:${ayah}`);
  return text;
}

// API Al-Mukhtasar (admin.mokhtasr.com) : connexion une fois, puis un appel par verset et par langue.
// Mêmes secrets que le repo tafsir-daily-renderer : MUKHTASAR_EMAIL, MUKHTASAR_PASSWORD, BOOK_AR, BOOK_EN.
const MUKHTASAR_API = "https://admin.mokhtasr.com/api/v1";
let mukhtasarToken = null;

async function mukhtasarLogin() {
  if (mukhtasarToken) return mukhtasarToken;
  const qs = new URLSearchParams({ email: process.env.MUKHTASAR_EMAIL, password: process.env.MUKHTASAR_PASSWORD });
  const res = await fetch(`${MUKHTASAR_API}/app/login?${qs}`, { method: "POST", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Connexion Mukhtasar refusée (HTTP ${res.status})`);
  mukhtasarToken = (await res.json())?.data?.token;
  if (!mukhtasarToken) throw new Error("Token introuvable dans la réponse de connexion Mukhtasar (data.token)");
  return mukhtasarToken;
}

async function mukhtasarTafsir(lang, surah, ayah) {
  const token = await mukhtasarLogin();
  const qs = new URLSearchParams({ lang, sura: surah, aya: ayah, books: process.env[`BOOK_${lang.toUpperCase()}`] });
  const res = await fetch(`${MUKHTASAR_API}/book-contents?${qs}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Mukhtasar HTTP ${res.status} pour ${lang} ${surah}:${ayah}`);
  const text = clean((await res.json())?.data?.[0]?.books?.[0]?.text);
  if (!text) throw new Error(`Tafsir Mukhtasar vide pour ${lang} ${surah}:${ayah}`);
  return text;
}

async function tafsir(lang, surah, ayah) {
  const local = readJson(path.join(ROOT, "data", "tafsir", lang, `${surah}.json`));
  if (local?.[ayah]) return clean(local[ayah]);

  const L = lang.toUpperCase();
  if (process.env.MUKHTASAR_EMAIL && process.env[`BOOK_${L}`]) return mukhtasarTafsir(lang, surah, ayah);

  const tpl = process.env[`TAFSIR_${L}_URL`];
  if (tpl) {
    const json = await getJson(tpl.replaceAll("{surah}", surah).replaceAll("{ayah}", ayah));
    const text = clean(getPath(json, process.env[`TAFSIR_${L}_PATH`] || "text"));
    if (!text) throw new Error(`Tafsir vide pour ${surah}:${ayah} — vérifie TAFSIR_${L}_PATH`);
    return text;
  }

  if (lang === "ar" && process.env.TAFSIR_FALLBACK === "muyassar") {
    const json = await getJson(`https://api.quran.com/api/v4/tafsirs/16/by_ayah/${surah}:${ayah}`);
    return clean(json.tafsir?.text);
  }

  throw new Error(`Aucune source de tafsir pour ${surah}:${ayah} (ajoute data/tafsir/${lang}/${surah}.json ou TAFSIR_${L}_URL)`);
}

/** Construit le passage complet pour une plage de versets. */
export async function loadPassage(config, { surah, from, to, part }) {
  const ayat = [];
  for (let ayah = from; ayah <= to; ayah++) {
    ayat.push({
      ayah,
      text: await quranText(surah, ayah),
      tafsirAr: config.languages.includes("ar") ? await tafsir("ar", surah, ayah) : null,
      tafsirEn: config.languages.includes("en") ? await tafsir("en", surah, ayah) : null,
    });
  }
  return { surah, from, to, part, ayat, next: nextRange(config, surah, to + 1) };
}

/** Plage suivante à partir de (surah, ayah), sans dépasser la fin de la sourate. */
export function nextRange(config, surah, ayah) {
  if (ayah > ayahCount(surah)) {
    if (surah >= 114) return null;
    surah += 1;
    ayah = 1;
  }
  const remaining = ayahCount(surah) - ayah + 1;
  let n = Math.min(config.ayatPerPost, remaining);
  // Évite de laisser 1 ou 2 versets orphelins en fin de sourate.
  if (remaining - n > 0 && remaining - n <= 2 && remaining <= config.maxAyatPerPost) n = remaining;
  return { surah, from: ayah, to: ayah + n - 1 };
}
