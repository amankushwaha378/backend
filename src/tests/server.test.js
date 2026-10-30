
import request from "supertest";
import app from "../server.js";

describe("Blog API - Server", () => {
  test("GET / returns the server status", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Server is running",
    });
  });

  test("Unknown routes return 404", async () => {
    const response = await request(app).get(
      "/this-route-does-not-exist"
    );

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test("Unknown routes return a JSON response", async () => {
    const response = await request(app).get(
      "/another-unknown-route"
    );

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.body).toHaveProperty("success", false);
  });
});

