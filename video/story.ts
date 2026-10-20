export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/** Shared by the composition, soundtrack generator and render verification. */
export const chapters = [
  { id: "opening", label: "The perfect hunch", seconds: 6 },
  { id: "capture", label: "Capture", seconds: 9 },
  { id: "connect", label: "Connect", seconds: 9 },
  { id: "score", label: "Understand", seconds: 8 },
  { id: "evolve", label: "Keep learning", seconds: 9 },
  { id: "permissions", label: "Keep control", seconds: 7 },
  { id: "share", label: "Share knowledge", seconds: 9 },
  { id: "closing", label: "Create your hunch", seconds: 7 },
] as const;

export const DURATION = chapters.reduce(
  (total, chapter) => total + chapter.seconds * FPS,
  0,
);

export const timeline = chapters.map((chapter, index) => ({
  ...chapter,
  from: chapters
    .slice(0, index)
    .reduce((sum, item) => sum + item.seconds * FPS, 0),
  duration: chapter.seconds * FPS,
}));
