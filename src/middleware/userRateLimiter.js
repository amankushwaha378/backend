
import { rateLimit } from "express-rate-limit";

const userRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // 30 requests per user
  keyGenerator: (req) => `user-${req.user.id}`,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

export default userRateLimiter;
