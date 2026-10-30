
import redisClient from "../config/redis.js";

const THRESHOLD = Number(
  process.env.LOGIN_CAPTCHA_THRESHOLD || 3,
);

const WINDOW_SECONDS = Number(
  process.env.LOGIN_ATTEMPT_WINDOW_SECONDS || 900,
);

const keyFor = (email) =>
  `login:failed:${email.trim().toLowerCase()}`;

export const getFailedAttempts = async (email) => {
  const value = await redisClient.get(keyFor(email));
  return Number(value || 0);
};

export const recordFailedAttempt = async (email) => {
  const key = keyFor(email);

  const attempts = await redisClient.incr(key);

  // Start a 15-minute expiry window on the first failure.
  if (attempts === 1) {
    await redisClient.expire(key, WINDOW_SECONDS);
  }

  return attempts;
};

export const clearFailedAttempts = async (email) => {
  await redisClient.del(keyFor(email));
};

export const requiresCaptcha = async (email) => {
  return (await getFailedAttempts(email)) >= THRESHOLD;
};
