
import request from "supertest";
import app from "../server.js";
import pool from "../config/db.js";

describe("Users API", () => {
  let userId;
  const email = `test-${Date.now()}@example.com`;

  afterAll(async () => {
    if (userId) {
      await pool.query("DELETE FROM users WHERE id = $1", [userId]);
    }
  });

  test("POST /api/users creates a user", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({
        name: "Test User",
        email,
        age: 21,
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(email);

    userId = response.body.user.id;
  });

  test("GET /api/users returns a list", async () => {
    const response = await request(app).get("/api/users");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.users)).toBe(true);
  });

  test("GET /api/users/:id returns the user", async () => {
    const response = await request(app).get(`/api/users/${userId}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(userId);
  });

  test("PUT /api/users/:id updates the user", async () => {
    const response = await request(app)
      .put(`/api/users/${userId}`)
      .send({
        name: "Updated Test User",
        email,
        age: 22,
      });

    expect(response.status).toBe(200);
    expect(response.body.user.name).toBe("Updated Test User");
  });

  test("GET /api/users/:id returns 404 for a missing user", async () => {
    const response = await request(app).get("/api/users/999999999");

    expect(response.status).toBe(404);
  });

  test("GET /api/users/:id returns 400 for an invalid ID", async () => {
    const response = await request(app).get("/api/users/abc");

    expect(response.status).toBe(400);
  });

  
  test("DELETE /api/users/:id deletes the user", async () => {
    const deletedId = userId;

    const response = await request(app)
      .delete(`/api/users/${deletedId}`);

    expect(response.status).toBe(200);

    const fetchResponse = await request(app)
      .get(`/api/users/${deletedId}`);

    expect(fetchResponse.status).toBe(404);

    userId = null;
  });


  test("DELETE /api/users/:id returns 404 for a missing user", async () => {
    const response = await request(app).delete("/api/users/999999999");

    expect(response.status).toBe(404);
  });

  
  test("POST /api/users rejects missing required fields", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({ name: "Incomplete User" });

    expect([400, 422]).toContain(response.status);
  });

  test("POST /api/users rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({
        name: "Invalid Email User",
        email: "not-an-email",
        age: 21,
      });

    expect([400, 422]).toContain(response.status);
  });

  test("POST /api/users rejects a duplicate email", async () => {
    const duplicateEmail = `duplicate-${Date.now()}@example.com`;

    const first = await request(app)
      .post("/api/users")
      .send({
        name: "First User",
        email: duplicateEmail,
        age: 21,
      });

    expect(first.status).toBe(201);

    try {
      const second = await request(app)
        .post("/api/users")
        .send({
          name: "Second User",
          email: duplicateEmail,
          age: 22,
        });

      expect([400, 409]).toContain(second.status);
    } finally {
      await pool.query(
        "DELETE FROM users WHERE email = $1",
        [duplicateEmail]
      );
    }
  });

  test("PUT /api/users/:id rejects invalid update data", async () => {
    const response = await request(app)
      .put(`/api/users/${userId}`)
      .send({
        name: "",
        email,
        age: -1,
      });

    expect([400, 422]).toContain(response.status);
  });

});
