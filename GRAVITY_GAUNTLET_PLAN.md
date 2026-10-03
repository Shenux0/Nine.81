# Gravity Gauntlet — replace the current Game Mode

## Context

Nine.81 currently has two modes: "Learn" (fixed-velocity jump, teaches h = v²/2g) and "Game" (hold-to-charge jump + a pre-jump binary guess "will clear / won't clear" a random target height). The user tried Game Mode and found it unsatisfying — there's no scoring, no failure state, and no progression; it's a single guess repeated with no sense of getting better.

We're replacing the content of the existing "Game" mode (same toggle button, same mode name) with **Gravity Gauntlet**: the player still holds SPACE to charge and releases to jump, but now must land their jump's peak height inside a visible target *band* (a min–max zone) rather than making a verbal guess beforehand. Landing inside the band is a **hit** (streak +1, next band gets narrower — harder); missing is a **miss** (streak resets, next band goes back to base width). This turns the mode into a real skill loop with progression and failure, while reusing the exact charge/launch/physics machinery already in place.

## Mechanic details

- Band position is re-randomized every round; only its *width* depends on streak, so players can't win by memorizing one charge duration.
- Band generation (`generateBand(g, streak)`), reusing existing reachable-height bounds (`jumpHeight(MIN/MAX_CHARGE_VELOCITY, g)`, same 0.6/0.95 play-zone ratios as today's `randomTargetHeight`):
  ```js
  const BASE_WIDTH_FRACTION = 0.35;
  const MIN_WIDTH_FRACTION  = 0.08;
  const WIDTH_DECAY         = 0.8;

  function generateBand(g, streak) {
    const reachableLo = jumpHeight(MIN_CHARGE_VELOCITY, g);
    const reachableHi = jumpHeight(MAX_CHARGE_VELOCITY, g);
    const range = reachableHi - reachableLo;
    const playLo = 0.6 * reachableLo;
    const playHi = 0.95 * reachableHi;
    const baseWidth = BASE_WIDTH_FRACTION * range;
    const minWidth  = MIN_WIDTH_FRACTION * range;
    const width = Math.min(
      minWidth + (baseWidth - minWidth) * Math.pow(WIDTH_DECAY, streak),
      (playHi - playLo) * 0.9 // defensive clamp, shouldn't bind
    );
    const half = width / 2;
    const centerLo = playLo + half;
    const centerHi = playHi - half;
    const center = centerHi > centerLo
      ? centerLo + Math.random() * (centerHi - centerLo)
      : (playLo + playHi) / 2; // degenerate fallback
    return { min: center - half, max: center + half };
  }
  ```
  Width decays exponentially toward an 8%-of-range floor, so a band is always physically reachable, at every streak level, on every planet.
- **Sequencing**: the *next* band is generated at `LAND` time (as soon as hit/miss is known), not at `CHARGE_START`. The band a player sees while charging/airborne is exactly the band their jump will be graded against (captured in `launchMeta` at launch time) — no regeneration race, because a new charge can't start until `grounded.current` flips true in `handleCollisionEnter`, which happens strictly before the next keypress can matter.

## State changes — `src/App.jsx`

Replace `targetHeight`/`guess` with a `targetBand` + streak tracking:
```js
const initialGameState = {
  phase: "idle",
  chargeLevel: 0,
  targetBand: null,   // { min, max } | null
  streak: 0,
  bestStreak: 0,
  lastHit: null,       // true | false | null
};
```
Reducer:
- `CHARGE_START`: just sets `phase: "charging"` (no longer generates a band).
- `CHARGE_TICK`: unchanged.
- `LAUNCH`: unchanged.
- `LAND` (payload `{ hit, g }`): compute `nextStreak = hit ? streak + 1 : 0`, update `bestStreak = max(bestStreak, nextStreak)`, `lastHit: hit`, and `targetBand: generateBand(g, nextStreak)`.
- `RESET_TO_IDLE` (payload `{ targetBand }`): `{ ...initialGameState, targetBand }` — resets streak/bestStreak too.
- `GUESS` action and `handleGuess` callback: deleted.

Callback changes:
- `handleChargeChange`: drop the `randomTargetHeight(g)` call; just dispatch `CHARGE_START`.
- `handleLanded`: in the `mode === "game"` branch, dispatch `{ type: "LAND", hit: result.hit, g }`.
- World/mode reset effect: seed the first band on mount/switch —
  ```js
  useEffect(() => {
    dispatchGame({ type: "RESET_TO_IDLE", targetBand: mode === "game" ? generateBand(g, 0) : null });
    wasCharging.current = false;
    wasAirborne.current = false;
  }, [world, mode, g]);
  ```

JSX prop wiring: `ChargeMeter` gets `phase`, `streak`, `bestStreak`, `lastHit`, `band` (drops `isCharging`, `guess`, `onGuess`); `Astronaut` gets `targetBand` (drops `targetHeight`, `guess`); `TargetMarker` gets `band` (drops `height`).

## `src/hooks/useGravityJump.js`

Replace `targetHeight`/`guess` params with one `targetBand = null` param. `launchMeta.current = { velocity, targetBand }`. On landing:
```js
const hit = jumpTargetBand == null
  ? null
  : measuredHeight >= jumpTargetBand.min && measuredHeight <= jumpTargetBand.max;
const result = { velocity, measuredHeight, predictedHeight, matches, targetBand: jumpTargetBand, hit };
```
`guessCorrect` removed. The "learn" mode path is untouched — `targetBand` stays `null` there, so `hit` comes back `null` and is ignored.

## `src/components/Scene.jsx`

- `Astronaut`: destructure/pass `targetBand` instead of `targetHeight`/`guess`.
- `TargetMarker`: change signature to `({ band, groundY = 0, visible = true })`, render a translucent box spanning `band.min`–`band.max` plus two crisp cap lines at the edges (keeps the old marker's visual language, makes the fillable zone obvious):
  ```jsx
  export function TargetMarker({ band, groundY = 0, visible = true }) {
    if (!visible || band == null) return null;
    const { min, max } = band;
    const height = Math.max(max - min, 0.02);
    const centerY = groundY + (min + max) / 2;
    return (
      <group>
        <mesh position={[0, centerY, 0]}>
          <boxGeometry args={[2, height, 2]} />
          <meshBasicMaterial color={COLORS.accent} transparent opacity={0.25} depthWrite={false} />
        </mesh>
        <mesh position={[0, groundY + min, 0]}>
          <boxGeometry args={[2, 0.05, 2]} />
          <meshBasicMaterial color={COLORS.accent} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, groundY + max, 0]}>
          <boxGeometry args={[2, 0.05, 2]} />
          <meshBasicMaterial color={COLORS.accent} transparent opacity={0.8} />
        </mesh>
      </group>
    );
  }
  ```
  (Import `COLORS` from `../theme`.)

## `src/components/ChargeMeter.jsx` — new home for streak/hit-miss feedback

ChargeMeter already owned the guess UI it's replacing, and it's the HUD the player is actively looking at while charging, so it absorbs the new feedback (EquationPanel stays focused on the predicted-vs-measured physics readout, which is unrelated to scoring).

New props: `{ level, visible, phase, accentColor, streak, bestStreak, lastHit, band }` (drops `isCharging`, `guess`, `onGuess`).
- Remove the two guess `<button>`s.
- Add a persistent row: `Streak: {streak} · Best: {bestStreak}`.
- While a band is active (`phase !== "idle" && band`): `Land between {band.min.toFixed(2)}m – {band.max.toFixed(2)}m`.
- Right after landing (`phase === "idle" && lastHit != null`): a colored line — `COLORS.success` "Hit! Band narrows." on hit, `COLORS.accent` "Missed — streak reset." on miss. Gating on `phase === "idle"` (not the old `isCharging`) prevents the message from lingering once airborne again.
- Progress bar and the "Hold SPACE..." hint stay as-is.

## `src/components/EquationPanel.jsx`

Remove only the `lastJump?.guessCorrect` block ("Your prediction was correct/wrong"). Keep the `Predicted Xm · Measured Ym` heading and the "Formula and engine agree" matches-line — still valid for every Gauntlet jump.

## `src/components/WorldInfoPanel.jsx`

`GAME_COPY` currently describes the removed guess mechanic. Replace with something like:
> "Hold SPACE to charge your jump, then release — land your peak height inside the glowing band to keep your streak alive. Each hit narrows the band; a miss resets it."

## Edge cases (already reasoned through, no extra handling needed)

- **First round**: `generateBand(g, 0)` = full base width (decay^0 = 1), seeded on mount/switch.
- **Band regen during a previous jump's flight**: impossible — charging can't start until `grounded.current` is true, which flips before any new charge attempt.
- **World/mode switch mid-flight**: `RESET_TO_IDLE` resets streak/band immediately; for world switches `<Physics key={world}>` remounts and destroys the in-flight body anyway. For mode switches, a landing from the old mode can still fire `LAND` after switching — this is pre-existing behavior (mode is read fresh in `handleLanded` today too), not introduced by this change, and out of scope to fix here.
- **Degenerate band**: structurally prevented — width floor is 8% of range (never 0), and the center's random range is derived from the band's own half-width so it always fits inside `[playLo, playHi]`.
- **Learn mode**: untouched — `targetBand` is `null` outside game mode, so `TargetMarker` doesn't render (already gated by `{mode === "game" && ...}`) and `hit` comes back `null`.

## Verification

1. `npm run dev`, open the app, switch to Game Mode on Earth.
2. Confirm a translucent band with two edge lines appears above the astronaut, and the ChargeMeter shows "Streak: 0 · Best: 0" and the band's min/max in meters.
3. Hold/release SPACE a few times: landing inside the band should show "Hit! Band narrows.", bump the streak, and produce a visibly narrower next band; landing outside should show "Missed — streak reset." and reset the streak with a base-width band.
4. Switch planets (Moon, Jupiter) and confirm bands stay reachable (charge fully and confirm you can still hit a fresh band) and streak resets on switch.
5. Switch back to Learn Mode and confirm the original fixed-jump/comparison-strip behavior is unaffected, then back to Game Mode and confirm state resets cleanly.
6. Check the browser console for errors/warnings (removed props like `guess`/`onGuess` should not leave any dangling references), and run `npm run lint`.
