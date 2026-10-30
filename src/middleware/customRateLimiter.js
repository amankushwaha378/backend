
const requests = new Map();

const customRateLimiter = ({
  windowMs = 60 * 1000,
  maxRequests = 5,
} = {}) => {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    let record = requests.get(key);

    // Start a new window if none exists or the old one expired
    if (!record || now >= record.resetAt) {
      record = {
        count: 0,
        resetAt: now + windowMs,
      };

      requests.set(key, record);
    }

    record.count += 1;

    const remaining = Math.max(
      maxRequests - record.count,
      0
    );

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader(
      "X-RateLimit-Reset",
      Math.ceil(record.resetAt / 1000)
    );

    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }

    next();
  };
};

export default customRateLimiter;
