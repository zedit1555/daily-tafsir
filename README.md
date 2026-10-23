# Daily Tafsir — vidéos TikTok automatiques

Chaque jour, GitHub Actions génère **deux vidéos du même passage** pour **@tafsir.daily** :
une en **arabe** (tafsir Al-Mukhtasar arabe) et une en **anglais** (Al-Mukhtasar anglais).

Déroulé de chaque vidéo (1080×1920) :
1. **Image d'accroche** (1re image de la vidéo) : « افهم هذه الآيات في دقيقة » + sourate + **texte des versets**
   (ou leurs premiers mots s'ils sont trop longs), pendant l'isti'adha (أعوذ بالله من الشيطان الرجيم).
   C'est aussi la couverture TikTok : choisis la 1re image comme couverture si tu publies à la main.
2. **Une scène par verset** : le verset + son tafsir, affichés pendant la récitation de ce verset
3. **Scène finale** « تابع للجزء القادم » + @tafsir.daily (3 secondes)

Un verset trop long est coupé en deux scènes (verset, puis tafsir) qui se partagent sa récitation.
Les vidéos sont publiées en **release GitHub** et visibles dans la galerie GitHub Pages.

L'isti'adha vient d'everyayah.com (celle d'Alafasy si le récitateur choisi n'en a pas).
Pour utiliser ta propre version, dépose un fichier `assets/istiadha.mp3`.

---

## Démarrage rapide (en local)

```bash
npm install
npx playwright install chromium
npm run demo                                   # -> out/demo-ar/ et out/demo-en/ (Al-Baqara 142, sans réseau)
npm run generate -- --surah 2 --from 158 --to 161 --part 24              # les deux langues
npm run generate -- --surah 2 --from 158 --to 161 --part 24 --lang ar    # arabe seulement
```

Chaque dossier contient les slides + `caption.txt` (titre, légende, hashtags).
Tu peux déjà poster ces images à la main en attendant de brancher l'automatisation.

## Lancer à la main (versets et récitateur au choix)

**Actions → Vidéo quotidienne → Run workflow**, puis remplis :

| Champ | Effet |
|---|---|
| Sourate / Premier verset / Dernier verset | le passage à générer. Laisse vide pour le passage suivant de la série |
| Récitateur | voix de la récitation (everyayah.com), nom affiché sur la couverture et dans la légende |
| Numéro de partie | optionnel, affiché sur la couverture |
| Continuer la série | coché : la série automatique reprendra après ces versets. Décoché : elle ne bouge pas |

Chaque vidéo est téléchargeable depuis la galerie, avec sa légende.
Le récitateur par défaut (runs automatiques) se règle dans `config.json` (`"reciter"`) ou via la variable `RECITER`.
Pour ajouter un récitateur : son nom dans `src/reciters.js` et dans la liste du workflow.

## Configuration

| Fichier | Rôle |
|---|---|
| `config.json` | langues (`["ar", "en"]`), textes de chaque langue (couverture, slide finale, hashtags), nb de versets par post |
| `state.json` | où en est la série : sourate, prochain verset, numéro de partie |
| `assets/background.jpg` | ton fond Canva (voir plus bas). Sans ce fichier, un fond nuit + arche est dessiné en CSS |

### Fond depuis Canva
Dans Canva, crée un design 1080×1920 avec seulement le décor (ciel, arche dorée, montagnes),
**sans aucun texte**, exporte-le en JPG et enregistre-le sous `assets/background.jpg`.

### Source du tafsir (Al-Mukhtasar)
Le texte coranique vient de l'API quran.com (texte uthmani). Le tafsir vient de l'**API Al-Mukhtasar**
(admin.mokhtasr.com), avec les mêmes identifiants que le repo `tafsir-daily-renderer` :

| Secret | Valeur |
|---|---|
| `MUKHTASAR_EMAIL` | email de ton compte Mukhtasar |
| `MUKHTASAR_PASSWORD` | mot de passe de ce compte |
| `BOOK_AR` | identifiant du livre Al-Mukhtasar arabe |
| `BOOK_EN` | identifiant du livre Al-Mukhtasar anglais |

Autres sources possibles : fichiers locaux `data/tafsir/ar/2.json` et `data/tafsir/en/2.json`
→ `{ "158": "...", "159": "..." }` (prioritaires), ou une autre API via `TAFSIR_AR_URL` / `TAFSIR_EN_URL`
(gabarit avec `{surah}` et `{ayah}`) + `TAFSIR_AR_PATH` / `TAFSIR_EN_PATH`.

## Mise en ligne sur GitHub

1. Crée un repo et pousse ce dossier.
2. **Settings → Pages → Source : GitHub Actions.** Ajoute un domaine perso (ex. `tafsir.ton-domaine.com`) :
   TikTok exige un domaine dont tu prouves la propriété.
3. **Settings → Secrets and variables → Actions** :
   - Secrets : `MUKHTASAR_EMAIL`, `MUKHTASAR_PASSWORD`, `BOOK_AR`, `BOOK_EN`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REFRESH_TOKEN`,
     et `GH_PAT` (token GitHub avec droit « Secrets » sur ce repo, pour renouveler le token TikTok automatiquement)
   - Variables : `PUBLIC_BASE_URL` (ex. `https://tafsir.ton-domaine.com`), `TIKTOK_ENABLED=true`
4. Lance le workflow une fois à la main (**Actions → Vidéo quotidienne → Run workflow**).
   Ensuite il tourne tous les jours à 19h07 (heure d'été de Paris).

Sans `TIKTOK_ENABLED`, le workflow génère et publie seulement les images sur Pages :
tu les récupères dans `public/posts/` pour poster à la main.

## Brancher TikTok

1. Sur [developers.tiktok.com](https://developers.tiktok.com), crée une app avec **Login Kit** et
   **Content Posting API** (scopes `video.upload`, `video.publish`).
2. Dans l'app, **vérifie ton domaine** (URL properties) : celui de `PUBLIC_BASE_URL`.
3. Ajoute une Redirect URI, ex. `https://tafsir.ton-domaine.com/callback` (une page 404 suffit).
4. Récupère le refresh token une seule fois :
   ```bash
   TIKTOK_CLIENT_KEY=... TIKTOK_REDIRECT_URI=https://tafsir.ton-domaine.com/callback npm run auth
   # ouvre l'URL, accepte, copie le "code=..." de l'URL de retour
   TIKTOK_CLIENT_KEY=... TIKTOK_CLIENT_SECRET=... TIKTOK_REDIRECT_URI=... npm run auth -- <code>
   ```
5. Mets le refresh token dans le secret `TIKTOK_REFRESH_TOKEN`.

**Un seul compte ou deux ?** Par défaut, les deux posts partent sur le même compte.
Pour publier l'anglais sur un second compte, refais l'étape 4 connecté avec ce compte et
mets son refresh token dans `TIKTOK_REFRESH_TOKEN_EN` : rien d'autre à changer.

**Mode de publication** (variable `TIKTOK_POST_MODE`) :
- `MEDIA_UPLOAD` (défaut) : brouillon dans ta boîte TikTok. Tu ajoutes le son et tu publies.
- `DIRECT_POST` : publication directe. Tant que l'app n'est pas auditée par TikTok,
  les posts restent en privé — garde le mode brouillon d'ici là.

## À vérifier régulièrement
- Le texte coranique vient toujours de l'API, jamais retapé à la main. Jette quand même
  un œil aux brouillons avant de publier.
- Le refresh token TikTok expire au bout d'environ un an : relance `npm run auth` si le job échoue.
