// Charge les polices depuis le dossier public du rendu, et bloque le rendu tant qu'elles ne sont pas prêtes.
import { continueRender, delayRender, staticFile } from "remotion";

const FONTS = [
  { family: "AmiriQuran", file: "fonts/amiri-quran-arabic-400-normal.woff2", weight: "400" },
  { family: "Amiri", file: "fonts/amiri-arabic-400-normal.woff2", weight: "400" },
  { family: "Amiri", file: "fonts/amiri-arabic-700-normal.woff2", weight: "700" },
  { family: "Garamond", file: "fonts/eb-garamond-latin-400-normal.woff2", weight: "400" },
  { family: "Garamond", file: "fonts/eb-garamond-latin-600-normal.woff2", weight: "700" },
  { family: "Garamond", file: "fonts/eb-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
];

let loaded = false;
export function loadFonts() {
  if (loaded) return;
  loaded = true;
  const handle = delayRender("Chargement des polices");
  Promise.all(
    FONTS.map(async (f) => {
      const face = new FontFace(f.family, `url(${staticFile(f.file)}) format("woff2")`, {
        weight: f.weight,
        style: f.style ?? "normal",
      });
      await face.load();
      document.fonts.add(face);
    })
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
}
