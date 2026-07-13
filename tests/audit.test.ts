import { describe, expect, it } from "vitest";
import { summarizeRequest } from "../src/audit.js";

describe("summarizeRequest PATCH operations", () => {
  it("logs object-form deprovision with value and no path", () => {
    const summary = summarizeRequest(
      "PATCH",
      "/scim/v2/Users/2ff05e8a-d2d7-48a4-bef7-a83c3f4380b2",
      {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
        Operations: [{ op: "replace", value: { active: false } }],
      },
      {},
    );

    expect(summary.operations).toEqual([
      { op: "replace", value: { active: false } },
    ]);
    expect(summary.operations).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ path: expect.anything() })]),
    );
    expect(JSON.stringify(summary.operations)).not.toContain('"path"');
  });

  it("logs path-form deprovision with path and value", () => {
    const summary = summarizeRequest(
      "PATCH",
      "/scim/v2/Users/scim-cascade-001",
      {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
        Operations: [{ op: "replace", path: "active", value: false }],
      },
      {},
    );

    expect(summary.operations).toEqual([
      { op: "replace", path: "active", value: false },
    ]);
  });

  it("logs non-deprovision replace operations faithfully", () => {
    const summary = summarizeRequest(
      "PATCH",
      "/scim/v2/Users/scim-cascade-001",
      {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
        Operations: [{ op: "replace", path: "displayName", value: "X" }],
      },
      {},
    );

    expect(summary.operations).toEqual([
      { op: "replace", path: "displayName", value: "X" },
    ]);
  });
});
