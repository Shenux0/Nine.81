import { useState, useEffect, useRef, useReducer, useCallback } from "react";
import * as THREE from "three";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { Planet, Astronaut, TargetMarker } from "./components/Scene";
import { StarField } from "./components/StarField";
import { Logo } from "./components/Logo";
import { PlanetSelector } from "./components/PlanetSelector";
import { WorldInfoPanel } from "./components/WorldInfoPanel";
import { EquationPanel } from "./components/EquationPanel";
import { ChargeMeter } from "./components/ChargeMeter";
import { ComparisonStrip } from "./components/ComparisonStrip";
import { GravityGraph } from "./components/GravityGraph";
import { WORLDS, WORLD_COLORS, CHART_COLORS, COLORS } from "./theme";

// Roughly a strong human jump. Gravity stays real per world, so heights still scale
// exactly with 1/g (Earth ≈ 0.62 m, Moon ≈ 3.78 m, Jupiter ≈ 0.25 m) — but the Moon
// jump stays low enough that the camera doesn't have to retreat far to frame it.
const FIXED_VELOCITY = 3.5;
const MIN_CHARGE_VELOCITY = 3;
const MAX_CHARGE_VELOCITY = 10;
const CHARGE_TIME_MS = 1500;
const ASTRONAUT_REST_Y = 0; // world y where the astronaut's RigidBody rests (ground level)

const IDLE_FOCUS_HEIGHT = 1.6; // comfortable close-up height when nothing's charging
const CAMERA_BASE_FOV = 45; // never zoom in tighter than the original default
const CAMERA_MAX_FOV = 95; // widen (rather than only retreat) to fit very tall bands, e.g. the Moon
const CAMERA_MIN_DISTANCE = 8;
const CAMERA_MAX_DISTANCE = 24;
const CAMERA_GROUND_MARGIN = 5; // frame a bit more than half the planet (radius 4) below the ground line
const CAMERA_PADDING = 1.15; // extra headroom above the focus height
const CAMERA_DISTANCE_GROWTH = 0.3; // how much distance grows per meter of framed height
const CAMERA_DAMPING = 4; // higher = snappier follow

function jumpHeight(v, g) {
  return (v * v) / (2 * g);
}

const BASE_WIDTH_FRACTION = 0.35;
const MIN_WIDTH_FRACTION = 0.08;
const WIDTH_DECAY = 0.8;

function generateBand(g, streak) {
  const reachableLo = jumpHeight(MIN_CHARGE_VELOCITY, g);
  const reachableHi = jumpHeight(MAX_CHARGE_VELOCITY, g);
  const range = reachableHi - reachableLo;
  const playLo = 0.6 * reachableLo;
  const playHi = 0.95 * reachableHi;
  const baseWidth = BASE_WIDTH_FRACTION * range;
  const minWidth = MIN_WIDTH_FRACTION * range;
  const width = Math.min(
    minWidth + (baseWidth - minWidth) * Math.pow(WIDTH_DECAY, streak),
    (playHi - playLo) * 0.9 // defensive clamp, shouldn't bind
  );
  const half = width / 2;
  const centerLo = playLo + half;
  const centerHi = playHi - half;
  const center =
    centerHi > centerLo ? centerLo + Math.random() * (centerHi - centerLo) : (playLo + playHi) / 2;
  return { min: center - half, max: center + half };
}

