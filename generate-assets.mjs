// generate-assets.mjs
// Stands in for the "export from Blender" step: produces a real, valid .glb
// with the same characteristics our actual Blender assets will have —
// low-poly, flat-shaded (duplicated per-face vertices with flat normals),
// solid placeholder colors. This lets us prove out the rest of the pipeline
// (glb -> gltfjsx -> React Three Fiber) before real modelling is done.

import { Document, NodeIO } from "@gltf-transform/core";

function normalize([x, y, z]) {
  const len = Math.sqrt(x * x + y * y + z * z);
  return [x / len, y / len, z / len];
}
function midpoint(a, b) {
  return normalize([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
}

function buildIcosphere(subdivisions, radius) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(normalize);
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  for (let s = 0; s < subdivisions; s++) {
    const newFaces = [];
    const midCache = new Map();
    const getMid = (i1, i2) => {
      const key = i1 < i2 ? `${i1}_${i2}` : `${i2}_${i1}`;
      if (midCache.has(key)) return midCache.get(key);
      const m = midpoint(verts[i1], verts[i2]);
      verts.push(m);
      const idx = verts.length - 1;
      midCache.set(key, idx);
      return idx;
    };
    for (const [a, b, c] of faces) {
      const ab = getMid(a, b), bc = getMid(b, c), ca = getMid(c, a);
      newFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    faces = newFaces;
  }

  // Flatten: duplicate vertices per-face so each face gets its own flat normal
  const flatPositions = [];
  const flatNormals = [];
  faces.forEach(([a, b, c]) => {
    const pa = verts[a].map((v) => v * radius);
    const pb = verts[b].map((v) => v * radius);
    const pc = verts[c].map((v) => v * radius);
    const u = [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]];
    const v = [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]];
    const n = normalize([
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ]);
    flatPositions.push(...pa, ...pb, ...pc);
    flatNormals.push(...n, ...n, ...n);
  });

  return { positions: flatPositions, normals: flatNormals, count: faces.length * 3 };
}

function buildFlatCube(size) {
  const h = size / 2;
  const facesDef = [
    { n: [0, 0, 1], v: [[-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]] },
    { n: [0, 0, -1], v: [[h, -h, -h], [-h, -h, -h], [-h, h, -h], [h, h, -h]] },
    { n: [0, 1, 0], v: [[-h, h, h], [h, h, h], [h, h, -h], [-h, h, -h]] },
    { n: [0, -1, 0], v: [[-h, -h, -h], [h, -h, -h], [h, -h, h], [-h, -h, h]] },
    { n: [1, 0, 0], v: [[h, -h, h], [h, -h, -h], [h, h, -h], [h, h, h]] },
    { n: [-1, 0, 0], v: [[-h, -h, -h], [-h, -h, h], [-h, h, h], [-h, h, -h]] },
  ];
  const positions = [];
  const normals = [];
  facesDef.forEach(({ n, v }) => {
    const [v0, v1, v2, v3] = v;
    positions.push(...v0, ...v1, ...v2, ...v0, ...v2, ...v3);
    for (let i = 0; i < 6; i++) normals.push(...n);
  });
  return { positions, normals, count: positions.length / 3 };
}

function addMesh(doc, buffer, { positions, normals, count }, name, color) {
  const posAccessor = doc.createAccessor(`${name}_pos`)
    .setType("VEC3").setArray(new Float32Array(positions)).setBuffer(buffer);
  const normAccessor = doc.createAccessor(`${name}_norm`)
    .setType("VEC3").setArray(new Float32Array(normals)).setBuffer(buffer);

  const material = doc.createMaterial(`${name}_mat`)
    .setBaseColorFactor([...color, 1])
    .setRoughnessFactor(0.85)
    .setMetallicFactor(0.0);

  const prim = doc.createPrimitive()
    .setAttribute("POSITION", posAccessor)
    .setAttribute("NORMAL", normAccessor)
    .setMaterial(material);

  const mesh = doc.createMesh(name).addPrimitive(prim);
  const node = doc.createNode(name).setMesh(mesh);
  return node;
}

async function main() {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene("Scene");

  // Planet placeholder — icosphere, subdivision 2, radius 4 (matches project spec)
  const planetGeo = buildIcosphere(2, 4.0);
  const planetNode = addMesh(doc, buffer, planetGeo, "Planet_Placeholder", [0.176, 0.435, 0.667]); // Earth blue
  planetNode.setTranslation([0, -4, 0]);
  scene.addChild(planetNode);

  // Astronaut placeholder — simple flat-shaded cube
  const cubeGeo = buildFlatCube(0.8);
  const cubeNode = addMesh(doc, buffer, cubeGeo, "Astronaut_Placeholder", [0.9, 0.9, 0.9]);
  cubeNode.setTranslation([0, 0.4, 0]);
  scene.addChild(cubeNode);

  doc.getRoot().setDefaultScene(scene);

  const io = new NodeIO();
  await io.write("./src/assets/placeholder-scene.glb", doc);
  console.log("Wrote src/assets/placeholder-scene.glb");
}

main().catch((e) => { console.error(e); process.exit(1); });
