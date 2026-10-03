import { useCallback, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

export function useGravityJump({
  mode,
  g,
  fixedVelocity = 6,
  minChargeVelocity = 3,
  maxChargeVelocity = 10,
  chargeTimeMs = 1500,
  targetBand = null,
}) {
  const bodyRef = useRef();
  const grounded = useRef(true);
  const startY = useRef(0);
  const peakY = useRef(0);
  const chargeStart = useRef(null);
  const launchMeta = useRef({});

  const [isAirborne, setIsAirborne] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeLevel, setChargeLevel] = useState(0);
  const [lastJump, setLastJump] = useState(null);

  const launch = useCallback(
    (velocity) => {
      const body = bodyRef.current;
      if (!body) return;
      startY.current = body.translation().y;
      peakY.current = startY.current;
      body.setLinvel({ x: 0, y: velocity, z: 0 }, true);
      grounded.current = false;
      setIsAirborne(true);
      launchMeta.current = { velocity, targetBand };
    },
    [targetBand]
  );

  const handlePressStart = useCallback(() => {
    if (!grounded.current) return;
    if (mode === "learn") {
      launch(fixedVelocity);
    } else {
      chargeStart.current = performance.now();
      setIsCharging(true);
      setChargeLevel(0);
    }
  }, [mode, fixedVelocity, launch]);

  const handlePressEnd = useCallback(() => {
    if (mode === "game" && chargeStart.current != null) {
      const elapsed = performance.now() - chargeStart.current;
      const t = clamp01(elapsed / chargeTimeMs);
      const velocity = lerp(minChargeVelocity, maxChargeVelocity, t);
      chargeStart.current = null;
      setIsCharging(false);
      setChargeLevel(0);
      launch(velocity);
    }
  }, [mode, chargeTimeMs, minChargeVelocity, maxChargeVelocity, launch]);

  useFrame(() => {
    if (isCharging && chargeStart.current != null) {
      const elapsed = performance.now() - chargeStart.current;
      setChargeLevel(clamp01(elapsed / chargeTimeMs));
    }
    if (isAirborne && bodyRef.current) {
      const y = bodyRef.current.translation().y;
      if (y > peakY.current) peakY.current = y;
    }
  });

  const handleCollisionEnter = useCallback(() => {
    if (grounded.current) return;
    grounded.current = true;
    setIsAirborne(false);

    const meta = launchMeta.current || {};
    const velocity = meta.velocity ?? fixedVelocity;
    const jumpTargetBand = meta.targetBand ?? null;

    const measuredHeight = Math.max(0, peakY.current - startY.current);
    const predictedHeight = (velocity * velocity) / (2 * g);
    const tolerance = Math.max(0.05, predictedHeight * 0.03);
    const matches = Math.abs(measuredHeight - predictedHeight) <= tolerance;
    const hit =
      jumpTargetBand == null
        ? null
        : measuredHeight >= jumpTargetBand.min && measuredHeight <= jumpTargetBand.max;

    const result = {
      velocity,
      measuredHeight,
      predictedHeight,
      matches,
      targetBand: jumpTargetBand,
      hit,
    };
    setLastJump(result);
    return result;
  }, [fixedVelocity, g]);

  return {
    bodyRef,
    handleCollisionEnter,
    handlePressStart,
    handlePressEnd,
    isAirborne,
    isCharging,
    chargeLevel,
    lastJump,
  };
}
