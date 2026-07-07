import { describe, expect, it } from "vitest";
import type { GameArea } from "../../domain/map/annotations";
import {
  classifyAdminDivisionAtPoint,
  parseAdminDivisionFeatures,
  relationBoundaryFromElements,
} from "./adminDivisionBoundaries";

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
};

describe("admin division boundaries", () => {
  it("builds a polygon from a relation outer way", () => {
    const relation = {
      type: "relation" as const,
      id: 10,
      tags: {
        boundary: "administrative",
        admin_level: "6",
        name: "West County",
      },
      members: [{ type: "way" as const, ref: 1, role: "outer" }],
    };
    const waysById = new Map([
      [
        1,
        {
          type: "way" as const,
          id: 1,
          geometry: [
            { lat: 51.4, lon: -0.2 },
            { lat: 51.5, lon: -0.2 },
            { lat: 51.5, lon: -0.15 },
            { lat: 51.4, lon: -0.15 },
            { lat: 51.4, lon: -0.2 },
          ],
        },
      ],
    ]);

    const boundary = relationBoundaryFromElements(relation, waysById);
    expect(boundary?.type).toBe("Polygon");
  });

  it("parses intersecting admin divisions in the play area", () => {
    const divisions = parseAdminDivisionFeatures(
      [
        {
          type: "relation",
          id: 10,
          tags: {
            boundary: "administrative",
            admin_level: "6",
            name: "West County",
          },
          members: [{ type: "way", ref: 1, role: "outer" }],
        },
        {
          type: "way",
          id: 1,
          geometry: [
            { lat: 51.4, lon: -0.2 },
            { lat: 51.5, lon: -0.2 },
            { lat: 51.5, lon: -0.15 },
            { lat: 51.4, lon: -0.15 },
            { lat: 51.4, lon: -0.2 },
          ],
        },
        {
          type: "relation",
          id: 11,
          tags: {
            boundary: "administrative",
            admin_level: "6",
            name: "East County",
          },
          members: [{ type: "way", ref: 2, role: "outer" }],
        },
        {
          type: "way",
          id: 2,
          geometry: [
            { lat: 51.4, lon: -0.15 },
            { lat: 51.5, lon: -0.15 },
            { lat: 51.5, lon: -0.1 },
            { lat: 51.4, lon: -0.1 },
            { lat: 51.4, lon: -0.15 },
          ],
        },
      ],
      sampleGameArea,
      6,
    );

    expect(divisions).toHaveLength(2);
    expect(divisions[0]?.id).toBe("relation/10");
  });

  it("prefers the smallest containing division when polygons overlap", () => {
    const divisions = parseAdminDivisionFeatures(
      [
        {
          type: "relation",
          id: 20,
          tags: {
            boundary: "administrative",
            admin_level: "8",
            name: "Large City",
          },
          members: [{ type: "way", ref: 3, role: "outer" }],
        },
        {
          type: "way",
          id: 3,
          geometry: [
            { lat: 51.4, lon: -0.2 },
            { lat: 51.5, lon: -0.2 },
            { lat: 51.5, lon: -0.1 },
            { lat: 51.4, lon: -0.1 },
            { lat: 51.4, lon: -0.2 },
          ],
        },
        {
          type: "relation",
          id: 21,
          tags: {
            boundary: "administrative",
            admin_level: "8",
            name: "Inner Borough",
          },
          members: [{ type: "way", ref: 4, role: "outer" }],
        },
        {
          type: "way",
          id: 4,
          geometry: [
            { lat: 51.44, lon: -0.17 },
            { lat: 51.48, lon: -0.17 },
            { lat: 51.48, lon: -0.13 },
            { lat: 51.44, lon: -0.13 },
            { lat: 51.44, lon: -0.17 },
          ],
        },
      ],
      sampleGameArea,
      8,
    );

    const classified = classifyAdminDivisionAtPoint([51.46, -0.15], divisions);
    expect(classified?.name).toBe("Inner Borough");
  });
});
