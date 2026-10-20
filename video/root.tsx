import { Composition } from "remotion";
import { PerfectHunch } from "./perfect-hunch";
import { DURATION, FPS, HEIGHT, WIDTH } from "./story";
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/figtree";
import "./video.css";

export const VideoRoot = () => (
  <Composition
    id="PerfectHunch"
    component={PerfectHunch}
    durationInFrames={DURATION}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    defaultProps={{ music: true }}
  />
);
