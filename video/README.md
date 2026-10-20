# Create the perfect hunch

A 64-second, 1920 × 1080, 30 fps Remotion product-vision film in English.
The video uses Hunch’s existing fonts, brand palette, logo and mascot.
It includes original instrumental audio, and the story works without sound.

## Preview and export

```sh
npm run video:studio
npm run video:render
```

The composition is **PerfectHunch**. The export is
`out/video/create-the-perfect-hunch.mp4`. The first render may download
Remotion’s Chrome Headless Shell. The app and its database do not need to run.

For an export without music:

```sh
npm run video:render -- --props='{"music":false}'
```

The output directory and generated audio are ignored by Git. Both preview and
render commands regenerate the soundtrack locally, without a network service.
Remotion packages are pinned to the same version.

On macOS, the configuration uses installed Google Chrome when available.
Elsewhere, Remotion selects its bundled browser. The film loads an empty
environment file rather than the app's credentials. The CLI may report a Zod
version warning because the app uses a newer Zod; this composition has no
Zod schema and does not change the application's Zod version.

## Story

| Time   | Scene         | Message                                                                   |
| ------ | ------------- | ------------------------------------------------------------------------- |
| 0–6s   | Opening       | Create the perfect hunch.                                                 |
| 6–15s  | Capture       | Create a hunch from Teams, Outlook, or Hunch.                             |
| 15–24s | Connect       | Discover relevant documents, people, conversations and other hunches.     |
| 24–32s | Understand    | See relevance scores and inspect the source of each connection.           |
| 32–41s | Keep learning | Working documents are linked automatically and scored again when updated. |
| 41–48s | Keep control  | Existing document-system access rights are preserved.                     |
| 48–57s | Share         | Review a suggestion to share a useful document to the team’s SharePoint.  |
| 57–64s | Closing       | Find it. Understand it. Trust it.                                         |

This is an animated product vision with illustrative questions, document names,
groups and scores. It is not a recording or certification of live integrations.
Creating the film does not add Teams/Outlook ingestion, automatic document
sync, permission enforcement or SharePoint publishing to the application.
The sharing sequence stops at a proposal awaiting the user’s approval.

## Editing

- `perfect-hunch.tsx`: scenes, text, layout, colors and frame-driven animation.
- `story.ts`: chapter timing and output dimensions.
- `root.tsx`: Remotion composition and local brand fonts.
- `video.css`: typography and common card styling.
- `../scripts/video-assets.mjs`: reproducible original soundtrack.

All animation is a deterministic function of the frame. There are no CSS
animations, live data requests, database dependencies or external font calls.
If changing the total duration, also adjust the soundtrack length in the asset
generator.
