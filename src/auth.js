#!/usr/bin/env node
// À lancer UNE fois en local pour obtenir le refresh token TikTok.
//   1. TIKTOK_CLIENT_KEY=... TIKTOK_REDIRECT_URI=https://ton-domaine/callback node src/auth.js
//      -> ouvre l'URL affichée, connecte-toi avec le compte tafsir.daily et accepte.
//   2. Copie la valeur "code=..." de l'URL de retour, puis :
//      TIKTOK_CLIENT_KEY=... TIKTOK_CLIENT_SECRET=... TIKTOK_REDIRECT_URI=... node src/auth.js <code>
//   3. Mets le refresh_token affiché dans le secret GitHub TIKTOK_REFRESH_TOKEN.
const { TIKTOK_CLIENT_KEY: key, TIKTOK_CLIENT_SECRET: secret, TIKTOK_REDIRECT_URI: redirect } = process.env;
const code = process.argv[2];

if (!key || !redirect) {
  console.error("Définis TIKTOK_CLIENT_KEY et TIKTOK_REDIRECT_URI.");
  process.exit(1);
}

if (!code) {
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.search = new URLSearchParams({
    client_key: key,
    scope: "user.info.basic,video.upload,video.publish",
    response_type: "code",
    redirect_uri: redirect,
    state: Math.random().toString(36).slice(2),
  });
  console.log("Ouvre cette URL :\n\n" + url + "\n");
} else {
  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: key,
      client_secret: secret,
      code: decodeURIComponent(code),
      grant_type: "authorization_code",
      redirect_uri: redirect,
    }),
  });
  const json = await res.json();
  if (!json.refresh_token) {
    console.error("Échec :", json);
    process.exit(1);
  }
  console.log(`refresh_token (valable ~1 an) :\n\n${json.refresh_token}\n`);
}
