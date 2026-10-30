
import {
  getPosts as getPostsV1,
  getPostById as getPostByIdV1,
  createPost as createPostV1,
  updatePost as updatePostV1,
  deletePost as deletePostV1,
} from "./postController.js";

export const getPosts = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    return originalJson({
      ...body,
      version: "v2",
    });
  };

  return getPostsV1(req, res, next);
};

export const getPostById = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    return originalJson({
      ...body,
      version: "v2",
    });
  };

  return getPostByIdV1(req, res, next);
};

export const createPost = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    return originalJson({
      ...body,
      version: "v2",
    });
  };

  return createPostV1(req, res, next);
};

export const updatePost = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    return originalJson({
      ...body,
      version: "v2",
    });
  };

  return updatePostV1(req, res, next);
};

export const deletePost = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    return originalJson({
      ...body,
      version: "v2",
    });
  };

  return deletePostV1(req, res, next);
};
