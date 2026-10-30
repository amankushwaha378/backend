
import express from "express";
import {
  likePost,
  unlikePost,
  getPostLikes,
} from "../controllers/likeController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

/**
 * @openapi
 * /api/likes/post/{postId}:
 *   get:
 *     summary: Get likes for a post
 *     tags: [Likes]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Likes retrieved successfully
 *       404:
 *         description: Post not found
 */
router.get("/post/:postId", getPostLikes);

/**
 * @openapi
 * /api/likes/post/{postId}:
 *   post:
 *     summary: Like a post
 *     tags: [Likes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Post liked successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Post not found
 *       409:
 *         description: Post already liked
 */
router.post("/post/:postId", requireAuth, likePost);

/**
 * @openapi
 * /api/likes/post/{postId}:
 *   delete:
 *     summary: Unlike a post
 *     tags: [Likes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Post unliked successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Like not found
 */
router.delete("/post/:postId", requireAuth, unlikePost);

export default router;
