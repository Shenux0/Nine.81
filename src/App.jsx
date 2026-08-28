import { useState, useEffect, useRef, useReducer, useCallback } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { Planet, Astronaut, TargetMarker } from "./components/Scene";
import { Logo } from "./components/Logo";
import { PlanetSelector } from "./components/PlanetSelector";
import { WorldInfoPanel } from "./components/WorldInfoPanel";
import { EquationPanel } from "./components/EquationPanel";
import { ChargeMeter } from "./components/ChargeMeter";
import { ComparisonStrip } from "./components/ComparisonStrip";
import { WORLDS, WORLD_COLORS, COLORS } from "./theme";

const FIXED_VELOCITY = 6;
const MIN_CHARGE_VELOCITY = 3;
const MAX_CHARGE_VELOCITY = 10;
const CHARGE_TIME_MS = 1500;
const ASTRONAUT_REST_Y = 0; // world y where the astronaut's RigidBody rests (ground level)

function jumpHeight(v, g) {
  return (v * v) / (2 * g);
}

function randomTargetHeight(g) {
  const lo = 0.6 * jumpHeight(MIN_CHARGE_VELOCITY, g);
  const hi = 0.95 * jumpHeight(MAX_CHARGE_VELOCITY, g);
  return lo + Math.random() * Math.max(0, hi - lo);
}

function CameraRig({ target }) {
  const { camera } = useThree();
  useFrame(() => {
    camera.lookAt(...target);
  });
  return null;
}

const initialGameState = {
  phase: "idle", // idle | charging | airborne
  chargeLevel: 0,
  targetHeight: null,
  guess: null,
};

function gameReducer(state, action) {
  switch (action.type) {
    case "CHARGE_START":
      return { ...state, phase: "charging", chargeLevel: 0, targetHeight: action.targetHeight, guess: null };
    case "CHARGE_TICK":
      return state.phase === "charging" ? { ...state, chargeLevel: action.level } : state;
    case "GUESS":
      return { ...state, guess: action.guess };
    case "LAUNCH":
      return { ...state, phase: "airborne" };
    case "LAND":
      return { ...state, phase: "idle" };
    case "RESET_TO_IDLE":
      return initialGameState;
    default:
      return state;
  }
}

export default function App() {
  const [world, setWorld] = useState("Earth");
  const [mode, setMode] = useState("learn"); // "learn" | "game"
  const [jumps, setJumps] = useState(0);
  const [pressTick, setPressTick] = useState(0);
  const [releaseTick, setReleaseTick] = useState(0);
  const [comparisons, setComparisons] = useState({ Earth: null, Moon: null, Jupiter: null });
  const [lastJump, setLastJump] = useState(null);
  const [gameState, dispatchGame] = useReducer(gameReducer, initialGameState);

  const wasCharging = useRef(false);
  const wasAirborne = useRef(false);

  const g = WORLDS[world];

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
    dispatchGame({ type: "RESET_TO_IDLE" });
    wasCharging.current = false;
    wasAirborne.current = false;
  }, [world, mode]);

  const handleChargeChange = useCallback(
    ({ isCharging, chargeLevel }) => {
      if (mode === "game") {
        if (isCharging && !wasCharging.current) {
          dispatchGame({ type: "CHARGE_START", targetHeight: randomTargetHeight(g) });
        } else if (isCharging) {
          dispatchGame({ type: "CHARGE_TICK", level: chargeLevel });
        }
      }
      wasCharging.current = isCharging;
    },
    [mode, g]
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
        dispatchGame({ type: "LAND" });
      }
    },
    [mode, world]
  );

  const handleGuess = useCallback((guess) => {
    dispatchGame({ type: "GUESS", guess });
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", background: COLORS.background, overflow: "hidden" }}>
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
      <EquationPanel mode={mode} lastJump={lastJump} />

      {mode === "learn" && (
        <ComparisonStrip worlds={WORLDS} colors={WORLD_COLORS} comparisons={comparisons} currentWorld={world} />
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
          isCharging={gameState.phase === "charging"}
          accentColor={COLORS.accent}
          guess={gameState.guess}
          onGuess={handleGuess}
        />
      )}

      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 1, 5]} fov={45} />
        <CameraRig target={[0, 0.6, 0]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.3} />

        <Physics gravity={[0, -g, 0]} key={world}>
          <Planet />
          <Astronaut
            mode={mode}
            g={g}
            fixedVelocity={FIXED_VELOCITY}
            minChargeVelocity={MIN_CHARGE_VELOCITY}
            maxChargeVelocity={MAX_CHARGE_VELOCITY}
            chargeTimeMs={CHARGE_TIME_MS}
            targetHeight={gameState.targetHeight}
            guess={gameState.guess}
            pressSignal={pressTick}
            releaseSignal={releaseTick}
            onLanded={handleLanded}
            onChargeChange={handleChargeChange}
            onAirborneChange={handleAirborneChange}
          />
          {mode === "game" && (
            <TargetMarker
              height={gameState.targetHeight}
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
