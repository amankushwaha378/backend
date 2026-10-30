
import pool from "../config/db.js";
import {
  BadRequestError,
  NotFoundError,
} from "../utils/AppError.js";

const publicUserColumns = "id, name, email, age, created_at";

const isValidId = (id) => /^[1-9]\d*$/.test(id);

const validateUser = ({ name, email, age }) => {
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw new BadRequestError("A valid name and email are required");
  }

  if (
    age !== undefined &&
    age !== null &&
    (!Number.isInteger(age) || age < 1 || age > 120)
  ) {
    throw new BadRequestError("Age must be an integer between 1 and 120");
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, age } = req.body;

    validateUser({ name, email, age });

    const result = await pool.query(
      `INSERT INTO users (name, email, age)
       VALUES ($1, $2, $3)
       RETURNING ${publicUserColumns}`,
      [name.trim(), email.trim().toLowerCase(), age ?? null],
    );

    return res.status(201).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};


const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100,
    );
    const offset = (page - 1) * limit;

    const allowedSortColumns = [
      "id",
      "name",
      "email",
      "age",
      "created_at",
    ];

    const sortBy = allowedSortColumns.includes(req.query.sortBy)
      ? req.query.sortBy
      : "id";

    const order =
      req.query.order?.toLowerCase() === "desc" ? "DESC" : "ASC";

    const usersResult = await pool.query(
      `SELECT ${publicUserColumns}
       FROM users
       ORDER BY ${sortBy} ${order}
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const countResult = await pool.query("SELECT COUNT(*) FROM users");
    const totalUsers = Number(countResult.rows[0].count);

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
      sorting: {
        sortBy,
        order: order.toLowerCase(),
      },
      users: usersResult.rows,
    });
  } catch (error) {
    next(error);
  }
};

// Get one user
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      throw new BadRequestError("Invalid user ID");
    }

    const result = await pool.query(
      `SELECT ${publicUserColumns}
       FROM users
       WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError("User not found");
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};


const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, age } = req.body;

    if (!isValidId(id)) {
      throw new BadRequestError("Invalid user ID");
    }

    validateUser({ name, email, age });

    const result = await pool.query(
      `UPDATE users
       SET name = $1,
           email = $2,
           age = $3
       WHERE id = $4
       RETURNING ${publicUserColumns}`,
      [name.trim(), email.trim().toLowerCase(), age ?? null, id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError("User not found");
    }

    return res.status(200).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};


const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      throw new BadRequestError("Invalid user ID");
    }

    const result = await pool.query(
      `DELETE FROM users
       WHERE id = $1
       RETURNING ${publicUserColumns}`,
      [id],
    );

    if (result.rows.length === 0) {
      throw new NotFoundError("User not found");
    }

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      user: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

export { createUser, getUsers, getUserById, updateUser, deleteUser };