function CameraRig({ focusHeight, groundY = 0 }) {
  const { camera } = useThree();
  const lookAt = useRef(new THREE.Vector3(0, 0.6, 0));

  useFrame((_, delta) => {
    // Total vertical extent we need in frame: ground margin + the focus height, with headroom.
    const totalHeight = (focusHeight + CAMERA_GROUND_MARGIN) * CAMERA_PADDING;

    // Distance grows with height (up to a cap) — beyond that, widen the FOV instead of
    // retreating forever, so tall Moon bands don't need an absurd camera distance.
    const desiredDistance = THREE.MathUtils.clamp(
      CAMERA_MIN_DISTANCE + totalHeight * CAMERA_DISTANCE_GROWTH,
      CAMERA_MIN_DISTANCE,
      CAMERA_MAX_DISTANCE
    );
    const requiredFovDeg = THREE.MathUtils.radToDeg(Math.atan(totalHeight / 2 / desiredDistance)) * 2;
    const desiredFov = THREE.MathUtils.clamp(requiredFovDeg, CAMERA_BASE_FOV, CAMERA_MAX_FOV);

    // Anchor the BOTTOM of the frame at the ground/planet (not the midpoint of the range) —
    // this is what keeps the planet visible even when the top of a tall band gets clipped.
    const desiredHalfHeight = desiredDistance * Math.tan(THREE.MathUtils.degToRad(desiredFov) / 2);
    const desiredCenterY = groundY - CAMERA_GROUND_MARGIN + desiredHalfHeight;

    // eslint-disable-next-line react/immutability -- imperative Three.js camera API, not React state
    camera.fov = THREE.MathUtils.damp(camera.fov, desiredFov, CAMERA_DAMPING, delta);
    camera.updateProjectionMatrix();

    camera.position.set(
      THREE.MathUtils.damp(camera.position.x, 0, CAMERA_DAMPING, delta),
      THREE.MathUtils.damp(camera.position.y, groundY + 1, CAMERA_DAMPING, delta),
      THREE.MathUtils.damp(camera.position.z, desiredDistance, CAMERA_DAMPING, delta)
    );

    lookAt.current.set(
      THREE.MathUtils.damp(lookAt.current.x, 0, CAMERA_DAMPING, delta),
      THREE.MathUtils.damp(lookAt.current.y, desiredCenterY, CAMERA_DAMPING, delta),
      THREE.MathUtils.damp(lookAt.current.z, 0, CAMERA_DAMPING, delta)
    );
    camera.lookAt(lookAt.current);
  });

  return null;
}

const initialGameState = {
  phase: "idle", // idle | charging | airborne
  chargeLevel: 0,
  targetBand: null, // { min, max } | null
  streak: 0,
  bestStreak: 0,
  lastHit: null, // true | false | null
};

function gameReducer(state, action) {
  switch (action.type) {
    case "CHARGE_START":
      return { ...state, phase: "charging", chargeLevel: 0 };
    case "CHARGE_TICK":
      return state.phase === "charging" ? { ...state, chargeLevel: action.level } : state;
    case "LAUNCH":
      return { ...state, phase: "airborne" };
    case "LAND": {
      const nextStreak = action.hit ? state.streak + 1 : 0;
      return {
        ...state,
        phase: "idle",
        lastHit: action.hit,
        streak: nextStreak,
        bestStreak: Math.max(state.bestStreak, nextStreak),
        targetBand: generateBand(action.g, nextStreak),
      };
    }
    case "RESET_TO_IDLE":
      return { ...initialGameState, targetBand: action.targetBand ?? null };
    default:
      return state;
  }
}

