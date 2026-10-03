import { useMemo } from "react";
import * as THREE from "three";

// A static, physically-flavoured sky: stars don't twinkle or drift in vacuum,
// their colours follow blackbody temperature (spectral class), most are faint
// with only a handful bright, and they crowd along a tilted Milky Way band.

// Approximate blackbody colours per spectral class, weighted roughly by how
// often each shows up among naked-eye stars.
const SPECTRAL_CLASSES = [
  { color: "#9bb0ff", weight: 0.04 }, // O/B — blue
  { color: "#aabfff", weight: 0.08 }, // B — blue-white
  { color: "#cad7ff", weight: 0.18 }, // A — white-blue
  { color: "#f8f7ff", weight: 0.2 }, // F — white
  { color: "#fff4ea", weight: 0.2 }, // G — yellow-white (Sun-like)
  { color: "#ffd2a1", weight: 0.22 }, // K — orange
  { color: "#ffcc6f", weight: 0.08 }, // M — orange-red
];

const SKY_RADIUS = 400;
const MILKY_WAY_FRACTION = 0.45; // share of faint stars concentrated in the galactic band
const MILKY_WAY_WIDTH = 0.12; // angular spread of the band (radians-ish)
const MILKY_WAY_TILT = new THREE.Euler(THREE.MathUtils.degToRad(62), 0, THREE.MathUtils.degToRad(25));

// Three magnitude layers: point size is in screen pixels, brightness scales colour.
const LAYERS = [
  { count: 7000, size: 1.1, minBrightness: 0.25, maxBrightness: 0.55, band: true },
  { count: 900, size: 1.8, minBrightness: 0.55, maxBrightness: 0.85, band: true },
  { count: 70, size: 2.8, minBrightness: 0.9, maxBrightness: 1, band: false },
];

function pickSpectralColor() {
  let r = Math.random();
  for (const { color, weight } of SPECTRAL_CLASSES) {
    if ((r -= weight) <= 0) return color;
  }
  return SPECTRAL_CLASSES[SPECTRAL_CLASSES.length - 1].color;
}

function randomDirection(inBand, tilt) {
  const v = new THREE.Vector3();
  if (inBand) {
    // Point near the galactic plane (y ≈ 0), then tilt the whole plane across the sky.
    const theta = Math.random() * Math.PI * 2;
    const lat = (Math.random() + Math.random() + Math.random() - 1.5) * MILKY_WAY_WIDTH;
    v.set(Math.cos(theta) * Math.cos(lat), Math.sin(lat), Math.sin(theta) * Math.cos(lat));
    return v.applyEuler(tilt);
  }
  // Uniform on the sphere.
  const u = Math.random() * 2 - 1;
  const theta = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return v.set(s * Math.cos(theta), u, s * Math.sin(theta));
}

function buildLayer({ count, minBrightness, maxBrightness, band }) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const inBand = band && Math.random() < MILKY_WAY_FRACTION;
    const p = randomDirection(inBand, MILKY_WAY_TILT).multiplyScalar(SKY_RADIUS);
    positions.set([p.x, p.y, p.z], i * 3);
    // Skew towards the dim end — bright stars are rare.
    const brightness = minBrightness + (maxBrightness - minBrightness) * Math.pow(Math.random(), 3);
    c.set(pickSpectralColor()).multiplyScalar(brightness);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function StarField() {
  const layers = useMemo(() => LAYERS.map((layer) => ({ ...layer, geometry: buildLayer(layer) })), []);

  return (
    <group>
      {layers.map(({ geometry, size }, i) => (
        <points key={i} geometry={geometry}>
          <pointsMaterial size={size} sizeAttenuation={false} vertexColors depthWrite={false} toneMapped={false} />
        </points>
      ))}
    </group>
  );
}
