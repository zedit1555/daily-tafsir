#!/usr/bin/env node
// Usage :
//   node src/cli.js generate --surah 2 --from 142 --to 145 [--part 23] [--lang ar|en]  -> out/2-142-145-{lang}/
//   node src/cli.js demo        -> out/demo-{lang}/ (sans réseau)
//   node src/cli.js daily       -> génère le prochain passage (un post par langue) dans public/posts/
//   node src/cli.js index       -> régénère public/index.html (galerie des posts)
//   node src/cli.js publish     -> envoie les posts de public/latest.json à TikTok
import fs from "node:fs";
import path from "node:path";
import { renderPassage } from "./render.js";
import { loadPassage, nextRange } from "./data.js";
import { surahName, surahNameEn, arNum } from "./surahs.js";
import { refreshAccessToken, publishCarousel, waitForStatus } from "./tiktok.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const config = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8"));
const [cmd, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(
  rest.flatMap((v, i, a) => (v.startsWith("--") ? [[v.slice(2), a[i + 1]]] : []))
);
const langs = args.lang ? [args.lang] : config.languages;

function caption(p, lang) {
  const t = config.text[lang];
  if (lang === "en") {
    const range = p.from === p.to ? `Verse ${p.from}` : `Verses ${p.from}–${p.to}`;
    const title = `Surah ${surahNameEn(p.surah)} • ${range}`;
    return { title, description: `${t.coverMessage} 🌙\n${title}\n\n${t.hashtags.join(" ")}` };
  }
  const range = p.from === p.to ? `الآية ${arNum(p.from)}` : `الآيات ${arNum(p.from)}–${arNum(p.to)}`;
  const title = `سورة ${surahName(p.surah)} • ${range}`;
  return { title, description: `${t.coverMessage} 🌙\n${title}\n\n${t.hashtags.join(" ")}` };
}

async function build(passage, lang, outDir) {
  const files = await renderPassage(config, passage, outDir, lang);
  const cap = caption(passage, lang);
  fs.writeFileSync(path.join(outDir, "caption.txt"), `${cap.title}\n\n${cap.description}\n`);
  console.log(`✅ [${lang}] ${files.length} slides -> ${path.relative(ROOT, outDir)}`);
  return { lang, files, ...cap };
}

// Page d'accueil GitHub Pages : galerie des derniers posts, pour télécharger les images depuis le téléphone.
function buildIndex() {
  const postsDir = path.join(ROOT, "public", "posts");
  const dirs = fs.readdirSync(postsDir).filter((d) => !d.startsWith("."))
    .sort((a, b) => b.slice(0, -3).localeCompare(a.slice(0, -3)) || a.localeCompare(b)); // récent d'abord, arabe puis anglais
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const sections = dirs.map((d) => {
    const imgs = fs.readdirSync(path.join(postsDir, d)).filter((f) => f.endsWith(".jpg")).sort();
    const capPath = path.join(postsDir, d, "caption.txt");
    const cap = fs.existsSync(capPath) ? fs.readFileSync(capPath, "utf8").trim() : "";
    return `<section><h2>${esc(d)}</h2>
<details><summary>Légende</summary><pre>${esc(cap)}</pre></details>
<div class="grid">${imgs.map((f) => `<a href="posts/${d}/${f}" download><img loading="lazy" src="posts/${d}/${f}" alt="${f}"></a>`).join("")}</div></section>`;
  });
  fs.writeFileSync(path.join(ROOT, "public", "index.html"), `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Daily Tafsir</title>
<style>body{margin:0;padding:16px;background:#0f1c33;color:#f3ead7;font-family:system-ui,sans-serif}
h1{color:#d9b56a;font-size:22px}h2{font-size:16px;color:#d9b56a;margin:24px 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
img{width:100%;border-radius:8px;display:block}pre{white-space:pre-wrap;background:#16284a;padding:12px;border-radius:8px}
summary{cursor:pointer;color:#c9c1ae}</style></head><body>
<h1>Daily Tafsir — derniers carrousels</h1><p>Touche une image pour la télécharger.</p>
${sections.join("\n")}</body></html>`);
}

async function main() {
  if (cmd === "index") return buildIndex();

  if (cmd === "generate") {
    const surah = +args.surah, from = +args.from, to = +(args.to ?? args.from);
    if (!surah || !from) throw new Error("Usage : generate --surah 2 --from 142 --to 145");
    const passage = await loadPassage({ ...config, languages: langs }, { surah, from, to, part: args.part ? +args.part : null });
    for (const lang of langs) await build(passage, lang, path.join(ROOT, "out", `${surah}-${from}-${to}-${lang}`));
    return;
  }

  if (cmd === "demo") {
    const passage = JSON.parse(fs.readFileSync(path.join(ROOT, "sample", "passage.json"), "utf8"));
    for (const lang of langs) await build(passage, lang, path.join(ROOT, "out", `demo-${lang}`));
    return;
  }

  if (cmd === "daily") {
    const statePath = path.join(ROOT, "state.json");
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const range = nextRange(config, state.surah, state.nextAyah);
    if (!range) return console.log("🎉 Coran terminé, rien à générer.");
    const passage = await loadPassage(config, { ...range, part: state.part });
    const id = `${String(state.part).padStart(4, "0")}-${range.surah}-${range.from}-${range.to}`;

    const posts = [];
    for (const lang of config.languages) {
      const dir = `${id}-${lang}`;
      const post = await build(passage, lang, path.join(ROOT, "public", "posts", dir));
      posts.push({ ...post, files: post.files.map((f) => `posts/${dir}/${path.basename(f)}`) });
    }
    fs.writeFileSync(path.join(ROOT, "public", "latest.json"), JSON.stringify({ id, posts }, null, 2));

    // Ne garde que les 7 derniers jours de posts pour ne pas alourdir le repo.
    const postsDir = path.join(ROOT, "public", "posts");
    const dirs = fs.readdirSync(postsDir).filter((d) => !d.startsWith(".")).sort();
    const keep = 7 * config.languages.length;
    for (const d of dirs.slice(0, Math.max(0, dirs.length - keep))) {
      fs.rmSync(path.join(postsDir, d), { recursive: true, force: true });
    }

    buildIndex();

    state.surah = range.surah;
    state.nextAyah = range.to + 1;
    state.part += 1;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + "\n");
    console.log(`➡️  Prochain : sourate ${state.surah}, verset ${state.nextAyah}, partie ${state.part}`);
    return;
  }

  if (cmd === "publish") {
    const env = process.env;
    for (const k of ["PUBLIC_BASE_URL", "TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REFRESH_TOKEN"]) {
      if (!env[k]) throw new Error(`Variable manquante : ${k}`);
    }
    const latest = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "latest.json"), "utf8"));
    const base = env.PUBLIC_BASE_URL.replace(/\/$/, "");
    const tokens = {}; // un compte TikTok par refresh token (le même pour toutes les langues par défaut)

    for (const post of latest.posts) {
      // TIKTOK_REFRESH_TOKEN_EN (optionnel) : publier l'anglais sur un autre compte.
      const suffix = env[`TIKTOK_REFRESH_TOKEN_${post.lang.toUpperCase()}`] ? `_${post.lang.toUpperCase()}` : "";
      const refreshToken = env[`TIKTOK_REFRESH_TOKEN${suffix}`];
      if (!tokens[suffix]) {
        const tok = await refreshAccessToken({
          clientKey: env.TIKTOK_CLIENT_KEY,
          clientSecret: env.TIKTOK_CLIENT_SECRET,
          refreshToken,
        });
        if (tok.refresh_token && tok.refresh_token !== refreshToken && env.GITHUB_OUTPUT) {
          // Exposé au workflow pour mettre à jour le secret GitHub automatiquement.
          fs.appendFileSync(env.GITHUB_OUTPUT, `new_refresh_token${suffix.toLowerCase()}=${tok.refresh_token}\n`);
        }
        tokens[suffix] = tok.access_token;
      }

      const publishId = await publishCarousel({
        token: tokens[suffix],
        imageUrls: post.files.map((f) => `${base}/${f}`),
        title: post.title,
        description: post.description,
        mode: env.TIKTOK_POST_MODE || "MEDIA_UPLOAD",
      });
      const status = await waitForStatus(tokens[suffix], publishId);
      console.log(`📤 [${post.lang}] ${latest.id} -> ${status?.status ?? "en cours"} (publish_id ${publishId})`);
    }
    return;
  }

  console.log("Commandes : generate | demo | daily | publish");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
