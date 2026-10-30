import express from "express";
import { register, login, logout } from "../controllers/authController.js";
import requireAuth from "../middleware/requireAuth.js";
import {
  forgotPassword,
  resetPassword,
} from "../controllers/passwordResetController.js";
import {
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from "../middleware/passwordResetLimiter.js";
import authRateLimiter from "../middleware/authRateLimiter.js";

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, age, password]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               age:
 *                 type: integer
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already registered
 */
router.post("/register", register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: 'string'
 *                 example : amankushwahaeditor@gmail.com
 *               password:
 *                 type: string
 *                 example : Amanthegreat
 *
 *     responses:
 *       200:
 *         description: Login successful. Session cookie is set.
 *       401:
 *         description: Invalid email or password
 */
router.post("/login", authRateLimiter, login);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Log out
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Authentication required
 */
router.post("/logout", requireAuth, logout);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get the current user
 *     tags: [Authentication]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user returned successfully
 *       401:
 *         description: Authentication required
 */
router.get("/me", requireAuth, (req, res) => {
  res.status(200).json({
    success: true,
    user: req.user,
  });
});

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset request processed
 *       429:
 *         description: Too many requests
 */
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using a token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 *       429:
 *         description: Too many requests
 */
router.post("/reset-password", resetPasswordLimiter, resetPassword);

export default router;
