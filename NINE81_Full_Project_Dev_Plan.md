# NINE.81 — Full Project Development Plan

A complete build brief. Paste this whole file as your instruction to Claude Code
to pick up development from here.

---

## 1. Project Overview

**NINE.81** is an interactive 3D web app where users jump and predict outcomes
under Earth, Moon, and Jupiter gravity — driven by a real physics simulation,
not a scripted animation. It's built for **A/Level Physics self-study**
(Unit 2: Mechanics), with online learning platforms and A/L tuition institutes
as secondary distribution channels.

**Core pitch:** most students can recite that the Moon's gravity is "about
one-sixth of Earth's," but almost nobody has felt what that means. NINE.81
makes gravity a variable the user changes themselves, and asks them to
predict the result before revealing it.

**Platform:** browser-based, desktop and mobile. No install, no login,
client-side only (no backend).

**Team:** Rashen K R — 3D & Physics Developer. De Alwis — UX, Content &
Testing Lead. (SE4061, Group 14.)

---

## 2. Problem, Goal, and Target User

| | |
|---|---|
| **Problem** | Gravitational acceleration is taught as a constant to plug into a formula, with no chance to test a prediction and see if it was right. |
| **Goal** | Turn observation into active prediction, and prove — visibly, on every jump — that the simulation is real physics, not a display trick. |
| **Primary user** | A/Level Physics students, self-study and exam revision, alongside Unit 2: Mechanics. |
| **Secondary users** | A/L tuition institutes (licensed content), online learning platforms (embeddable widget). |

---

## 3. User Experience — Full Flow

The experience has **two connected modes**. Learn Mode shows the raw effect
with minimal interaction; Game Mode layers challenge and effort on top of a
concept the user has already seen once.

### 3.1 Entry
- User opens the app, sees a low-poly astronaut standing on a slowly
  rotating planet (Earth by default).
- Gravity selector visible at all times: **Earth / Moon / Jupiter**.
- On-screen prompt: *"Press SPACE to jump."*

### 3.2 Learn Mode — "See the Difference"
1. A single tap/press plays a **fixed-strength jump** — same launch velocity
   every time, only gravity changes between worlds.
