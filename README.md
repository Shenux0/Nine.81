# NINE.81 — Pipeline Prototype

This proves the full asset pipeline end to end:

**Blender-equivalent model → .glb export → gltfjsx → React Three Fiber scene → Rapier physics**

## Important note on the placeholder assets

Blender wasn't available in the environment this was built in, so
`generate-assets.mjs` procedurally builds the placeholder models instead of
exporting them from Blender by hand — but the *output* is a real, valid
`.glb` file with the same properties our actual assets will have:

- Planet: an icosphere at **subdivision level 2 (320 triangles)**, flat-shaded,
  matching the exact spec in the planet-modelling prompts.
- Astronaut: a simple flat-shaded cube stand-in.

Everything downstream of that `.glb` — the gltfjsx conversion, the React
Three Fiber scene, the Rapier physics — is exactly what will be used with the
real Blender-modelled assets in Week 4. Swapping the placeholder for the real
astronaut/planet models later is just replacing `placeholder-scene.glb` and
updating the node names in `Scene.jsx` — the rest of the pipeline doesn't change.

## What's actually demonstrated

- `generate-assets.mjs` — generates `src/assets/placeholder-scene.glb`
- `src/components/PlaceholderScene.jsx` — the **raw, untouched output of
  `npx gltfjsx`** run against that `.glb` — this is the literal pipeline step
- `src/components/Scene.jsx` — the hand-written integration layer: the planet
  rotates (`useFrame`), the astronaut is a Rapier `RigidBody` that jumps on
  spacebar
- `src/App.jsx` — Earth / Moon / Jupiter gravity switching (the same
  `Physics gravity={[0, -g, 0]}` pattern from the project proposal), a live
  g-value + jump counter readout, spacebar-triggered jump

## Run it

```bash
npm install
npm run dev
```

Open the printed `localhost` URL. Click Earth / Moon / Jupiter to switch
gravity, press **Space** to jump, and watch the astronaut's jump height
change between worlds — same core loop as the full app, running on
placeholder art.

To regenerate the placeholder asset from scratch:

```bash
node generate-assets.mjs
npx gltfjsx src/assets/placeholder-scene.glb -o src/components/PlaceholderScene.jsx -r src/assets
cp src/assets/placeholder-scene.glb public/placeholder-scene.glb
```

## Verified before delivery

- `npm run build` completes with no errors (571 modules, clean production build)
- The generated `.glb` was read back and validated: Planet_Placeholder = 320
  triangles, Astronaut_Placeholder = 12 triangles
- `npx gltfjsx` ran successfully against the `.glb` and produced a working component
- `npm run dev` boots cleanly with no runtime errors on load

Not verified: a visual screenshot of the running WebGL scene — no browser
was available in the build environment to capture one. Run it locally to see
it live before presenting.
