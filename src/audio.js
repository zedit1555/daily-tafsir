// Télécharge la récitation de chaque verset (everyayah.com) et les assemble en un seul MP3,
// à ajouter comme son au carrousel dans TikTok (ou à réutiliser pour une vidéo).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const pad = (n) => String(n).padStart(3, "0");

export async function buildRecitation(reciter, { surah, from, to }, outFile) {
  const tmp = fs.mkdtempSync(path.join(path.dirname(outFile), ".audio-"));
  try {
    const parts = [];
    for (let ayah = from; ayah <= to; ayah++) {
      const url = `https://everyayah.com/data/${reciter}/${pad(surah)}${pad(ayah)}.mp3`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Récitation introuvable (${res.status}) : ${url} — vérifie le nom du récitateur`);
      const file = path.join(tmp, `${pad(ayah)}.mp3`);
      fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      parts.push(file);
    }
    try {
      const list = path.join(tmp, "list.txt");
      fs.writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", outFile], { stdio: "ignore" });
    } catch {
      // Sans ffmpeg : concaténation simple des fichiers MP3 (même récitateur, même format).
      fs.writeFileSync(outFile, Buffer.concat(parts.map((p) => fs.readFileSync(p))));
    }
    return outFile;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
