
import express from "express";
import {
  createComment,
  getCommentsByPost,
  updateComment,
  deleteComment,
} from "../controllers/commentController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

/**
 * @openapi
 * /api/comments/post/{postId}:
 *   get:
 *     summary: Get comments for a post
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *       400:
 *         description: Invalid post ID
 */

/**
 * @openapi
 * /api/comments/post/{postId}:
 *   post:
 *     summary: Create a comment
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: Great post!
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Post not found
 */

/**
 * @openapi
 * /api/comments/{id}:
 *   put:
 *     summary: Update your own comment
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Cannot update another user's comment
 *       404:
 *         description: Comment not found
 */

/**
 * @openapi
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete your own comment
 *     tags: [Comments]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Cannot delete another user's comment
 *       404:
 *         description: Comment not found
 */

router.get("/post/:postId", getCommentsByPost);
router.post("/post/:postId", requireAuth, createComment);
router.put("/:id", requireAuth, updateComment);
router.delete("/:id", requireAuth, deleteComment);

export default router;
