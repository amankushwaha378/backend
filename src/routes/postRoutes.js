import express from "express";
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
} from "../controllers/postController.js";

import { authorize, authorizeAny } from "../middleware/authorize.js";

import requireAuth from "../middleware/requireAuth.js";
import userRateLimiter from "../middleware/userRateLimiter.js";
import uploadImage from "../middleware/uploadImage.js";
import devTestUser from "../middleware/devTestUser.js";

const router = express.Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Post:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: My first blog post
 *         content:
 *           type: string
 *           example: This is the content of my blog post.
 *         user_id:
 *           type: integer
 *           example: 15
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     PostInput:
 *       type: object
 *       required:
 *         - title
 *         - content
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           example: My first blog post
 *         content:
 *           type: string
 *           minLength: 1
 *           example: This is the content of my blog post.
 */

/**
 * @openapi
 * /api/posts:
 *   get:
 *     summary: Get all posts
 *     description: Retrieve paginated posts. Requires the post:read permission.
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of posts per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Column used to sort posts, if supported
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort direction
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.get("/", authorize("post:read"), getPosts);

/**
 * @openapi
 * /api/posts/{id}:
 *   get:
 *     summary: Get a post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 post:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: Invalid post ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Post not found
 */
router.get("/:id", authorize("post:read"), getPostById);

/**
 * @openapi
 * /api/posts:
 *   post:
 *     summary: Create a post
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostInput'
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Invalid post data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  requireAuth,
  userRateLimiter,
  authorize("post:create"),
  uploadImage.array("images", 5),
  createPost,
);

router.post(
  "/dev-upload",
  devTestUser,
  uploadImage.array("images", 5),
  createPost,
);

/**
 * @openapi
 * /api/posts/{id}:
 *   put:
 *     summary: Update a post
 *     description: Editors can update their own posts; admins can update any post.
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PostInput'
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       400:
 *         description: Invalid post ID or data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions or not the post owner
 *       404:
 *         description: Post not found
 *       429:
 *         description: Rate limit exceeded
 */
router.put(
  "/:id",
  requireAuth,
  userRateLimiter,
  authorizeAny("post:update:own", "post:update:any"),
  updatePost,
);

/**
 * @openapi
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete a post
 *     description: Editors can delete their own posts; admins can delete any post.
 *     tags: [Posts]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       400:
 *         description: Invalid post ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions or not the post owner
 *       404:
 *         description: Post not found
 *       429:
 *         description: Rate limit exceeded
 */
router.delete(
  "/:id",
  requireAuth,
  userRateLimiter,
  authorizeAny("post:delete:own", "post:delete:any"),
  deletePost,
);

export default router;
