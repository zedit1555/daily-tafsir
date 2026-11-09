import { Composition } from "remotion";
import { TafsirVideo, timeline } from "./TafsirVideo.jsx";

export const FPS = 30;

export const Root = () => (
  <Composition
    id="Tafsir"
    component={TafsirVideo}
    width={1080}
    height={1920}
    fps={FPS}
    durationInFrames={FPS * 10}
    defaultProps={{ lang: "ar", ayat: [], cover: { duration: 3 }, endSeconds: 3, pauses: { cover: 0.6, ayah: 0.4 } }}
    calculateMetadata={({ props }) => ({ durationInFrames: timeline(props, FPS).total })}
  />
);
