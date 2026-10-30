
import { rateLimit } from "express-rate-limit";

const expressRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5, // Maximum 5 requests per window
  standardHeaders: "draft-8",
  legacyHeaders: false,

  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
    });
  },
});

export default expressRateLimiter;
