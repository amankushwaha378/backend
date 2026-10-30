
import { Router } from "express";
import pool from "../config/db.js";

const router = Router();

// Demo 1: Transaction handled by Express
router.post("/transaction-post", async (req, res) => {
  const { title, content, userId, simulateFailure = false } = req.body;
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.length > 200 ||
      typeof content !== "string" ||
      !content.trim() ||
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid title, content and userId are required",
      });
    }

    await client.query("BEGIN");
    transactionStarted = true;

    const result = await client.query(
      `INSERT INTO posts (title, content, user_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title.trim(), content.trim(), userId]
    );

    // Demo only: fail after inserting the post
    if (simulateFailure === true) {
      throw new Error("Demo failure: testing rollback");
    }

    await client.query(
      `UPDATE users
       SET post_count = post_count + 1
       WHERE id = $1`,
      [userId]
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Post and post count saved atomically",
      post: result.rows[0],
    });
  } catch (error) {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }

    const isDemoFailure =
      error.message === "Demo failure: testing rollback";

    return res.status(isDemoFailure ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
});

// Demo 2: Stored procedure executed by PostgreSQL
router.post("/procedure-post", async (req, res) => {
  const { title, content, userId, simulateFailure = false } = req.body;

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.length > 200 ||
    typeof content !== "string" ||
    !content.trim() ||
    !Number.isInteger(userId) ||
    userId <= 0 ||
    typeof simulateFailure !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
    });
  }

  try {
    await pool.query(
      `CALL create_blog_post($1, $2, $3, $4)`,
      [title.trim(), content.trim(), userId, simulateFailure]
    );

    return res.status(201).json({
      success: true,
      message: "Stored procedure executed successfully",
    });
  } catch (error) {
    const isDemoFailure =
      error.message === "Demo failure: testing rollback";

    return res.status(isDemoFailure ? 400 : 500).json({
      success: false,
      message: error.message,
    });
  }
});

// Demo 3: Stored function
router.get("/users/:userId/post-count", async (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  try {
    const result = await pool.query(
      `SELECT get_user_post_count($1) AS post_count`,
      [userId]
    );

    return res.json({
      success: true,
      userId,
      postCount: result.rows[0].post_count,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Could not retrieve post count",
    });
  }
});

export default router;
