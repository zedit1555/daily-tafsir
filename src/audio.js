// Télécharge les récitations (everyayah.com) : l'isti'adha pour la couverture, puis un fichier par verset.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const BASE = "https://everyayah.com/data";
const pad = (n) => String(n).padStart(3, "0");

// Tous les récitateurs n'ont pas l'isti'adha sur everyayah : on prend celle d'Alafasy en secours.
const ISTIADHA_FALLBACK = "Alafasy_128kbps";

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) return false;
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return true;
}

/** Retourne { istiadha: chemin, ayat: { [n]: chemin } } dans dir. */
export async function downloadRecitation(reciter, { surah, from, to }, dir) {
  fs.mkdirSync(dir, { recursive: true });

  // Priorité : assets/istiadha.mp3 (ton propre fichier) > récitateur choisi > Alafasy.
  let istiadha = path.join(ROOT, "assets", "istiadha.mp3");
  if (!fs.existsSync(istiadha)) {
    istiadha = path.join(dir, "istiadha.mp3");
    const ok =
      (await download(`${BASE}/${reciter}/audhubillah.mp3`, istiadha)) ||
      (await download(`${BASE}/${ISTIADHA_FALLBACK}/audhubillah.mp3`, istiadha));
    if (!ok) throw new Error("Isti'adha introuvable sur everyayah — ajoute assets/istiadha.mp3");
  }

  const ayat = {};
  for (let ayah = from; ayah <= to; ayah++) {
    const file = path.join(dir, `${pad(surah)}${pad(ayah)}.mp3`);
    const url = `${BASE}/${reciter}/${pad(surah)}${pad(ayah)}.mp3`;
    if (!(await download(url, file))) throw new Error(`Récitation introuvable : ${url} — vérifie le nom du récitateur`);
    ayat[ayah] = file;
  }
  return { istiadha, ayat };
}
