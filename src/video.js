// Assemble la vidéo : chaque slide est affichée pendant son audio.
//   couverture -> isti'adha, verset -> sa récitation, fin -> quelques secondes de silence.
// Un verset coupé en deux slides (verset, puis tafsir) partage sa récitation en deux moitiés.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const run = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: ["ignore", "ignore", "pipe"] });

const duration = (file) =>
  parseFloat(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString()
  );

const VIDEO = ["-vf", "fade=t=in:st=0:d=0.4,format=yuv420p", "-c:v", "libx264", "-preset", "veryfast",
  "-tune", "stillimage", "-crf", "20", "-r", "30"];
const AUDIO = ["-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2"];

function segment(image, out, { audio, start = 0, length, pause = 0.4 }) {
  const input = audio
    ? [...(start ? ["-ss", String(start)] : []), ...(length ? ["-t", String(length)] : []), "-i", audio]
    : ["-f", "lavfi", "-t", String(length), "-i", "anullsrc=r=44100:cl=stereo"];
  const pad = audio ? ["-af", `apad=pad_dur=${pause}`] : [];
  run(["-loop", "1", "-framerate", "30", "-i", image, ...input, ...pad, ...VIDEO, ...AUDIO, "-shortest", out]);
}

/**
 * slides : sortie de renderPassage ([{ file, kind, ayah?, part? }])
 * audio  : sortie de downloadRecitation ({ istiadha, ayat })
 */
export function buildVideo(slides, audio, outFile, { endSeconds = 3 } = {}) {
  const tmp = fs.mkdtempSync(path.join(path.dirname(outFile), ".video-"));
  try {
    const segs = [];
    slides.forEach((s, i) => {
      const out = path.join(tmp, `${String(i).padStart(3, "0")}.mp4`);
      if (s.kind === "cover") segment(s.file, out, { audio: audio.istiadha, pause: 0.6 });
      else if (s.kind === "end") segment(s.file, out, { length: endSeconds });
      else if (!s.part) segment(s.file, out, { audio: audio.ayat[s.ayah] });
      else {
        const half = duration(audio.ayat[s.ayah]) / 2;
        segment(s.file, out, s.part === 1
          ? { audio: audio.ayat[s.ayah], length: half, pause: 0 }
          : { audio: audio.ayat[s.ayah], start: half });
      }
      segs.push(out);
    });
    const list = path.join(tmp, "list.txt");
    fs.writeFileSync(list, segs.map((f) => `file '${f}'`).join("\n"));
    run(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", outFile]);
    return outFile;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
