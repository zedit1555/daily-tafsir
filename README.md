# Daily Tafsir — carrousels TikTok automatiques

Chaque jour, GitHub Actions génère **deux carrousels du même passage** pour **@tafsir.daily** :
un en **arabe** (tafsir Al-Mukhtasar arabe) et un en **anglais** (Al-Mukhtasar anglais).
Le verset reste toujours en arabe. Chaque post a sa légende et ses hashtags.

Structure de chaque carrousel :

1. **Couverture** : « افهم هذه الآيات في دقيقة » + sourate + numéros des versets + premiers mots
2. **Une slide par verset** : le verset (police coranique Amiri Quran) + son tafsir
3. **Slide finale** : « تابع للجزء القادم » + versets suivants + @tafsir.daily

Les images (1080×1920, JPEG) sont publiées sur GitHub Pages, puis envoyées à TikTok
en **brouillon** : tu ajoutes la récitation en son dans l'app et tu publies.

Un verset trop long est automatiquement coupé en deux slides (verset, puis tafsir),
et la taille du texte s'adapte toute seule. Tout le texte reste dans la zone sûre TikTok.

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

**Actions → Carrousel quotidien → Run workflow**, puis remplis :

| Champ | Effet |
|---|---|
| Sourate / Premier verset / Dernier verset | le passage à générer. Laisse vide pour le passage suivant de la série |
| Récitateur | nom affiché sur la couverture et dans la légende + MP3 de la récitation (everyayah.com) |
| Numéro de partie | optionnel, affiché sur la couverture |
| Continuer la série | coché : la série automatique reprendra après ces versets. Décoché : elle ne bouge pas |

Chaque passage a un ZIP (images + légende + récitation) et un `recitation.mp3` téléchargeables depuis la galerie, à ajouter comme son dans TikTok.
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
4. Lance le workflow une fois à la main (**Actions → Carrousel quotidien → Run workflow**).
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
