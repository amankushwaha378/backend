import pool from "../config/db.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/AppError.js";

import { invalidatePostRelatedCache } from "../utils/invalidatePostRelatedCache.js";

// Create a comment
const createComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content } = req.body ?? {};

    if (!/^[1-9]\d*$/.test(postId)) {
      throw new BadRequestError("Invalid post ID");
    }

    if (typeof content !== "string" || !content.trim()) {
      throw new BadRequestError("Comment content is required");
    }

    const post = await pool.query("SELECT id FROM posts WHERE id = $1", [
      postId,
    ]);

    if (post.rows.length === 0) {
      throw new NotFoundError("Post not found");
    }

    const result = await pool.query(
      `INSERT INTO comments (content, user_id, post_id)
       VALUES ($1, $2, $3)
       RETURNING id, content, user_id, post_id, created_at`,
      [content.trim(), req.user.id, postId],
    );

     await invalidatePostRelatedCache(postId);

    return res.status(201).json({
      success: true,
      message: "Comment created successfully",
      comment: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Get all comments for a post
const getCommentsByPost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    if (!/^[1-9]\d*$/.test(postId)) {
      throw new BadRequestError("Invalid post ID");
    }

    const result = await pool.query(
      `SELECT
         c.id,
         c.content,
         c.user_id,
         u.name AS author_name,
         c.post_id,
         c.created_at
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC, c.id ASC`,
      [postId],
    );

    return res.status(200).json({
      success: true,
      comments: result.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Update your own comment
const updateComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body ?? {};

    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestError("Invalid comment ID");
    }

    if (typeof content !== "string" || !content.trim()) {
      throw new BadRequestError("Comment content is required");
    }

    const result = await pool.query(
      `UPDATE comments
       SET content = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, content, user_id, post_id, created_at`,
      [content.trim(), id, req.user.id],
    );

    if (result.rows.length === 0) {
      const existing = await pool.query(
        "SELECT id FROM comments WHERE id = $1",
        [id],
      );

      if (existing.rows.length === 0) {
        throw new NotFoundError("Comment not found");
      }

      throw new ForbiddenError("You can only update your own comments");
    }

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      comment: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Delete your own comment
const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestError("Invalid comment ID");
    }

    const result = await pool.query(
  `DELETE FROM comments
   WHERE id = $1 AND user_id = $2
   RETURNING id, post_id`,
  [id, req.user.id],
);

    if (result.rows.length === 0) {
      const existing = await pool.query(
        "SELECT id FROM comments WHERE id = $1",
        [id],
      );

      if (existing.rows.length === 0) {
        throw new NotFoundError("Comment not found");
      }

      throw new ForbiddenError("You can only delete your own comments");
    }

    await invalidatePostRelatedCache(result.rows[0].post_id);

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export { createComment, getCommentsByPost, updateComment, deleteComment };
