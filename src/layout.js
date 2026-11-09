// Mise en page des scènes « verset » : découpe le verset et le tafsir en pages qui tiennent dans le panneau,
// et choisit les tailles de police. Estimation par nombre de caractères, vérifiée visuellement sur des cas extrêmes.

const INNER_W = 712; // largeur utile du panneau (780 - marges)
const BODY_H = 820; // hauteur partagée entre le verset et le tafsir (panneau - en-tête, séparateurs, compteur)

const VERSE_SIZE = 64;
const VERSE_LH = 1.9;
const VERSE_LINE_CHARS = 34; // caractères par ligne à 64 px (Amiri Quran, avec diacritiques)
const VERSE_MAX_LINES = 3;

const TAFSIR = {
  ar: { cw: 0.33, lh: 1.75, max: 52, min: 36 },
  en: { cw: 0.42, lh: 1.45, max: 48, min: 33 },
};

const len = (s) => [...s].length;

/** Pages de mots : [{ start, end }] (indices de mots, end exclu). */
export function versePages(words) {
  const budget = VERSE_LINE_CHARS * VERSE_MAX_LINES - 4;
  const pages = [];
  let start = 0;
  let chars = 0;
  words.forEach((w, i) => {
    const c = len(w.t) + 1;
    if (i > start && chars + c > budget) {
      pages.push({ start, end: i });
      start = i;
      chars = 0;
    }
    chars += c;
  });
  pages.push({ start, end: words.length });
  return pages;
}

function verseBox(words, pages) {
  const lines = Math.max(
    ...pages.map((p) => {
      const chars = words.slice(p.start, p.end).reduce((n, w) => n + len(w.t) + 1, 0) + 6;
      return Math.ceil(chars / VERSE_LINE_CHARS);
    })
  );
  return Math.min(lines, VERSE_MAX_LINES) * VERSE_SIZE * VERSE_LH;
}

const capacity = (lang, size, height) => {
  const { cw, lh } = TAFSIR[lang];
  return Math.floor(INNER_W / (cw * size)) * Math.floor(height / (lh * size));
};

// Coupe aux fins de phrase, puis aux virgules, puis entre les mots si besoin.
function splitText(text, budget) {
  const sentences = text.match(/[^.!?؟؛]+[.!?؟؛]*\s*/g) ?? [text];
  const pieces = [];
  for (const s of sentences) {
    if (len(s) <= budget) { pieces.push(s); continue; }
    const parts = s.match(/[^,،]+[,،]*\s*/g) ?? [s];
    for (const part of parts) {
      if (len(part) <= budget) { pieces.push(part); continue; }
      let cur = "";
      for (const w of part.split(/\s+/)) {
        if (cur && len(cur) + len(w) + 1 > budget) { pieces.push(cur); cur = ""; }
        cur += (cur ? " " : "") + w;
      }
      if (cur) pieces.push(cur);
    }
  }
  const pages = [];
  let cur = "";
  for (const piece of pieces) {
    if (cur && len(cur) + len(piece) > budget) { pages.push(cur.trim()); cur = ""; }
    cur += piece;
  }
  if (cur.trim()) pages.push(cur.trim());
  return pages;
}

/**
 * words : [{ t, s }] (s = début du mot en secondes dans l'audio du verset)
 * Retourne { pages, verseSize, verseBox, tafsirSize, tafsirPages: [{ text, at }] }.
 */
export function layoutAyah(words, tafsir, lang, duration) {
  const pages = versePages(words);
  const box = verseBox(words, pages);
  const height = BODY_H - box;
  const { max, min } = TAFSIR[lang];
  const total = len(tafsir);

  // Une seule page si possible, avec la plus grande police qui tient.
  for (let size = max; size >= min; size--) {
    if (total <= capacity(lang, size, height) * 0.9) {
      return { pages, verseSize: VERSE_SIZE, verseBox: box, tafsirSize: size, tafsirBox: 0, tafsirPages: [{ text: tafsir, at: 0 }] };
    }
  }
  // Sinon plusieurs pages, affichées au prorata de leur longueur pendant la récitation.
  const size = min + 2;
  const texts = splitText(tafsir, Math.floor(capacity(lang, size, height) * 0.85));
  let before = 0;
  const tafsirPages = texts.map((text) => {
    const at = (duration * before) / total;
    before += len(text);
    return { text, at };
  });
  // Hauteur fixe pour toutes les pages du tafsir de ce verset : le panneau ne bouge pas d'une page à l'autre.
  const { cw, lh } = TAFSIR[lang];
  const perLine = Math.floor(INNER_W / (cw * size));
  const lines = Math.max(...texts.map((t) => Math.ceil(len(t) / perLine)));
  const tafsirBox = Math.min(height, lines * lh * size);
  return { pages, verseSize: VERSE_SIZE, verseBox: box, tafsirSize: size, tafsirBox, tafsirPages };
}

/** Couverture : texte complet des versets s'il tient, sinon les premiers mots. */
export function layoutCover(ayat, firstWords = 5) {
  const chars = ayat.reduce((n, a) => n + a.words.reduce((m, w) => m + len(w.t) + 1, 0) + 5, 0);
  for (const size of [50, 46, 42, 38]) {
    const perLine = Math.floor(INNER_W / (0.45 * size));
    const lines = Math.floor(420 / (1.9 * size));
    if (chars <= perLine * lines * 0.92) return { versesFull: true, versesSize: size, firstWords: "" };
  }
  return {
    versesFull: false,
    versesSize: 46,
    firstWords: ayat[0].words.slice(0, firstWords).map((w) => w.t).join(" "),
  };
}
