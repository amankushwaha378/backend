import pool from "../config/db.js";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/AppError.js";

import redisClient from "../config/redis.js";
import {
  getPostListCacheKey,
  getPostListVersion,
  cachePostList,
  getPostCacheKey,
  cachePost,
  invalidatePostListCache,
  invalidatePostCache,
} from "../utils/postCache.js";

import { randomUUID } from "node:crypto";
import minioClient from "../config/minio.js";

// Create a post

const createPost = async (req, res, next) => {
  const uploadedKeys = [];
  let dbClient;

  try {
    const { title, content } = req.body ?? {};
    const files = req.files ?? [];

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200 ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      throw new BadRequestError(
        "Title is required (maximum 200 characters) and content is required",
      );
    }

    const bucket = process.env.MINIO_BUCKET;

    if (!bucket) {
      throw new Error("MINIO_BUCKET is not configured");
    }

    // Upload images to MinIO.
    const uploadedImages = [];

    for (const file of files) {
      const extensionByMime = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
      };

      const extension = extensionByMime[file.mimetype];

      if (!extension) {
        throw new BadRequestError("Unsupported image type");
      }

      const objectKey = `posts/${randomUUID()}${extension}`;

      await minioClient.putObject(bucket, objectKey, file.buffer, file.size, {
        "Content-Type": file.mimetype,
      });

      uploadedKeys.push(objectKey);

      uploadedImages.push({
        objectKey,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      });
    }

    // Save post and image metadata atomically in PostgreSQL.
    dbClient = await pool.connect();
    await dbClient.query("BEGIN");

    const postResult = await dbClient.query(
      `INSERT INTO posts (title, content, user_id)
       VALUES ($1, $2, $3)
       RETURNING id, title, content, user_id, created_at, updated_at`,
      [title.trim(), content.trim(), req.user.id],
    );

    const post = postResult.rows[0];
    const savedImages = [];

    for (const image of uploadedImages) {
      const imageResult = await dbClient.query(
        `INSERT INTO post_images
          (post_id, object_key, original_name, mime_type, size_bytes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, post_id, object_key, original_name,
                   mime_type, size_bytes, created_at`,
        [
          post.id,
          image.objectKey,
          image.originalName,
          image.mimeType,
          image.sizeBytes,
        ],
      );

      savedImages.push(imageResult.rows[0]);
    }

    await dbClient.query("COMMIT");

    await invalidatePostListCache();

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post: {
        ...post,
        images: savedImages,
      },
    });
  } catch (error) {
    if (dbClient) {
      try {
        await dbClient.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Post transaction rollback failed:",
          rollbackError.message,
        );
      }
    }

    // Remove uploaded files if post creation failed.
    const bucket = process.env.MINIO_BUCKET;

    if (bucket) {
      for (const objectKey of uploadedKeys) {
        try {
          await minioClient.removeObject(bucket, objectKey);
        } catch (cleanupError) {
          console.error(
            `Failed to clean up MinIO object ${objectKey}:`,
            cleanupError.message,
          );
        }
      }
    }

    next(error);
  } finally {
    dbClient?.release();
  }
};

// Get all posts with pagination

const getPosts = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);

    const version = await getPostListVersion();
    const cacheKey = getPostListCacheKey(version, page, limit);

    // 1. Check Redis first
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData !== null) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2. Cache miss: query PostgreSQL
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
         p.id,
         p.title,
         p.content,
         p.user_id,
         u.name AS author_name,
         p.created_at,
         p.updated_at,
         COUNT(DISTINCT c.id)::INTEGER AS comment_count,
         COUNT(DISTINCT pl.user_id)::INTEGER AS like_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN comments c ON c.post_id = p.id
       LEFT JOIN post_likes pl ON pl.post_id = p.id
       GROUP BY p.id, u.name
       ORDER BY p.created_at DESC, p.id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const countResult = await pool.query("SELECT COUNT(*) FROM posts");

    const totalPosts = Number(countResult.rows[0].count);

    const responseData = {
      success: true,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
      },
      posts: result.rows,
    };

    // 3. Store the response for subsequent requests
    await cachePostList(cacheKey, responseData);

    res.set("X-Cache", "MISS");
    return res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
};

// Get one post by ID

const getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestError("Invalid post ID");
    }

    // 1. Check Redis before querying PostgreSQL
    const cacheKey = getPostCacheKey(id);
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData !== null) {
      res.set("X-Cache", "HIT");
      return res.status(200).json(JSON.parse(cachedData));
    }

    // 2. Cache miss: fetch the post from PostgreSQL
    const result = await pool.query(
      `SELECT
         p.id,
         p.title,
         p.content,
         p.user_id,
         u.name AS author_name,
         p.created_at,
         p.updated_at,
         (SELECT COUNT(*)::INTEGER
          FROM comments c WHERE c.post_id = p.id) AS comment_count,
         (SELECT COUNT(*)::INTEGER
          FROM post_likes pl WHERE pl.post_id = p.id) AS like_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError("Post not found");
    }

    const responseData = {
      success: true,
      post: result.rows[0],
    };

    // 3. Cache the response for 60 seconds
    await cachePost(id, responseData);

    res.set("X-Cache", "MISS");
    return res.status(200).json(responseData);
  } catch (error) {
    next(error);
  }
};

// Update a post: editors can update their own; admins can update any
const updatePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestError("Invalid post ID");
    }

    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 200 ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      throw new BadRequestError("Valid title and content are required");
    }

    const isAdmin = req.user.role === "admin";

    const result = await pool.query(
      `UPDATE posts
       SET title = $1,
           content = $2,
           updated_at = NOW()
       WHERE id = $3
         AND ($4::BOOLEAN OR user_id = $5)
       RETURNING id, title, content, user_id, created_at, updated_at`,
      [title.trim(), content.trim(), id, isAdmin, req.user.id],
    );

    if (result.rows.length === 0) {
      const post = await pool.query("SELECT id FROM posts WHERE id = $1", [id]);

      if (post.rows.length === 0) {
        throw new NotFoundError("Post not found");
      }

      throw new ForbiddenError("You can only update your own posts");
    }

    await Promise.all([invalidatePostListCache(), invalidatePostCache(id)]);

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

// Delete a post: editors can delete their own; admins can delete any
const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
      throw new BadRequestError("Invalid post ID");
    }

    const isAdmin = req.user.role === "admin";

    const result = await pool.query(
      `DELETE FROM posts
       WHERE id = $1
         AND ($2::BOOLEAN OR user_id = $3)
       RETURNING id, title, user_id`,
      [id, isAdmin, req.user.id],
    );

    if (result.rows.length === 0) {
      const post = await pool.query("SELECT id FROM posts WHERE id = $1", [id]);

      if (post.rows.length === 0) {
        throw new NotFoundError("Post not found");
      }

      throw new ForbiddenError("You can only delete your own posts");
    }

    await Promise.all([invalidatePostListCache(), invalidatePostCache(id)]);

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
      post: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export { createPost, getPosts, getPostById, updatePost, deletePost };
