import type { BufferGeometry } from "three";

import type { ThreeDModelMetrics } from "./threeDQuoteEstimator";

interface Vertex {
  x: number;
  y: number;
  z: number;
}

function triangleArea(a: Vertex, b: Vertex, c: Vertex): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const abz = b.z - a.z;
  const acx = c.x - a.x;
  const acy = c.y - a.y;
  const acz = c.z - a.z;
  const crossX = aby * acz - abz * acy;
  const crossY = abz * acx - abx * acz;
  const crossZ = abx * acy - aby * acx;

  return 0.5 * Math.hypot(crossX, crossY, crossZ);
}

function signedTetrahedronVolume(a: Vertex, b: Vertex, c: Vertex): number {
  return (
    a.x * (b.y * c.z - b.z * c.y) +
    a.y * (b.z * c.x - b.x * c.z) +
    a.z * (b.x * c.y - b.y * c.x)
  ) / 6;
}

export function analyzeThreeDGeometry(
  geometry: BufferGeometry,
  unitScaleMillimetres = 1,
): ThreeDModelMetrics {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();

  if (
    !position ||
    !Number.isFinite(unitScaleMillimetres) ||
    unitScaleMillimetres <= 0
  ) {
    throw new Error("The STL geometry could not be analyzed.");
  }

  const vertexReferenceCount = index?.count ?? position.count;

  if (vertexReferenceCount < 3 || vertexReferenceCount % 3 !== 0) {
    throw new Error("The STL geometry does not contain complete triangles.");
  }

  const readVertex = (referenceIndex: number): Vertex => {
    const vertexIndex = index ? index.getX(referenceIndex) : referenceIndex;

    return {
      x: position.getX(vertexIndex) * unitScaleMillimetres,
      y: position.getY(vertexIndex) * unitScaleMillimetres,
      z: position.getZ(vertexIndex) * unitScaleMillimetres,
    };
  };

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  let signedVolumeMm3 = 0;
  let surfaceAreaMm2 = 0;

  const includeInBounds = (vertex: Vertex) => {
    minX = Math.min(minX, vertex.x);
    minY = Math.min(minY, vertex.y);
    minZ = Math.min(minZ, vertex.z);
    maxX = Math.max(maxX, vertex.x);
    maxY = Math.max(maxY, vertex.y);
    maxZ = Math.max(maxZ, vertex.z);
  };

  for (let offset = 0; offset < vertexReferenceCount; offset += 3) {
    const a = readVertex(offset);
    const b = readVertex(offset + 1);
    const c = readVertex(offset + 2);

    includeInBounds(a);
    includeInBounds(b);
    includeInBounds(c);
    signedVolumeMm3 += signedTetrahedronVolume(a, b, c);
    surfaceAreaMm2 += triangleArea(a, b, c);
  }

  const volumeCm3 = Math.abs(signedVolumeMm3) / 1000;
  const surfaceAreaCm2 = surfaceAreaMm2 / 100;
  const dimensionsMm = {
    x: maxX - minX,
    y: maxY - minY,
    z: maxZ - minZ,
  };

  if (
    !Number.isFinite(volumeCm3) ||
    volumeCm3 <= 0 ||
    !Number.isFinite(surfaceAreaCm2) ||
    surfaceAreaCm2 <= 0 ||
    dimensionsMm.x <= 0 ||
    dimensionsMm.y <= 0 ||
    dimensionsMm.z <= 0
  ) {
    throw new Error(
      "The STL appears open, flat, or otherwise unsuitable for an automatic estimate.",
    );
  }

  return {
    volumeCm3,
    surfaceAreaCm2,
    dimensionsMm,
    triangleCount: vertexReferenceCount / 3,
  };
}
