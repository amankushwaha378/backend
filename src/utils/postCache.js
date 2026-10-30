
import redisClient from "../config/redis.js";

const POST_LIST_TTL = 60;
const SINGLE_POST_TTL = 60;

export const getPostListCacheKey = (version, page, limit) =>
  `posts:list:v${version}:page:${page}:limit:${limit}`;

export const getPostCacheKey = (id) => `post:${id}`;

export const getPostListVersion = async () => {
  const version = await redisClient.get("posts:list:version");

  return version ?? "0";
};
export const invalidatePostListCache = async () => {
  await redisClient.incr("posts:list:version");
};

export const invalidatePostCache = async (id) => {
  await redisClient.del(`post:${id}`);
};
export const cachePostList = async (key, data) => {
  await redisClient.setEx(key, POST_LIST_TTL, JSON.stringify(data));
};

export const cachePost = async (id, data) => {
  await redisClient.setEx(
    getPostCacheKey(id),
    SINGLE_POST_TTL,
    JSON.stringify(data),
  );
};
