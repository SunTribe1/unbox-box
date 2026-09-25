# Unbox Box brand guidelines v1.0

> Last updated: 2026-09-24 · Status: Active
> Source of truth for voice, color, type, motion and data styling. Tokens live in
> `apps/web/src/app/globals.css` (colors, type scale) and `apps/web/src/lib/teams.ts` (team
> colors); this document explains them. Change the code and this file together.

## Quick reference

| Element     | Value                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------ |
| Name        | Unbox Box (working title; several GitHub repos use it, pick a distinct name before launch) |
| One-liner   | F1 analysis your AI can drive.                                                             |
| Brand color | Signal red: `#c51e21` fill (both themes); text `#fa6865` (dark) / `#b7191c` (light)        |
| Surfaces    | Carbon dark `#08090b` → `#101216` → `#161a1f` → `#1e232a`                                  |
| Type        | Geist Variable (UI and headings), Geist Mono Variable (figures)                            |
| Voice       | Race-engineer calm: precise, brief, evidence first                                         |
| Legal       | Unofficial fan project; no F1 logos, fonts or "F1" in the product name                     |

---

## 1. Positioning

**For** F1 fans who want the real story behind a lap, and people evaluating a portfolio
project in one click. **Unbox Box** replays any session, compares any two laps corner by
corner and answers plain-English questions by driving the dashboard itself.
**Unlike** visual tools with no agent, or chat bots with no visuals, it shows the answer on
screen.

Key messages, in priority order:

1. Ask in plain English; the screen shows the answer.
2. Every lap of every car, 2023 to today, updated after each session.
3. Free, no account, no key, works offline once opened.

## 2. Voice and tone

The voice is a good race engineer on the radio: calm, specific, and always backing a claim
with a number.

| Trait     | We are                                                   | We are not                                                          |
| --------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| Precise   | "NOR +0.113s, lost most of it at Turn 1 (0.070s)."       | "Norris was a bit slower."                                          |
| Brief     | "Rejoins P3, 7.0s behind PIA."                           | "If Norris were to pit at this point in the race, he would likely…" |
| Calm      | "This data hasn't been published yet."                   | "Oops! Something broke 😬"                                          |
| Honest    | "Estimates from a tyre model. Treat results as a guide." | "Our AI predicts the winner."                                       |
| Fan-level | "Undercut", "stint", "pit window"                        | Unexplained engineering jargon (explain "delta" in context)         |

Tone by context:

| Context      | Tone                     | Example                                                                |
| ------------ | ------------------------ | ---------------------------------------------------------------------- |
| Answers      | Direct, number first     | "VER 1:23.445 vs LEC 1:23.584: LEC +0.139s."                           |
| Empty states | Inviting, one next step  | "Flags, penalties and messages appear as the race unfolds."            |
| Errors       | Plain cause + what to do | "Couldn't reach the data server. Check your connection and try again." |
| Toasts       | Past tense, short        | "Link copied" · "Running order downloaded"                             |
| Legal        | Formal, complete         | The disclaimer in the footer and on /credits                           |

Copy rules:

