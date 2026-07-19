import { describe, expect, it } from "vitest";

import {
  BUILDING_COORDINATES,
  classroomDistanceMeters,
  distanceBetweenBuildingNames,
  extractBuildingName,
  haversineDistanceMeters,
} from "../buildingCoordinates";

describe("extractBuildingName", () => {
  it("extracts the plain building name before the dong-ho/description text", () => {
    expect(extractBuildingName("342(혜화관 207-342 342 강의실)")).toBe("혜화관");
  });

  it("prefers the longer compound name over a shorter prefix match", () => {
    // "법학관" is also a valid key and a prefix of "법학/만해관" would NOT match
    // it directly, but this guards against a regression where a naive
    // shortest-first scan could still misfire on some other overlapping pair.
    expect(extractBuildingName("B256(법학/만해관 303-254 강의실_스마트)")).toBe("법학/만해관");
  });

  it("returns null for unrecognized or missing classroom text", () => {
    expect(extractBuildingName("전혀 모르는 건물 설명")).toBeNull();
    expect(extractBuildingName(null)).toBeNull();
    expect(extractBuildingName(undefined)).toBeNull();
    expect(extractBuildingName("")).toBeNull();
  });

  it("every building name used as a key round-trips through its own sample text", () => {
    for (const name of Object.keys(BUILDING_COORDINATES)) {
      expect(extractBuildingName(`101(${name} 1-1 강의실)`)).toBe(name);
    }
  });
});

describe("haversineDistanceMeters", () => {
  it("is 0 for identical points", () => {
    const point = { lat: 37.5578, lng: 127.0009 };
    expect(haversineDistanceMeters(point, point)).toBe(0);
  });

  it("is symmetric", () => {
    const a = BUILDING_COORDINATES["혜화관"];
    const b = BUILDING_COORDINATES["학술관"];
    expect(haversineDistanceMeters(a, b)).toBeCloseTo(haversineDistanceMeters(b, a));
  });

  it("matches a known approximate distance between two real campus points", () => {
    // 혜화관 and 학림관 are roughly opposite ends of the compact Seoul campus —
    // sanity-check the formula lands in a plausible few-hundred-meter range,
    // not an order-of-magnitude bug (e.g. degrees-as-meters).
    const a = BUILDING_COORDINATES["혜화관"];
    const b = BUILDING_COORDINATES["학림관"];
    const distance = haversineDistanceMeters(a, b);
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(1000);
  });
});

describe("classroomDistanceMeters", () => {
  it("is 0 for two rooms in the same building", () => {
    expect(classroomDistanceMeters("342(혜화관 207-342 342 강의실)", "101(혜화관 101 강의실)")).toBe(0);
  });

  it("is positive for two different buildings", () => {
    const distance = classroomDistanceMeters(
      "342(혜화관 207-342 342 강의실)",
      "B256(법학/만해관 303-254 강의실_스마트)"
    );
    expect(distance).not.toBeNull();
    expect(distance).toBeGreaterThan(0);
  });

  it("is null when either side can't be resolved to a building", () => {
    expect(classroomDistanceMeters(null, "342(혜화관 207-342 342 강의실)")).toBeNull();
    expect(classroomDistanceMeters("342(혜화관 207-342 342 강의실)", "온라인")).toBeNull();
    expect(classroomDistanceMeters(null, null)).toBeNull();
  });
});

describe("distanceBetweenBuildingNames", () => {
  it("is 0 for the same building name", () => {
    expect(distanceBetweenBuildingNames("혜화관", "혜화관")).toBe(0);
  });

  it("is positive for two different building names", () => {
    const distance = distanceBetweenBuildingNames("혜화관", "학술관");
    expect(distance).not.toBeNull();
    expect(distance).toBeGreaterThan(0);
  });

  it("is null when either name is null", () => {
    expect(distanceBetweenBuildingNames(null, "혜화관")).toBeNull();
    expect(distanceBetweenBuildingNames("혜화관", null)).toBeNull();
    expect(distanceBetweenBuildingNames(null, null)).toBeNull();
  });

  it("agrees with classroomDistanceMeters given the equivalent raw strings", () => {
    const viaNames = distanceBetweenBuildingNames("혜화관", "학술관");
    const viaRaw = classroomDistanceMeters("342(혜화관 207-342 342 강의실)", "101(학술관 101 강의실)");
    expect(viaNames).toBe(viaRaw);
  });
});
