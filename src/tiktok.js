// Publication d'une vidéo via la TikTok Content Posting API.
// Mode par défaut : MEDIA_UPLOAD -> la vidéo arrive en brouillon dans ta boîte TikTok, tu publies. DIRECT_POST nécessite une app auditée.
const API = "https://open.tiktokapis.com/v2";

// Limite TikTok : 6 requêtes / minute par token, d'où l'attente de 12 s entre deux vérifications.
async function call(url, token, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json.error && json.error.code !== "ok")) {
    throw new Error(`TikTok ${url} -> ${res.status} ${JSON.stringify(json.error ?? json)}`);
  }
  return json.data;
}

export async function refreshAccessToken({ clientKey, clientSecret, refreshToken }) {
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error(`Refresh token TikTok refusé : ${JSON.stringify(json)}`);
  return json;
}

const truncate = (s, max) => [...s].slice(0, max).join("");

// Vidéo depuis une URL publique (domaine vérifié dans l'app TikTok).
//   MEDIA_UPLOAD : brouillon dans la boîte TikTok -> /post/publish/inbox/video/init/
//   DIRECT_POST  : publication directe (app auditée) -> /post/publish/video/init/
export async function publishVideo({ token, videoUrl, title, description, mode = "MEDIA_UPLOAD" }) {
  const source_info = { source: "PULL_FROM_URL", video_url: videoUrl };
  if (mode !== "DIRECT_POST") {
    const data = await call(`${API}/post/publish/inbox/video/init/`, token, { source_info });
    return data.publish_id;
  }
  const creator = await call(`${API}/post/publish/creator_info/query/`, token);
  const options = creator.privacy_level_options ?? [];
  const post_info = {
    title: truncate(`${title}\n${description}`, 2200),
    privacy_level: options.includes("PUBLIC_TO_EVERYONE") ? "PUBLIC_TO_EVERYONE" : options[0],
    video_cover_timestamp_ms: 500, // la couverture TikTok = l'image d'accroche du début
  };
  const data = await call(`${API}/post/publish/video/init/`, token, { post_info, source_info });
  return data.publish_id;
}

export async function waitForStatus(token, publishId, { tries = 15, delayMs = 12000 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    last = await call(`${API}/post/publish/status/fetch/`, token, { publish_id: publishId });
    if (["SEND_TO_USER_INBOX", "PUBLISH_COMPLETE"].includes(last.status)) return last;
    if (last.status === "FAILED") throw new Error(`Publication échouée : ${last.fail_reason}`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}
