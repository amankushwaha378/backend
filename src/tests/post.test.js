import request from "supertest";
import app from "../server.js";
import pool from "../config/db.js";

describe("Posts API", () => {
  let agent;
  let userId;
  let postId;

  const email = `post-test-${Date.now()}@example.com`;
  const password = "TestPassword123!";

  beforeAll(async () => {
    // Register a test user.
    const registerResponse = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Post Test User",
        email,
        age: 21,
        password,
      });

    expect([200, 201]).toContain(registerResponse.status);

    // Find the user and grant editor permissions.
    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    expect(userResult.rows.length).toBe(1);
    userId = userResult.rows[0].id;

    await pool.query("UPDATE users SET role = $1 WHERE id = $2", [
      "editor",
      userId,
    ]);

    // Create an agent that retains the login session cookie.
    agent = request.agent(app);

    const loginResponse = await agent
      .post("/api/auth/login")
      .send({ email, password });

    expect(loginResponse.status).toBe(200);
  });

  afterAll(async () => {
    try {
      if (agent) {
        await agent.post("/api/auth/logout");
      }

      if (userId) {
        await pool.query("DELETE FROM posts WHERE user_id = $1", [userId]);

        await pool.query("DELETE FROM users WHERE id = $1", [userId]);
      }
    } finally {
    }
  });

  test("POST /api/posts creates a post", async () => {
    const response = await agent.post("/api/posts").send({
      title: "Test Post",
      content: "This is test post content.",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.post.title).toBe("Test Post");
    expect(response.body.post.content).toBe("This is test post content.");
    expect(String(response.body.post.user_id)).toBe(String(userId));

    postId = response.body.post.id;
  });

  test("GET /api/posts returns a list of posts", async () => {
    const response = await agent.get("/api/posts");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.posts)).toBe(true);
  });

  test("GET /api/posts/:id returns the created post", async () => {
    const response = await agent.get(`/api/posts/${postId}`);

    expect(response.status).toBe(200);
    expect(String(response.body.post.id)).toBe(String(postId));
    expect(response.body.post.title).toBe("Test Post");
  });

  test("PUT /api/posts/:id updates the post", async () => {
    const response = await agent.put(`/api/posts/${postId}`).send({
      title: "Updated Test Post",
      content: "Updated test post content.",
    });

    expect(response.status).toBe(200);
    expect(response.body.post.title).toBe("Updated Test Post");
    expect(response.body.post.content).toBe("Updated test post content.");
  });

  test("POST /api/posts rejects an empty title", async () => {
    const response = await agent.post("/api/posts").send({
      title: "   ",
      content: "Some valid content.",
    });

    expect(response.status).toBe(400);
  });

  test("POST /api/posts rejects a title longer than 200 characters", async () => {
    const response = await agent.post("/api/posts").send({
      title: "A".repeat(201),
      content: "Some valid content.",
    });

    expect(response.status).toBe(400);
  });

  test("GET /api/posts/:id returns 404 for a missing post", async () => {
    const response = await agent.get("/api/posts/999999999");

    expect(response.status).toBe(404);
  });

  test("GET /api/posts/:id returns 400 for an invalid ID", async () => {
    const response = await agent.get("/api/posts/abc");

    expect(response.status).toBe(400);
  });

  test("DELETE /api/posts/:id deletes the post", async () => {
    const response = await agent.delete(`/api/posts/${postId}`);

    expect(response.status).toBe(200);
    postId = null;
  });

  test("Unauthenticated requests cannot access protected posts", async () => {
    const response = await request(app).get("/api/posts");

    expect(response.status).toBe(401);
  });
});
