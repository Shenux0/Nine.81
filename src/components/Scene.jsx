import { useRef, useEffect } from "react";
import { useGLTF, Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { useGravityJump } from "../hooks/useGravityJump";
import { COLORS } from "../theme";

// Both components read geometry/materials from the SAME .glb that gltfjsx
// converted (see PlaceholderScene.jsx for the raw auto-generated version).
// This file is the hand-written integration layer on top of that output.

// Each world's .glb loads as a group (moon.glb has two materials: surface +
// crater floor), so render the whole scene. Everything is sized to the
// placeholder's radius of 4 and dropped by that radius so its top sits at y = 0.
// moon.glb is a ~1-unit-radius sphere; earth.glb and jupiter.glb are already ~4 units.
const PLANET_RADIUS = 4;
const PLANET_MODELS = {
  Earth: { url: "/models/earth.glb", scale: 1 },
  Moon: { url: "/models/moon.glb", scale: PLANET_RADIUS },
  Jupiter: { url: "/models/jupiter.glb", scale: 1 },
};
const DEFAULT_PLANET = PLANET_MODELS.Earth;

export function Planet({ world, ...props }) {
  const { url, scale } = PLANET_MODELS[world] ?? DEFAULT_PLANET;
  const { scene } = useGLTF(url);
  const ref = useRef();

  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.15; // slow constant spin
  });

  return (
    <primitive
      ref={ref}
      object={scene}
      scale={scale}
      position={[0, -PLANET_RADIUS, 0]}
      {...props}
    />
  );
}

export function Astronaut({
  mode,
  g,
  fixedVelocity,
  minChargeVelocity,
  maxChargeVelocity,
  chargeTimeMs,
  targetBand,
  pressSignal,
  releaseSignal,
  onLanded,
  onChargeChange,
  onAirborneChange,
  ...props
}) {
  const { nodes, materials } = useGLTF("/placeholder-scene.glb");

  const {
    bodyRef,
    handleCollisionEnter,
    handlePressStart,
    handlePressEnd,
    isAirborne,
    isCharging,
    chargeLevel,
  } = useGravityJump({
    mode,
    g,
    fixedVelocity,
    minChargeVelocity,
    maxChargeVelocity,
    chargeTimeMs,
    targetBand,
  });

  useEffect(() => {
    if (pressSignal) handlePressStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressSignal]);

  useEffect(() => {
    if (releaseSignal) handlePressEnd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseSignal]);

  useEffect(() => {
    if (onChargeChange) onChargeChange({ isCharging, chargeLevel });
  }, [isCharging, chargeLevel, onChargeChange]);

  useEffect(() => {
    if (onAirborneChange) onAirborneChange(isAirborne);
  }, [isAirborne, onAirborneChange]);

  return (
    <>
      <RigidBody
        ref={bodyRef}
        colliders="cuboid"
        position={[0, 2, 0]}
        ccd
        onCollisionEnter={() => {
          const result = handleCollisionEnter();
          if (result && onLanded) onLanded(result);
        }}
      >
        <mesh
          geometry={nodes.Astronaut_Placeholder.geometry}
          material={materials.Astronaut_Placeholder_mat}
          position={[0, 0.4, 0]}
          {...props}
        />
      </RigidBody>
      {/* Outside the RigidBody on purpose: colliders="cuboid" is auto-fitted to every
          child mesh, so the arrow would otherwise become part of the astronaut's hitbox. */}
      {mode === "learn" && <AccelerationArrow g={g} bodyRef={bodyRef} />}
    </>
  );
}

// Gravity's pull on the astronaut: a downward arrow whose length scales with g
// (short on the Moon, long on Jupiter), plus a label with the constant
// acceleration and the live vertical velocity — v changes every frame, a never does.
// The arrow is anchored at its TIP, just above the ground beside the astronaut's
// feet, and grows upward with g — so even Jupiter's long arrow never sinks into
// the planet (the surface also curves away below y = 0 at this x offset).
const ARROW_X = 0.9;
const ARROW_TIP_Y = 0.15;
const ARROW_HEAD_LENGTH = 0.22;

function AccelerationArrow({ g, bodyRef }) {
  const groupRef = useRef();
  const velocityRef = useRef();
  // Moon ≈ 0.19, Earth ≈ 0.40, Jupiter ≈ 0.77 — Jupiter's stays about astronaut height.
  const shaftLength = 0.15 + g * 0.025;
  const arrowTop = ARROW_HEAD_LENGTH + shaftLength;

  useFrame(() => {
    const body = bodyRef.current;
    if (!body || !groupRef.current || !velocityRef.current) return;
    const p = body.translation();
    groupRef.current.position.set(p.x + ARROW_X, p.y + ARROW_TIP_Y, p.z);
    const vy = body.linvel().y;
    velocityRef.current.textContent = `v = ${vy >= 0 ? "+" : "−"}${Math.abs(vy).toFixed(2)} m/s ${vy >= 0.05 ? "↑" : vy <= -0.05 ? "↓" : ""}`;
  });

  return (
    <group ref={groupRef} position={[ARROW_X, ARROW_TIP_Y, 0]}>
      <mesh position={[0, ARROW_HEAD_LENGTH + shaftLength / 2, 0]}>
        <cylinderGeometry args={[0.045, 0.045, shaftLength, 12]} />
        <meshBasicMaterial color={COLORS.accent} />
      </mesh>
      <mesh position={[0, ARROW_HEAD_LENGTH / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.12, ARROW_HEAD_LENGTH, 16]} />
        <meshBasicMaterial color={COLORS.accent} />
      </mesh>
      {/* drei's default z-index range is huge — keep the label under the UI panels and popups. */}
      <Html position={[0.2, arrowTop - 0.05, 0]} zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div
          style={{
            whiteSpace: "nowrap",
            fontFamily: "system-ui, sans-serif",
            fontSize: 14,
            fontWeight: 700,
            color: "white",
            textShadow: "0 1px 3px black",
          }}
        >
          <div style={{ color: COLORS.accent }}>a = {g.toFixed(2)} m/s² ↓</div>
          <div ref={velocityRef} style={{ fontWeight: 500, color: COLORS.textOnDark }}>
            v = +0.00 m/s
          </div>
        </div>
      </Html>
    </group>
  );
}

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

useGLTF.preload("/placeholder-scene.glb");
Object.values(PLANET_MODELS).forEach(({ url }) => useGLTF.preload(url));