- **British English** (the sport's home register): tyre, colour, favourite, analyse.
- **Sentence case** for every title, button and menu item ("Race gaps", "Copy link").
  Small-caps labels (`text-label`) are uppercase by CSS, never typed in capitals.
- Driver **codes** (VER) in dense data, **last names** (Verstappen) in prose and headings.
- **Times**: `1:23.445` lap times, `+0.139` gaps with sign, `16.4s` durations, `L24` laps,
  `P3` positions, `T9` corners. Figures are always in the mono face.
- Race-control messages are shown in sentence case with acronyms and codes kept upper case.
- No exclamation marks, emoji, or hype words ("revolutionary", "powerful", "seamless").
- Honest about models: say "estimate", show the error bar, never promise outcomes.

## 3. Logo

Two pieces. The **wordmark**: slanted "UNBOX" letters over a red "BOX" panel, framed by an
outline. The **app mark**: two linked, slanted boxes (white and red) on a black rounded tile
with a red edge, legible down to 16 px.

| Variant           | File                                                          | Use                                        |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------ |
| Wordmark (vector) | `apps/web/public/brand/wordmark.svg`, `<Wordmark />`          | Page heroes, docs; letters use text colour |
| Wordmark (PNG)    | `apps/web/public/brand/wordmark-on-dark.png`, `-on-light.png` | Places that can't use SVG                  |
| App mark          | `apps/web/src/app/icon.svg`, `<Logo />`                       | Favicon, rail, phone header                |
| Favicon           | `apps/web/src/app/favicon.ico` (16, 32, 48)                   | Older browsers                             |
| Install icons     | `apps/web/public/icons/*.png` (192, 512, maskable, Apple)     | Home screen, installed app                 |
| Share image       | `apps/web/public/brand/og.png` (1200×630)                     | Link previews                              |
| Master            | `apps/web/public/brand/icon-1024.png`                         | Stores and future sizes                    |

- The letters follow the text colour (white on dark, near-black on light); the panel is
  always brand red `#e62424`. Never recolour, rotate, stretch or add effects.
- The desktop top bar shows the wordmark on every page; the rail and phone header show the
  mark.
- Minimum width: wordmark 80 px, app mark 16 px. Clear space: the height of the "BOX" panel
  on every side.
- Never pair the mark with F1 logos, team logos or official fonts.

## 4. Color

### Surfaces and text (dark is the default theme)

| Token                            | Dark             | Light                 | Use                     | Contrast on surface-1 |
| -------------------------------- | ---------------- | --------------------- | ----------------------- | --------------------- |
| `background`                     | `#08090b`        | `#f9fafb`             | Page                    |                       |
| `surface-1` / `card`             | `#101216`        | `#ffffff`             | Cards, panels           |                       |
| `surface-2` / `muted` / `accent` | `#161a1f`        | `#f4f5f7`             | Inputs, hovers, tracks  |                       |
| `surface-3`                      | `#1e232a`        | `#eceef1`             | Active toggles, pressed |                       |
| `foreground`                     | `#f0f2f4`        | `#101419`             | Primary text            | 16.7 / 18.5           |
| `muted-foreground`               | `#a0a5ac`        | `#595e64`             | Secondary text          | 7.6 / 6.5             |
| `faint-foreground`               | oklch 0.62       | oklch 0.52            | Captions, axis labels   | ≥ 4.8 / ≥ 5.0         |
| `border` / `border-strong`       | white 7.5% / 13% | `#e3e5e8` / `#d0d3d7` | Hairlines / inputs      |                       |

### Signal red: the one brand color

Red is the logo's colour, and in the UI it means **the Race Engineer, focus, the current
selection and the one primary action on a screen** (Play, Race Engineer, Send). The fill is a
shade deeper than the logo red (`#e62424`), because white text on the logo red is only 4.4:1.

| Token               | Dark        | Light     | Rule                                                     |
| ------------------- | ----------- | --------- | -------------------------------------------------------- |
| `signal`            | `#c51e21`   | `#c51e21` | Fills, rings, markers, the leader halo                   |
| `signal-foreground` | white       | white     | Text on red (5.9:1)                                      |
| `signal-ink`        | `#fa6865`   | `#b7191c` | Red **text** (6.7:1 on dark, 6.6:1 on white)             |
| `signal-soft`       | red 16%     | red 10%   | Selected rows, active corner band                        |
| `ring`              | `#fc5855`   | `#cc2827` | Focus outlines (≥ 3:1 against the surface)               |
| `glow`              | red, bright | red       | Decorative light only; never the only carrier of meaning |

**Light effects.** Red light is used sparingly and only on interactive or active things:

- `glow-hover`: the primary button, the Send button and clickable cards glow red, with a soft
  highlight from the top edge, on hover and keyboard focus.
- `glow-dot`: small active markers (the rail marker, the Race Engineer's live dot).
- `glow-icon`: the active navigation icon; the loading bar under the top bar.
- Active tabs are underlined in red.

Glows live on pseudo-elements, so only opacity animates, and reduced motion removes the fade.
No glow on text, headings or data.

### Data colors

Data colors always carry meaning and never decorate.

- **Team colors** (`lib/teams.ts`) mark drivers and cars everywhere: duel traces, map
  mini-sectors, replay cars, timing-tower stripes, stint rows, race-gap lines. Each broadcast
  color is lifted for dark surfaces and deepened for light ones, and the four blues, two reds
  and greys are pushed apart. All clear 3:1 against cards (WCAG 1.4.11 for graphics); they
  are not used for small text.
- **Teammates**: driver B's line is tinted 55% toward white (dark) or black (light) and
  dashed, so two lines of the same team never merge (`duelColors`).
- **History** spans every era, so its A/B pair is a fixed, CVD-checked cyan `#22b8d8` and
  magenta `#ee5a9a` (`.h2h-palette`), never team colors.
- **Tyres**: soft `#ff3b4f`, medium `#ffd23f`, hard `#e4e7ea`, inter `#45d06a`, wet
  `#3d8bff` (dark values). Always paired with the compound letter (S/M/H/I/W).
- **Status**: success green for "gained a place / green flag", danger red for errors and
  "lost a place", amber bands and badges for SC/VSC periods (`status-sc`, never the accent
  red or the medium-tyre yellow).
- Never rely on color alone: B is dashed, tyres carry letters, gains carry ▲/▼ and signs.

| Team              | Dark      | Light     |
| ----------------- | --------- | --------- |
| Red Bull Racing   | `#4a7ff0` | `#2553b8` |
| Ferrari           | `#ff3b4f` | `#d0102f` |
| Mercedes          | `#35e0c4` | `#0a8f7c` |
| McLaren           | `#ff9a3c` | `#d9650b` |
| Aston Martin      | `#2fbf8a` | `#12815c` |
| Alpine            | `#ff7ac2` | `#d0407f` |
| Williams          | `#5cc8ff` | `#1d86c4` |
| Racing Bulls / RB | `#8aa8ff` | `#4a64d6` |
| AlphaTauri        | `#8fa6c9` | `#4c6285` |
| Kick Sauber       | `#52e37a` | `#16934a` |
| Alfa Romeo        | `#e0607e` | `#a8284b` |
| Haas              | `#b8bec6` | `#5f666e` |
| Audi              | `#e6e9ef` | `#3d434d` |
| Cadillac          | `#d9b75a` | `#94731b` |

## 5. Typography

Two faces, self-hosted (no third-party requests):

- **Geist Variable** (Vercel, SIL OFL 1.1) for all interface text and headings: geometric,
  crisp at small sizes, with a slightly tightened default tracking (−0.006em).
- **Geist Mono Variable** for every figure that is compared or updates: lap times, gaps,
  speeds, positions, laps, codes. Applied with the `numeric` utility (mono + tabular figures),
  so digits never shift width while animating.

| Utility        | Size            | Weight | Leading | Tracking | Use                                   |
| -------------- | --------------- | ------ | ------- | -------- | ------------------------------------- |
| `text-display` | 24–30 px fluid  | 600    | 1.1     | −0.025em | Hero figures (lap time, rejoin P)     |
| `text-title`   | 15 px           | 600    | 1.35    | −0.01em  | Card and dialog titles                |
| body           | 14 px           | 400    | 1.5     | 0        | Default text                          |
| `text-caption` | 12 px           | 400    | 1.45    | 0        | Helper text, descriptions             |
| `text-label`   | 11 px uppercase | 550    | 1.2     | +0.08em  | Small caps above data (GAP, PIT LANE) |

**Marketing scale** (landing page only). Light and tightly tracked: the headline carries the
page by size, not weight.

| Utility         | Size            | Weight | Leading | Tracking | Use                                    |
| --------------- | --------------- | ------ | ------- | -------- | -------------------------------------- |
| `text-hero`     | 48–112 px fluid | 300    | 0.92    | −0.05em  | The one hero headline                  |
| `text-headline` | 32–52 px fluid  | 300    | 1.05    | −0.035em | Every section heading, the closing CTA |
| `text-subhead`  | 24–34 px fluid  | 300    | 1.12    | −0.025em | Feature titles, HUD figures            |
| `text-lead`     | 17 px           | 400    | 1.65    | 0        | Every intro paragraph                  |
| `text-eyebrow`  | 11 px mono caps | 400    | 1.3     | +0.14em  | Chips, HUD labels, window titles       |

**Buttons.** Sizes come from the `Button` component only, never from class overrides: `sm` for
bars, `default` in the app, `xl` for landing calls to action. `shape="pill"` on the landing page;
the app keeps rounded rectangles. One `signal` (red) button per screen; the second action is
`outline`. Text links on the landing page are `ArrowLink`: red, medium weight, an arrow that
nudges on hover (up-right for external pages).

Rules: one title per card; labels sit above the figure they name; headings use
`text-wrap: balance`, paragraphs `pretty`; prose max ~70 characters per line; never mono for
sentences (the hint "Hover or drag…" is sans).

## 6. Layout and components

- **shadcn/ui** (official registry, `components/ui`) is the component system; tune a
  primitive in place (as Card, Toggle and ToggleGroup are) rather than wrapping one-offs.
- Card: `rounded-xl`, 1 px border, `shadow-card`, no inner padding on the shell (charts run
  edge to edge); header row = title left, description or actions right.
- Spacing scale 4 px; card gutters 16 px (mobile) / 20 px (≥ sm); grid gap 16 px.
- Segmented controls (ToggleGroup) for mutually exclusive views; Select for pickers with
  more than five options; Sheet for the phone Race Engineer; Dialog for shortcuts and search.
- Touch targets ≥ 44 px on phones (tab bar, sheet controls).

## 7. Motion

Motion explains change; it never decorates. Presets live in `lib/motion.ts`.

- UI transitions finish under 300 ms (`fade` 220 ms, `riseIn` 6 px); layout moves use
  springs (`snappy` for pills and indicators, `gentle` for rows and panels).
- Signature moments: view entrance, sliding nav/season/segment pills, timing-tower rows
  reordering on overtakes with ▲/▼ flashes, track outlines drawing in, chart wipe-in,
  numbers counting between values, the circular theme reveal.
- Only `transform` and `opacity` animate (bars grow with `scale`, not width).
- `prefers-reduced-motion` turns movement into instant state changes everywhere, including
  Recharts and the theme reveal.

## 8. Iconography and imagery

- Motorsport icons are our own set in `apps/web/src/components/icons` (preview:
  `docs/icon-set.html`): 24 px grid, stroke 1.5, round caps and joins,
  `currentColor`, parallel strokes at least 2.5 units apart, body lines end on a wheel's
  widest point. Used for navigation, the Race Engineer, card titles, safety car states and
  tyres (`CompoundTyre` tints by compound).
- Lucide covers generic controls (chevrons, play/pause, share, search, arrows), 16 px in
  controls, 18 px in navigation, `currentColor`.
- Card titles lead with a muted 16 px domain icon; `CardTitle` styles a leading `svg`.
- No photography, car renders, team logos or driver images (IP); the data is the imagery.

## 9. Legal and attribution

- Footer on every page: unofficial fan project, trademarks of Formula One Licensing B.V.
- Data credits: TracingInsights (MIT 2023–2024, Apache-2.0 from 2025), F1DB (CC BY 4.0); full list on `/credits`,
  license texts in `THIRD_PARTY_NOTICES.txt` (`npm run notices`).

## 10. Consistency checklist (run before a release)

- [ ] Only tokens in components; no raw hex outside `globals.css` and `lib/teams.ts`
- [ ] One red action per screen; red text uses `text-signal-ink`; glows only on interactive
      or active elements
- [ ] Small text ≥ 4.5:1; lines and marks ≥ 3:1 in both themes
- [ ] Figures in `numeric`; titles in sentence case; British spelling
- [ ] Drivers colored by team (History excepted); teammates dashed
- [ ] Every animation respects reduced motion and uses transform/opacity
- [ ] Empty, loading (skeleton) and error (retry) states designed for each view
- [ ] No F1 marks, team logos or official fonts