export default function App() {
  const [world, setWorld] = useState("Earth");
  const [mode, setMode] = useState("learn"); // "learn" | "game"
  const [showGraph, setShowGraph] = useState(false);
  const closeGraph = useCallback(() => setShowGraph(false), []);
  const [jumps, setJumps] = useState(0);
  const [pressTick, setPressTick] = useState(0);
  const [releaseTick, setReleaseTick] = useState(0);
  const [comparisons, setComparisons] = useState({ Earth: null, Moon: null, Jupiter: null });
  const [lastJump, setLastJump] = useState(null);
  const [gameState, dispatchGame] = useReducer(gameReducer, initialGameState);

  const wasCharging = useRef(false);
  const wasAirborne = useRef(false);

  const g = WORLDS[world];

  const focusHeight =
    mode === "learn"
      ? jumpHeight(FIXED_VELOCITY, g)
      : gameState.phase === "idle"
        ? IDLE_FOCUS_HEIGHT
        : jumpHeight(MAX_CHARGE_VELOCITY, g);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) {
          setPressTick((t) => t + 1);
          setJumps((j) => j + 1);
        }
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        setReleaseTick((t) => t + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // World/mode switches remount Physics (via key={world}) or otherwise invalidate
  // any in-flight charge/jump — keep the game phase machine in sync.
  useEffect(() => {
    dispatchGame({ type: "RESET_TO_IDLE", targetBand: mode === "game" ? generateBand(g, 0) : null });
    wasCharging.current = false;
    wasAirborne.current = false;
  }, [world, mode, g]);

  const handleChargeChange = useCallback(
    ({ isCharging, chargeLevel }) => {
      if (mode === "game") {
        if (isCharging && !wasCharging.current) {
          dispatchGame({ type: "CHARGE_START" });
        } else if (isCharging) {
          dispatchGame({ type: "CHARGE_TICK", level: chargeLevel });
        }
      }
      wasCharging.current = isCharging;
    },
    [mode]
  );

  const handleAirborneChange = useCallback(
    (isAirborne) => {
      if (mode === "game" && isAirborne && !wasAirborne.current) {
        dispatchGame({ type: "LAUNCH" });
      }
      wasAirborne.current = isAirborne;
    },
    [mode]
  );

  const handleLanded = useCallback(
    (result) => {
      setLastJump(result);
      if (mode === "learn") {
        setComparisons((prev) => ({
          ...prev,
          [world]: { last: result.measuredHeight, best: Math.max(prev[world]?.best ?? 0, result.measuredHeight) },
        }));
      } else {
        dispatchGame({ type: "LAND", hit: result.hit, g });
      }
    },
    [mode, world, g]
  );

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: COLORS.spaceBackground, overflow: "hidden" }}>
      <Logo sessionJumps={jumps} />

      <PlanetSelector world={world} worlds={WORLDS} activeColor={COLORS.selectorActive} onSelect={setWorld} />

      <button
        onClick={() => setMode(mode === "learn" ? "game" : "learn")}
        style={{
          position: "absolute",
          top: 24,
          right: 32,
          zIndex: 10,
          padding: "12px 28px",
          borderRadius: 24,
          border: "none",
          background: COLORS.selectorActive,
          color: "white",
          fontFamily: "system-ui, sans-serif",
          fontSize: 15,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {mode === "learn" ? "Try What You Learned!" : "← Back to Learn Mode"}
      </button>

      <WorldInfoPanel mode={mode} world={world} />
      <EquationPanel mode={mode} lastJump={lastJump} g={g} />

      {mode === "learn" && (
        <ComparisonStrip worlds={WORLDS} colors={WORLD_COLORS} comparisons={comparisons} currentWorld={world} />
      )}
      {mode === "learn" && (
        <>
          {showGraph && (
            <GravityGraph
              worlds={WORLDS}
              colors={CHART_COLORS}
              velocity={FIXED_VELOCITY}
              currentWorld={world}
              onClose={closeGraph}
            />
          )}
          <button
            onClick={(e) => {
              setShowGraph(true);
              e.currentTarget.blur(); // keep SPACE for jumping, not re-clicking this button
            }}
            aria-haspopup="dialog"
            style={{
              position: "absolute",
              right: 32,
              bottom: 24,
              zIndex: 11,
              padding: "10px 22px",
              borderRadius: 22,
              border: "none",
              background: COLORS.selectorActive,
              color: "white",
              fontFamily: "system-ui, sans-serif",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            📈 Compare on a graph
          </button>
        </>
      )}

      {mode === "learn" ? (
        <p
          style={{
            position: "absolute",
            bottom: "16%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: COLORS.textOnLight,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          ( Press space bar )
        </p>
      ) : (
        <ChargeMeter
          level={gameState.chargeLevel}
          visible
          phase={gameState.phase}
          accentColor={COLORS.accent}
          streak={gameState.streak}
          bestStreak={gameState.bestStreak}
          lastHit={gameState.lastHit}
          band={gameState.targetBand}
        />
      )}

      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 1, 10]} fov={45} />
        <CameraRig focusHeight={focusHeight} groundY={ASTRONAUT_REST_Y} />
        <StarField />
        {/* One hard "sun" light; only a little fill since there's no atmosphere to scatter light. */}
        <ambientLight intensity={0.25} />
        <directionalLight position={[6, 8, 5]} intensity={2} />

        <Physics gravity={[0, -g, 0]} key={world}>
          <Planet world={world} />
          <Astronaut
            mode={mode}
            g={g}
            fixedVelocity={FIXED_VELOCITY}
            minChargeVelocity={MIN_CHARGE_VELOCITY}
            maxChargeVelocity={MAX_CHARGE_VELOCITY}
            chargeTimeMs={CHARGE_TIME_MS}
            targetBand={gameState.targetBand}
            pressSignal={pressTick}
            releaseSignal={releaseTick}
            onLanded={handleLanded}
            onChargeChange={handleChargeChange}
            onAirborneChange={handleAirborneChange}
          />
          {mode === "game" && (
            <TargetMarker
              band={gameState.targetBand}
              groundY={ASTRONAUT_REST_Y}
              visible={gameState.phase !== "idle"}
            />
          )}
          {/* Simple flat ground standing in for the planet's surface collision.
              Thick on purpose: a thin plate risks the astronaut tunnelling
              through it during a fast fall (e.g. under Jupiter's gravity). */}
          <RigidBody type="fixed" position={[0, -2, 0]}>
            <CuboidCollider args={[10, 2, 10]} />
          </RigidBody>
        </Physics>
      </Canvas>
    </div>
  );
}
