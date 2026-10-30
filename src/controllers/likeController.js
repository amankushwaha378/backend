import pool from "../config/db.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../utils/AppError.js";

import { invalidatePostRelatedCache } from "../utils/invalidatePostRelatedCache.js";

// Like a post
const likePost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!/^[1-9]\d*$/.test(postId)) {
      throw new BadRequestError("Invalid post ID");
    }

    const post = await pool.query("SELECT id FROM posts WHERE id = $1", [
      postId,
    ]);

    if (post.rows.length === 0) {
      throw new NotFoundError("Post not found");
    }

    const result = await pool.query(
      `INSERT INTO post_likes (user_id, post_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, post_id) DO NOTHING
       RETURNING id, user_id, post_id, created_at`,
      [req.user.id, postId],
    );

    if (result.rows.length === 0) {
      throw new ConflictError("You have already liked this post");
    }

    return res.status(201).json({
      success: true,
      message: "Post liked successfully",
      like: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Unlike a post
const unlikePost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!/^[1-9]\d*$/.test(postId)) {
      throw new BadRequestError("Invalid post ID");
    }

    const result = await pool.query(
      `DELETE FROM post_likes
       WHERE user_id = $1 AND post_id = $2
       RETURNING id`,
      [req.user.id, postId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError("Like not found");
    }

    return res.status(200).json({
      success: true,
      message: "Post unliked successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get likes for a post
const getPostLikes = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!/^[1-9]\d*$/.test(postId)) {
      throw new BadRequestError("Invalid post ID");
    }

    const post = await pool.query("SELECT id FROM posts WHERE id = $1", [
      postId,
    ]);

    if (post.rows.length === 0) {
      throw new NotFoundError("Post not found");
    }

    const result = await pool.query(
      `SELECT
         pl.user_id,
         u.name AS user_name,
         pl.created_at
       FROM post_likes pl
       JOIN users u ON u.id = pl.user_id
       WHERE pl.post_id = $1
       ORDER BY pl.created_at DESC`,
      [postId],
    );

    return res.status(200).json({
      success: true,
      totalLikes: result.rows.length,
      likes: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

export { likePost, unlikePost, getPostLikes };