2. On landing, a readout shows: jump height achieved, that world's gravity
   value, and a one-line plain-language explanation (e.g. *"The Moon's
   gravity is about 1/6th of Earth's — that's why the exact same jump sent
   you 6× higher."*).
3. User switches planets and repeats — a small comparison strip builds up
   across all three worlds (three small bars, one per planet) so the
   contrast is visible at a glance, not just read as text.
4. Once the user has tried at least one jump, a button appears: **"Ready to
   test your skill? Play the Challenge →"** — the only way into Game Mode.
   Learn Mode stays simple and un-gamified on purpose.

### 3.3 Game Mode — "Conquer the Gravity"
1. **Charge-up jump:** hold spacebar (or a touch-equivalent button on
   mobile) to charge a meter, up to a capped maximum. Charge level = launch
   velocity = effort the user puts in.
2. **Predict:** before releasing, a target height line appears. The user
   commits to a guess — will this charge clear the target on this world, or
   not?
3. **Release:** Rapier takes over completely — real simulated motion, no
   scripted animation.
4. **Verify:** at peak height, two numbers appear side by side — the height
   predicted by the formula for this charge level, and the actual height
   measured by the physics engine. They should match almost exactly. The
   user also sees whether their prediction was correct.
5. **Loop:** no formal end screen. Continuous, replayable. A small toggle
   always lets the user jump back to Learn Mode to re-confirm a comparison.

### 3.4 Demo Statement (for presentations)
*"The astronaut jumps on Earth, then on Moon with the identical charge — the
same input produces a dramatically different result, live."*

---

## 4. Visual Design Spec — What It Looks Like

### 4.1 Scene composition
- Low-poly 3D scene, **dark space background** (deep navy, not pure black —
  e.g. `#10192E`).
- A single planet fills a large portion of the frame — "tiny planet" staging,
  not astronomically accurate scale (see Section 5).
- Astronaut stands on top of the planet, small relative to the planet
  (roughly 1.8 m tall vs. the planet's 4 m radius / 8 m diameter).
- Camera at a 3/4 angle, slightly above the astronaut, planet curving away
  below — matches the reference mockup used during design (astronaut small
  and centred, planet filling the lower two-thirds of frame).

### 4.2 UI overlay layout
- **Top centre:** gravity selector — three pill buttons (Earth / Moon /
  Jupiter), active one highlighted in its planet color (see palette below).
- **Top right or side panel:** live readout — current g value, jump height,
  and (in Game Mode) the formula-predicted vs. engine-measured comparison.
- **Bottom centre (Game Mode only):** charge meter — fills as spacebar is
  held.
- **Overlay text uses plain HTML/React, not part of the 3D canvas** —
  positioned absolutely on top of the `<Canvas>`.

### 4.3 Color palette

| Role | Color | Hex |
|---|---|---|
| Background (space) | Deep navy | `#10192E` |
| Card / panel surface | Lighter navy | `#1C2B4A` |
| Primary heading / UI | Navy | `#1B2436` |
| Accent (buttons, highlights, charge meter) | Orange | `#E8632D` |
| Earth | Blue | `#3B6EA5` |
| Moon | Slate grey | `#8B93A3` |
| Jupiter | Orange (same as accent — intentional, matches real cloud-band color) | `#E8632D` |
| Body text on dark bg | Light grey-blue | `#C9D3E0` |
| Body text on light bg | Dark grey | `#2A3142` |

This is the same palette used across the project's written proposal and
slide decks — keep the app visually consistent with those materials.

### 4.4 Typography
- Clean sans-serif throughout (system UI font stack is fine — no need for a
  custom web font for the MVP).
- Numbers (g values, heights) should be visually prominent — large,
  bold — since comparing numbers *is* the core mechanic.

---

## 5. Asset Specs — Planets and Astronaut

**Shared constraints across all three planets** (already used to generate
the pipeline prototype):

- Base mesh: icosphere, **subdivision level 2** (320 base triangles).
- **Flat shading only** — no smooth/auto-smooth. The visible flat facets are
  the entire visual style.
- Color via **vertex colours**, not image textures (routed through a Color
  Attribute node into Base Color for correct glTF export).
- **Radius 4.0 m for all three planets**, centred at world origin — same
  size on purpose, told apart by color/detail, not size. (Jupiter is really
  ~11× Earth's diameter in reality; ignored for gameplay staging.)
- Export: **glTF 2.0 Binary (.glb)**, all transforms applied before export.

| Planet | Triangle budget | Geometry | Key visual detail |
|---|---|---|---|
| Earth | 300–600 (max 600) | Perfect sphere, no displacement | Ocean-blue base, 2–3 continents, small polar caps |
| Moon | 500–1,000 (max 1,000) | Random vertex displacement + 2–3 inset craters | Neutral grey, darker crater interiors |
| Jupiter | 300–600 (max 600) | Perfect sphere, no displacement | 5–7 horizontal colour bands + Great Red Spot; **no rings** (that's Saturn) |

Full per-planet modelling prompts (exact colors, step-by-step Blender MCP
instructions) already exist as separate files: `Earth_LowPoly_Prompt.md`,
`Moon_LowPoly_Prompt.md`, `Jupiter_LowPoly_Prompt.md`. Use those verbatim
when generating the real assets.

**Astronaut:** low-poly, roughly 1.8 m tall (reference human scale), flat
shaded, vertex-coloured, no textures. Origin at the base (feet), not centre,
so physics rotation looks correct.

---

## 6. Physics and Core Mechanic Spec

### 6.1 Gravity values

```js
const WORLDS = {
  Earth:   9.81,
  Moon:    1.62,
  Jupiter: 24.79,
};
```

| World | g (m/s²) | Jump height vs Earth |
|---|---|---|
| Earth | 9.81 | Baseline (1×) |
| Moon | 1.62 | ≈6× higher |
| Jupiter | 24.79 | ≈0.4× (noticeably lower) |

### 6.2 Formulas

- Jump height from launch velocity `v`: **h = v² / 2g**
- Air time from launch velocity `v`: **t = 2v / g**
- (Future scope — Escape Velocity Mode) **V_e = √(2gR)**

### 6.3 Why the verification readout matters
The physics engine (Rapier) calculates real Newtonian motion every frame —
nobody scripts "jump goes higher on Moon." Only `g` changes between worlds;
Rapier works out the resulting height and air time on its own. Showing the
formula-predicted value next to the engine-measured value, side by side, is
a genuine correctness check — the two are computed completely independently
and should match almost exactly on every jump.

### 6.4 Charge-up jump
- Holding spacebar increases launch velocity `v` up to a capped maximum
  (suggest: 1–2 second full charge, linear or slightly eased ramp).
- Releasing applies the impulse: `body.setLinvel({ x: 0, y: v, z: 0 }, true)`.
- Only trigger a new jump when grounded (track via a collision event).

### 6.5 Honest simplifications to keep (stated in-app, not hidden)
- Jupiter's 24.79 m/s² is measured at the cloud-top level (no solid
  surface) — a real planetary-science reference point.
- Gravity is treated as constant near the surface; the real field varies
  with distance (inverse-square law), a standard and reasonable
  simplification for this kind of visualisation.

---

## 7. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| 3D rendering | React Three Fiber (Three.js) | Scene, camera, meshes |
| Physics | Rapier (`@react-three/rapier`) | Real gravity/collision simulation |
| Asset pipeline | Blender → glTF (.glb) → gltfjsx | Low-poly, flat-shaded, vertex-coloured |
| Styling | Tailwind CSS | Touch-friendly UI overlay |
| Hosting | Static (Vercel/Netlify) | No backend; can later wrap with React Native/Capacitor for mobile app |

The team already holds working experience in Three.js/WebGL and Blender
modelling — this materially reduces the usual risk of a 3D build for a
two-person, time-boxed project.

---

## 8. Architecture

### 8.1 Pipeline (already proven working — see Section 9)

```
Blender model
   │  (apply all transforms, flat shade, vertex colours)
   ▼
Export .glb
   │
   ▼
npx gltfjsx model.glb → React component (auto-generated)
   │
   ▼
Import into React Three Fiber scene
   │
   ▼
Wrap in RigidBody (Rapier) for physics-driven objects
```

### 8.2 High-level app architecture

```
User / Visitor
   │
   ▼
Input (Keyboard / Touch)
   │
   ▼
App Engine (React Three Fiber + Rapier)
   │              │
   ▼              ▼
Output          Content & Media Assets
(3D + Live      (Blender → glTF, loaded
 Readout)        via useGLTF)
```

No backend, no database — all simulation and state runs client-side in the
browser.

### 8.3 Suggested file structure

```
src/
  App.jsx                 — top-level state (world, mode, charge, jumps)
  main.jsx
  components/
    Scene.jsx              — Planet + Astronaut, wired to real .glb nodes
    PlanetSelector.jsx      — Earth/Moon/Jupiter pill buttons
    ChargeMeter.jsx         — Game Mode charge bar
    VerificationReadout.jsx — formula-predicted vs engine-measured display
    ComparisonStrip.jsx     — Learn Mode's three-world comparison bars
  assets/
    astronaut.glb
    earth.glb
    moon.glb
    jupiter.glb
  hooks/
    useGravityJump.js       — shared charge/jump/verify logic
public/
  astronaut.glb             — copies for useGLTF to load from
  earth.glb
  moon.glb
  jupiter.glb
```

---

## 9. What's Already Built — Pipeline Prototype

A working pipeline prototype already exists and has been verified:

- `generate-assets.mjs` — procedurally generates a placeholder `.glb`
  (icosphere planet at exactly the subdivision-2/320-triangle spec, plus a
  simple cube astronaut stand-in) using `@gltf-transform/core`, since no
  Blender was available in the build environment. **This step gets replaced
  by real Blender exports — everything after it does not change.**
- `PlaceholderScene.jsx` — the raw, unedited output of `npx gltfjsx` run
  against that `.glb`.
- `Scene.jsx` — hand-written integration layer: `Planet` rotates via
  `useFrame`, `Astronaut` is a Rapier `RigidBody` that jumps via
  `setLinvel` on spacebar, grounded-check via `onCollisionEnter`.
- `App.jsx` — Earth/Moon/Jupiter buttons swap `Physics gravity={[0, -g, 0]}`
  live; a readout shows current g and jump count.

Verified: `npm run build` completes cleanly (571 modules, no errors); the
generated `.glb` was read back and confirmed correct (320 / 12 triangles);
`npx gltfjsx` ran successfully; `npm run dev` boots without runtime errors.

**Not yet done:** real Blender-modelled assets (still placeholders), the
charge-up mechanic (prototype uses a fixed-strength jump only), the
predict-then-verify UI, the Learn Mode comparison strip, and the
formula-vs-measured verification readout UI.

---

## 10. MVP Scope

**MVP features (ships first):**
- Low-poly 3D scene, rotating planet + astronaut, Earth/Moon/Jupiter toggle
- Learn Mode: fixed-strength jump, plain-language explanation, cross-world
  comparison strip
- Game Mode: charge-up jump, predict-then-verify flow, live
  formula-vs-measured readout

**Explicitly excluded from MVP (future scope):**
- Throw mode aimed at a target (angle/power puzzle)
- Split-screen simultaneous comparison across two planets
- Sound feedback scaled to impact velocity / air time
- Escape Velocity Mode (`V_e = √2gR`) — reuses the existing charge-jump
  engine, different pass/fail condition
- Additional celestial bodies (a neutron star, microgravity/ISS mode)
- Real-world fact callbacks (e.g. Apollo 15's feather-and-hammer drop for
  Moon mode) — framed as a *related but distinct* phenomenon (absence of
  air resistance, not gravity magnitude), not implied proof of the same
  effect the app simulates

**Acceptance criteria:**
- All three worlds functionally correct (correct gravity constants, correct
  jump behaviour)
- Predicted vs measured height match within a small tolerance, on every
  jump
- Smooth performance on a budget mobile browser

---

## 11. Development Roadmap

| Stage | Weeks | Owner | Deliverable |
|---|---|---|---|
| Research & UX Design | 1–3 | De Alwis leads | Wireframes, content, curriculum research |
| 3D & Physics Build | 3–8 | Rashen leads | Real assets, full charge-jump + predict-verify engine |
| Integration & Testing | 8–10 | Both | Combined app, usability testing, bug fixing |
| Documentation & Demo | 10–12 | De Alwis leads | Final report, demo script, presentation |

Current position: pipeline prototype complete (proves the Week 3 milestone).
Next: swap placeholders for real Blender assets, then build the charge-up
and predict-then-verify UI on top of the existing `Scene.jsx` /
`useGravityJump` pattern.

---

## 12. Instructions for Claude Code — Build Order

Work in this order; verify each step before moving to the next.

1. **Start from the existing pipeline prototype** (provided separately as
   `nine81-pipeline-prototype.zip`). Confirm `npm install && npm run dev`
   still works before changing anything.
2. **Extract shared jump/charge logic** out of `Scene.jsx` into a
   `useGravityJump` hook, so both Learn Mode and Game Mode can reuse it with
   different parameters (fixed velocity vs. charged velocity).
3. **Build Learn Mode first**: fixed-strength jump, the explanation readout,
   and the three-world comparison strip. This is the simpler mode — get it
   solid before adding Game Mode's complexity.
4. **Add the charge-up mechanic**: hold-to-charge meter, capped maximum,
   release-to-jump. Reuse the same `RigidBody`/`setLinvel` pattern already
   proven in the prototype.
5. **Add the predict-then-verify flow**: target height line, user guess
   capture, and the formula-vs-measured comparison UI (Section 6.3) —
   this is the project's core academic claim, so get the number formatting
   and "do they match" check right.
6. **Swap in real assets** once Blender models exist, following the
   per-planet prompt files — should be a drop-in replacement for the
   placeholder `.glb`, no logic changes needed if node names match.
7. **Mobile/touch pass**: replace keyboard-only spacebar handling with a
   touch-equivalent hold button; test on a real budget Android device, not
   just desktop.
8. **Performance pass**: confirm triangle budgets were respected once real
   assets are in, and frame rate stays smooth on mobile.

Do not implement anything from Section 10's "explicitly excluded" list
unless separately instructed — those are deliberately out of scope for the
MVP.
