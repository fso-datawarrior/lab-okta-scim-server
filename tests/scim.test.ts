import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { Store } from "../src/store.js";

const TOKEN = "test-lab-token-not-for-production";

describe("SCIM 2.0 lab server", () => {
  let store: Store;
  let app: ReturnType<typeof createApp>["app"];

  beforeEach(() => {
    store = new Store();
    ({ app } = createApp({ bearerToken: TOKEN, store }));
  });

  it("returns 401 without bearer token", async () => {
    const res = await request(app).get("/scim/v2/Users");
    expect(res.status).toBe(401);
    expect(res.body.schemas).toContain(
      "urn:ietf:params:scim:api:messages:2.0:Error",
    );
  });

  it("creates a user", async () => {
    const res = await request(app)
      .post("/scim/v2/Users")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
        userName: "alice@example.com",
        name: { givenName: "Alice", familyName: "Example" },
        emails: [{ value: "alice@example.com", primary: true }],
        active: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.userName).toBe("alice@example.com");
    expect(res.body.active).toBe(true);
    expect(store.users.size).toBe(1);
  });

  it("filters users by userName", async () => {
    await request(app)
      .post("/scim/v2/Users")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ userName: "alice@example.com", active: true });
    await request(app)
      .post("/scim/v2/Users")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ userName: "bob@example.com", active: true });

    const res = await request(app)
      .get("/scim/v2/Users")
      .query({ filter: 'userName eq "alice@example.com"' })
      .set("Authorization", `Bearer ${TOKEN}`);

    expect(res.status).toBe(200);
    expect(res.body.totalResults).toBe(1);
    expect(res.body.Resources[0].userName).toBe("alice@example.com");
  });

  it("deactivates a user via PATCH active=false", async () => {
    const created = await request(app)
      .post("/scim/v2/Users")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ userName: "carol@example.com", active: true });

    const res = await request(app)
      .patch(`/scim/v2/Users/${created.body.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
        Operations: [{ op: "replace", path: "active", value: false }],
      });

    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
    expect(store.users.get(created.body.id)?.active).toBe(false);
  });

  it("adds and removes group members via PATCH", async () => {
    const user = await request(app)
      .post("/scim/v2/Users")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ userName: "dave@example.com", active: true });

    const group = await request(app)
      .post("/scim/v2/Groups")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:Group"],
        displayName: "Engineering",
        members: [],
      });

    expect(group.status).toBe(201);

    const added = await request(app)
      .patch(`/scim/v2/Groups/${group.body.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
        Operations: [
          {
            op: "add",
            path: "members",
            value: [{ value: user.body.id, display: "dave@example.com" }],
          },
        ],
      });

    expect(added.status).toBe(200);
    expect(added.body.members).toHaveLength(1);
    expect(added.body.members[0].value).toBe(user.body.id);

    const removed = await request(app)
      .patch(`/scim/v2/Groups/${group.body.id}`)
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({
        schemas: ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
        Operations: [
          {
            op: "remove",
            path: `members[value eq "${user.body.id}"]`,
          },
        ],
      });

    expect(removed.status).toBe(200);
    expect(removed.body.members).toHaveLength(0);
  });
});