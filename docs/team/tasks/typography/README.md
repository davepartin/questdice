# Typography polish, 27 October 2026

Build `20261027type1`. Dave asked for a small, consistent font palette across reading screens, especially post-battle objectives.

| Role | Font |
| --- | --- |
| Reading, labels and controls | Inter |
| Short fantasy titles | Cormorant Garamond |
| Dice, prices and numeric readouts | Oxanium |

The existing Archivo Black logo and drawn die artwork remain brand assets, outside the three text roles. The root aliases now resolve consistently; missing `--disp` and `--serif` aliases previously caused generic browser faces in some UI. Local Caveat and unloaded Cinzel styling is replaced by the shared roles. Long paragraphs are upright, with open line spacing, calmer tracking and readable result captions.

Fonts are bundled as WOFF2 under `assets/fonts/`, with source notes and four OFL licenses. The root no longer requests Google Fonts. Unicode subsets load as needed. `css/fonts.css` loads last and owns the policy, preserving component files for the other trip-readiness work.

Objective reveal also gives the reading panel more vertical room on phones. Continue follows all result paragraphs instead of sticking over them. Long results can scroll. No engine, saves, campaign, card values or feature switches changed.

## Evidence

- [Before](reveal-before.png) and [after](reveal-after.png), 390 by 844.
- [Short phone reveal](reveal-short-phone.png), 375 by 548.
- [Objective with larger text](objective-large-text.png), 390 by 844 with 20px root text.
- [Computed font audit summary](audit-summary.json).

`dev/typography.mjs` renders seven real UI views with presentation-only fixtures: objective reveal, secret objective, story, battle summary, rewards, weapon inspection and store. All 28 checks pass at 375x548, 390x844, 430x932 and 390x844 with 125% root text. Checks cover page width, objective text containment, resolved and loaded font families, no Google font requests, no page errors, and Continue following objective paragraphs. Chromium screenshots visually reviewed. These are bounded layout checks, not campaign simulations or a Safari/cloud end-to-end claim.

`node --test test/cards.test.mjs test/pricechip.test.mjs`: 20/20 pass. `node --check dev/typography.mjs` and `git diff --check` pass.

Reproduce with `CHROME=/path/to/chrome-headless-shell node dev/typography.mjs shots/typography 8187`.
