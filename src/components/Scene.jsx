import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RigidBody } from "@react-three/rapier";
import { useGravityJump } from "../hooks/useGravityJump";

// Both components read geometry/materials from the SAME .glb that gltfjsx
// converted (see PlaceholderScene.jsx for the raw auto-generated version).
// This file is the hand-written integration layer on top of that output.

export function Planet(props) {
  const { nodes, materials } = useGLTF("/placeholder-scene.glb");
  const ref = useRef();

  useFrame((_, delta) => {
    ref.current.rotation.y += delta * 0.15; // slow constant spin
  });

  return (
    <mesh
      ref={ref}
      geometry={nodes.Planet_Placeholder.geometry}
      material={materials.Planet_Placeholder_mat}
      position={[0, -4, 0]}
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
  targetHeight,
  guess,
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
    targetHeight,
    guess,
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

export function TargetMarker({ height, groundY = 0, visible = true }) {
  if (!visible || height == null) return null;
  return (
    <mesh position={[0, groundY + height, 0]}>
      <boxGeometry args={[2, 0.05, 2]} />
      <meshBasicMaterial color="#E8632D" transparent opacity={0.6} />
    </mesh>
  );
}

useGLTF.preload("/placeholder-scene.glb");
