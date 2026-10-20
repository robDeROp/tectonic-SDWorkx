import { Config } from "@remotion/cli/config";
import { existsSync } from "node:fs";

Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
// The film is self-contained; never inject the application's .env into Studio.
Config.setDotEnvLocation("video/.env.example");

// Use installed Chrome on macOS; the bundled headless shell can crash on
// this host. Other platforms retain Remotion's automatic browser selection.
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (process.platform === "darwin" && existsSync(chrome)) {
  Config.setBrowserExecutable(chrome);
}
