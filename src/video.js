// Assemble la vidéo : chaque slide est affichée pendant son audio.
//   couverture -> isti'adha, verset -> sa récitation, fin -> quelques secondes de silence.
//
// Méthode (sans décalage ni coupure aux transitions) :
//   1. on construit UNE piste audio continue en WAV (PCM), morceau par morceau, avec les pauses ;
//   2. on mesure la durée exacte de chaque morceau ;
//   3. on affiche chaque image pendant exactement cette durée, puis on encode image + audio en une seule passe.
// Un verset coupé en deux slides (verset, puis tafsir) garde sa récitation intacte : seule l'image change à mi-chemin.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SR = 44100;
const run = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: ["ignore", "ignore", "pipe"] });

const duration = (file) =>
  parseFloat(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString()
  );

// Décode un MP3 en WAV PCM (même format pour tous les morceaux) + silence à la fin.
function toWav(src, out, pause) {
  run(["-i", src, "-ar", String(SR), "-ac", "2", "-af", `apad=pad_dur=${pause}`, "-c:a", "pcm_s16le", out]);
  return out;
}

function silence(out, seconds) {
  run(["-f", "lavfi", "-t", String(seconds), "-i", `anullsrc=r=${SR}:cl=stereo`, "-c:a", "pcm_s16le", out]);
  return out;
}

/**
 * slides : sortie de renderPassage ([{ file, kind, ayah?, part? }])
 * audio  : sortie de downloadRecitation ({ istiadha, ayat })
 */
export function buildVideo(slides, audio, outFile, { endSeconds = 3, coverPause = 0.6, ayahPause = 0.5 } = {}) {
  const tmp = fs.mkdtempSync(path.join(path.dirname(outFile), ".video-"));
  try {
    const wavs = [];
    const shots = []; // { image, seconds }
    let n = 0;
    const piece = (make) => {
      const f = path.join(tmp, `${String(n++).padStart(3, "0")}.wav`);
      make(f);
      wavs.push(f);
      return duration(f);
    };

    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      if (s.kind === "cover") {
        shots.push({ image: s.file, seconds: piece((f) => toWav(audio.istiadha, f, coverPause)) });
      } else if (s.kind === "end") {
        shots.push({ image: s.file, seconds: piece((f) => silence(f, endSeconds)) });
      } else if (!s.part) {
        shots.push({ image: s.file, seconds: piece((f) => toWav(audio.ayat[s.ayah], f, ayahPause)) });
      } else if (s.part === 1) {
        // Verset long : une seule récitation pour les deux images (verset, puis tafsir).
        const next = slides[i + 1];
        const total = piece((f) => toWav(audio.ayat[s.ayah], f, ayahPause));
        const recitation = total - ayahPause;
        shots.push({ image: s.file, seconds: recitation / 2 });
        if (next?.part === 2) {
          shots.push({ image: next.file, seconds: total - recitation / 2 });
          i++;
        }
      }
    }

    // 1. Piste audio continue
    const audioList = path.join(tmp, "audio.txt");
    fs.writeFileSync(audioList, wavs.map((f) => `file '${f}'`).join("\n"));
    const fullAudio = path.join(tmp, "full.wav");
    run(["-f", "concat", "-safe", "0", "-i", audioList, "-c", "copy", fullAudio]);

    // 2. Images avec durée exacte (la dernière est répétée, comme l'exige le format concat)
    const imgList = path.join(tmp, "images.txt");
    const lines = shots.flatMap((s) => [`file '${s.image}'`, `duration ${s.seconds.toFixed(4)}`]);
    lines.push(`file '${shots.at(-1).image}'`);
    fs.writeFileSync(imgList, lines.join("\n"));

    // 3. Encodage unique image + audio
    run([
      "-f", "concat", "-safe", "0", "-i", imgList,
      "-i", fullAudio,
      "-map", "0:v", "-map", "1:a",
      "-vf", "fps=30,format=yuv420p", "-fps_mode", "cfr",
      "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-crf", "20",
      "-c:a", "aac", "-b:a", "160k",
      "-t", duration(fullAudio).toFixed(3),
      "-movflags", "+faststart", outFile,
    ]);
    return outFile;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
