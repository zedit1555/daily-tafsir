// Vidéo Daily Tafsir : couverture (isti'adha) -> un verset par scène (surlignage mot par mot) -> fin.
// Toutes les données (textes, pages, minutages, fichiers audio) sont préparées côté Node et passées en props.
import React from "react";
import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import { loadFonts } from "./fonts.js";

loadFonts();

const GOLD = "#d9b56a";
const CREAM = "#f3ead7";
const MUTED = "#c9c1ae";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const arNum = (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[d]);

/** Découpage temporel commun à calculateMetadata et au rendu. */
export function timeline(props, fps) {
  const scenes = [];
  let at = 0;
  const push = (kind, seconds, extra = {}) => {
    const frames = Math.max(1, Math.round(seconds * fps));
    scenes.push({ kind, from: at, frames, ...extra });
    at += frames;
  };
  push("cover", (props.cover?.duration ?? 3) + (props.pauses?.cover ?? 0.6));
  (props.ayat ?? []).forEach((a, i) => push("ayah", a.duration + (props.pauses?.ayah ?? 0.4), { index: i }));
  push("end", props.endSeconds ?? 3);
  return { scenes, total: at };
}

// ---------- Mise en page commune ----------

const Background = ({ src }) =>
  src ? (
    <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
  ) : (
    <AbsoluteFill style={{ background: "linear-gradient(180deg,#0c1730 0%,#16284a 55%,#24385c 100%)" }} />
  );

const Handle = ({ text }) => (
  <div style={{
    position: "absolute", top: 232, left: 150, right: 150, textAlign: "center", direction: "ltr",
    fontFamily: "Garamond", fontStyle: "italic", fontSize: 30, color: "rgba(243,234,215,.7)",
  }}>{text}</div>
);

// Zone sûre TikTok : rien sous les boutons (droite) ni sous la légende (bas).
const Panel = ({ children, opacity = 1, style }) => (
  <div style={{
    position: "absolute", top: 300, bottom: 470, left: 150, right: 150, display: "flex",
    flexDirection: "column", justifyContent: "center", alignItems: "stretch", opacity,
  }}>
    <div style={{
      background: "rgba(10,20,40,.58)", border: "1px solid rgba(217,181,106,.35)", borderRadius: 28,
      padding: "40px 34px", display: "flex", flexDirection: "column", alignItems: "center", gap: 22,
      maxHeight: "100%", overflow: "hidden", ...style,
    }}>{children}</div>
  </div>
);

const Divider = () => (
  <div style={{ width: 220, height: 2, flex: "none", background: `linear-gradient(90deg,transparent,${GOLD},transparent)` }} />
);

