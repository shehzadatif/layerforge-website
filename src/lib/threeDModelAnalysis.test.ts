import { BufferGeometry, Float32BufferAttribute } from "three";
import { describe, expect, it } from "vitest";

import { analyzeThreeDGeometry } from "./threeDModelAnalysis";

function cubeGeometry(size: number): BufferGeometry {
  const p = size;
  const vertices = [
    // bottom
    0, 0, 0, p, p, 0, p, 0, 0,
    0, 0, 0, 0, p, 0, p, p, 0,
    // top
    0, 0, p, p, 0, p, p, p, p,
    0, 0, p, p, p, p, 0, p, p,
    // front
    0, 0, 0, p, 0, 0, p, 0, p,
    0, 0, 0, p, 0, p, 0, 0, p,
    // back
    0, p, 0, 0, p, p, p, p, p,
    0, p, 0, p, p, p, p, p, 0,
    // left
    0, 0, 0, 0, 0, p, 0, p, p,
    0, 0, 0, 0, p, p, 0, p, 0,
    // right
    p, 0, 0, p, p, 0, p, p, p,
    p, 0, 0, p, p, p, p, 0, p,
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  return geometry;
}

describe("analyzeThreeDGeometry", () => {
  it("calculates cube dimensions, volume, area, and triangle count", () => {
    const metrics = analyzeThreeDGeometry(cubeGeometry(10));

    expect(metrics.dimensionsMm).toEqual({ x: 10, y: 10, z: 10 });
    expect(metrics.volumeCm3).toBeCloseTo(1, 5);
    expect(metrics.surfaceAreaCm2).toBeCloseTo(6, 5);
    expect(metrics.triangleCount).toBe(12);
  });

  it("applies the selected STL unit scale", () => {
    const metrics = analyzeThreeDGeometry(cubeGeometry(1), 25.4);

    expect(metrics.dimensionsMm.x).toBeCloseTo(25.4, 5);
    expect(metrics.volumeCm3).toBeCloseTo(16.387064, 5);
  });

  it("rejects flat geometry", () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute([0, 0, 0, 10, 0, 0, 0, 10, 0], 3),
    );

    expect(() => analyzeThreeDGeometry(geometry)).toThrow(/open, flat/i);
  });
});
