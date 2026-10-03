import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { useGravityJump } from "../hooks/useGravityJump";
import { COLORS } from "../theme";

// Both components read geometry/materials from the SAME .glb that gltfjsx
// converted (see PlaceholderScene.jsx for the raw auto-generated version).
// This file is the hand-written integration layer on top of that output.

// moon.glb is a ~1-unit-radius sphere with two materials (surface + crater
// floor), so it loads as a group rather than a single mesh — render the whole
// scene. Scaled to the placeholder's radius of 4 so its top sits at y = 0.
const MOON_RADIUS = 4;

export function Planet(props) {
  const { scene } = useGLTF("/models/moon.glb");
  const ref = useRef();

  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.15; // slow constant spin
  });

  return (
    <primitive
      ref={ref}
      object={scene}
      scale={MOON_RADIUS}
      position={[0, -MOON_RADIUS, 0]}
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
useGLTF.preload("/models/moon.glb");