const fadeIn = (frame, delay = 0, length = 8) =>
  interpolate(frame, [delay, delay + length], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const rise = (frame, fps, delay = 0) =>
  interpolate(spring({ frame: frame - delay, fps, config: { damping: 200 } }), [0, 1], [24, 0]);

// ---------- Couverture ----------

const CoverScene = ({ p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const en = p.lang === "en";
  const latin = en ? { fontFamily: "Garamond", direction: "ltr" } : {};
  const range = p.range.from === p.range.to
    ? (en ? `Verse ${p.range.from}` : `الآية ${arNum(p.range.from)}`)
    : (en ? `Verses ${p.range.from} – ${p.range.to}` : `الآيات ${arNum(p.range.from)} – ${arNum(p.range.to)}`);
  // L'accroche est visible dès la 1re image (couverture TikTok) ; le reste arrive en douceur.
  const item = (delay) => ({ opacity: fadeIn(frame, delay), transform: `translateY(${rise(frame, fps, delay)}px)` });
  return (
    <Panel>
      <div style={{ fontSize: 30, color: GOLD, ...latin }}>{p.text.brand}</div>
      <div style={{ fontSize: en ? 62 : 74, fontWeight: 700, color: GOLD, textAlign: "center", lineHeight: 1.3, ...latin }}>
        {p.text.coverMessage}
      </div>
      <div style={{ ...item(4), fontFamily: "AmiriQuran", fontSize: p.cover.versesFull ? 84 : 140, color: GOLD, lineHeight: 1.4 }}>
        سورة {p.surah.nameAr}
      </div>
      <div style={{ ...item(7), fontSize: 40, color: CREAM, ...latin }}>
        {en ? `Surah ${p.surah.nameEn} • ` : ""}{range}
      </div>
      <div style={item(9)}><Divider /></div>
      <div style={{
        ...item(11), fontFamily: "AmiriQuran", direction: "rtl", textAlign: "center",
        fontSize: p.cover.versesSize, lineHeight: 1.9, color: p.cover.versesFull ? CREAM : MUTED,
      }}>
        {p.cover.versesFull
          ? p.ayat.map((a) => (
              <span key={a.ayah}>{a.words.map((w) => w.t).join(" ")}&nbsp;<span style={{ color: GOLD }}>﴿{arNum(a.ayah)}﴾</span> </span>
            ))
          : <>﴿ {p.cover.firstWords} … ﴾</>}
      </div>
      <div style={item(13)}><Divider /></div>
      {p.reciter && (
        <div style={{ ...item(15), fontSize: 30, color: MUTED, ...latin }}>
          {en ? `Recited by ${p.reciter.en}` : `بصوت الشيخ ${p.reciter.ar}`}
        </div>
      )}
      {p.part ? (
        <div style={{ ...item(16), fontSize: 32, color: GOLD, ...latin }}>{en ? `Part ${p.part}` : `الجزء ${arNum(p.part)}`}</div>
      ) : null}
    </Panel>
  );
};

// ---------- Verset ----------

const AyahScene = ({ p, a, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const en = p.lang === "en";
  const latin = en ? { fontFamily: "Garamond", direction: "ltr" } : {};

  // Mot en cours de récitation (-1 avant le 1er mot), page du verset et page du tafsir affichées.
  let current = -1;
  for (let i = 0; i < a.words.length; i++) if (a.words[i].s <= t) current = i;
  const ended = t >= a.duration;
  let page = 0;
  a.pages.forEach((pg, i) => { if (a.words[pg.start].s <= t) page = i; });
  const pg = a.pages[page];
  const pageStart = Math.round(a.words[pg.start].s * fps);
  let tpage = 0;
  a.tafsirPages.forEach((tp, i) => { if (tp.at <= t) tpage = i; });
  const tpStart = Math.round(a.tafsirPages[tpage].at * fps);

  const scene = fadeIn(frame, 0, 6);
  // Changement de page : la nouvelle page apparaît sans passer par le vide (pas de clignement).
  const pageAnim = page === 0 ? 1 : interpolate(frame, [pageStart, pageStart + 6], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tafsirAnim = tpage === 0
    ? fadeIn(frame, 4, 9)
    : interpolate(frame, [tpStart, tpStart + 8], [0.4, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const wordStyle = (i) => {
    if (!a.timed) return { color: CREAM };
    if (i === current && !ended) return { color: GOLD, textShadow: "0 0 18px rgba(217,181,106,.75)" };
    if (i < current || ended) return { color: CREAM };
    return { color: CREAM, opacity: 0.42 };
  };

  const lastPage = page === a.pages.length - 1;
  const counter = en ? `${index + 1} / ${p.ayat.length}` : `${arNum(index + 1)} / ${arNum(p.ayat.length)}`;

  return (
    <Panel opacity={scene} style={{ justifyContent: "flex-start", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 32, color: GOLD, ...latin }}>
        <span>{en ? `Surah ${p.surah.nameEn}` : `سورة ${p.surah.nameAr}`}</span>
        <span>{en ? `Verse ${a.ayah}` : `الآية ${arNum(a.ayah)}`}</span>
      </div>

      <div style={{
        minHeight: a.verseBox, display: "flex", alignItems: "center", justifyContent: "center", width: "100%",
        opacity: pageAnim, transform: `translateY(${(1 - pageAnim) * 18}px)`,
      }}>
        <div style={{ fontFamily: "AmiriQuran", direction: "rtl", textAlign: "center", fontSize: a.verseSize, lineHeight: 1.9 }}>
          {a.pages.length > 1 && page > 0 ? <span style={{ color: MUTED }}>… </span> : null}
          {a.words.slice(pg.start, pg.end).map((w, k) => (
            <React.Fragment key={pg.start + k}>
              <span style={wordStyle(pg.start + k)}>{w.t}</span>{" "}
            </React.Fragment>
          ))}
          {lastPage ? <span style={{ color: GOLD }}>﴿{arNum(a.ayah)}﴾</span> : null}
        </div>
      </div>

      <Divider />
      <div style={{ fontSize: 28, color: GOLD, ...latin }}>{p.text.tafsirLabel}</div>
      <div style={{
        flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", width: "100%",
        opacity: tafsirAnim, transform: `translateY(${(1 - tafsirAnim) * 14}px)`,
      }}>
        <div style={{
          fontFamily: en ? "Garamond" : "Amiri", direction: en ? "ltr" : "rtl", textAlign: "center",
          fontSize: a.tafsirSize, lineHeight: en ? 1.45 : 1.75, color: CREAM,
        }}>{a.tafsirPages[tpage].text}</div>
      </div>
      <div style={{ fontSize: 24, color: GOLD, opacity: 0.8, ...latin }}>{counter}</div>
    </Panel>
  );
};

// ---------- Fin ----------

const EndScene = ({ p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const en = p.lang === "en";
  const latin = en ? { fontFamily: "Garamond", direction: "ltr" } : {};
  const pop = spring({ frame, fps, config: { damping: 14 } });
  return (
    <Panel opacity={fadeIn(frame, 0, 8)}>
      <div style={{ fontSize: en ? 66 : 80, fontWeight: 700, color: GOLD, transform: `scale(${0.85 + 0.15 * pop})`, ...latin }}>
        {p.text.endTitle}
      </div>
      <Divider />
      <div style={{ fontSize: 44, color: CREAM, textAlign: "center", opacity: fadeIn(frame, 8), ...latin }}>{p.text.endText}</div>
      <div style={{ fontFamily: "Garamond", fontStyle: "italic", fontSize: 52, color: GOLD, direction: "ltr", opacity: fadeIn(frame, 14) }}>
        {p.handle}
      </div>
    </Panel>
  );
};

// ---------- Vidéo complète ----------

export const TafsirVideo = (p) => {
  const { fps } = useVideoConfig();
  const { scenes } = timeline(p, fps);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f1c33", color: CREAM, fontFamily: "Amiri" }}>
      <Background src={p.background} />
      <Handle text={p.handle} />
      {scenes.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.frames} layout="none">
          {s.kind === "cover" && (
            <>
              {p.cover.audio && <Audio src={staticFile(p.cover.audio)} />}
              <CoverScene p={p} />
            </>
          )}
          {s.kind === "ayah" && (
            <>
              <Audio src={staticFile(p.ayat[s.index].audio)} />
              <AyahScene p={p} a={p.ayat[s.index]} index={s.index} />
            </>
          )}
          {s.kind === "end" && <EndScene p={p} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
