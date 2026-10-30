
import request from "supertest";
import app from "../server.js";
import pool from "../config/db.js";

describe("Authentication API", () => {
  let agent;
  const email = `auth-test-${Date.now()}@example.com`;
  const password = "TestPassword123!";

  beforeAll(async () => {
    agent = request.agent(app);

    // Create the test account.
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Auth Test User",
        email,
        age: 21,
        password,
      });

    expect([200, 201]).toContain(response.status);
  });

  afterAll(async () => {
    // Delete related posts first if your schema doesn't cascade.
    await pool.query(
      `DELETE FROM posts
       WHERE user_id IN (SELECT id FROM users WHERE email = $1)`,
      [email]
    );

    await pool.query("DELETE FROM users WHERE email = $1", [email]);
  });

  test("rejects registration with missing fields", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email });

    expect([400, 422]).toContain(response.status);
  });

  test("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Invalid Email",
        email: "not-an-email",
        age: 21,
        password,
      });

    expect([400, 422]).toContain(response.status);
  });

  test("rejects a password that is too short", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Weak Password",
        email: `weak-${Date.now()}@example.com`,
        age: 21,
        password: "123",
      });

    expect([400, 422]).toContain(response.status);
  });

  test("rejects an invalid age", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Invalid Age",
        email: `age-${Date.now()}@example.com`,
        age: -1,
        password,
      });

    expect([400, 422]).toContain(response.status);
  });

  test("rejects an empty request body", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({});

    expect([400, 422]).toContain(response.status);
  });

  test("rejects duplicate email registration", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Duplicate User",
        email,
        age: 21,
        password,
      });

    expect([400, 409]).toContain(response.status);
  });

  test("rejects login with an incorrect password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "WrongPassword123!" });

    expect([400, 401]).toContain(response.status);
  });

  test("rejects login for a nonexistent email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: `missing-${Date.now()}@example.com`,
        password,
      });

    expect([400, 401]).toContain(response.status);
  });

  test("rejects login with missing credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email });

    expect([400, 401, 422]).toContain(response.status);
  });

  test("logs in with valid credentials", async () => {
    const response = await agent
      .post("/api/auth/login")
      .send({ email, password });

    expect(response.status).toBe(200);
  });

  test("returns the authenticated user", async () => {
    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(email);
  });

  test("rejects unauthenticated access to /me", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
  });

  test("logs out the user", async () => {
    const response = await agent.post("/api/auth/logout");

    expect([200, 204]).toContain(response.status);
  });

  test("rejects access after logout", async () => {
    const response = await agent.get("/api/auth/me");

    expect(response.status).toBe(401);
  });
});
