
import {
  invalidatePostCache,
  invalidatePostListCache,
} from "./postCache.js";

export const invalidatePostRelatedCache = async (postId) => {
  await Promise.all([
    invalidatePostCache(postId),
    invalidatePostListCache(),
  ]);
};
