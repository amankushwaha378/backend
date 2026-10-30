import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import passport from "../config/passport.js";
import { BadRequestError } from "../utils/AppError.js";
import { emailQueue } from "../queues/emailQueue.js";
import {
  getFailedAttempts,
  recordFailedAttempt,
  clearFailedAttempts,
} from "../utils/loginAttempts.js";
import { verifyCaptcha } from "../utils/verifyCaptcha.js";

const register = async (req, res, next) => {
  try {
    const { name, email, age, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" ||
      password.length < 8 ||
      !Number.isInteger(age) ||
      age < 1 ||
      age > 120
    ) {
      throw new BadRequestError(
        "Provide a valid name, email, age, and password of at least 8 characters",
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users (name, email, age, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, age, created_at`,
      [name.trim(), email.trim().toLowerCase(), age, passwordHash],
    );

    const user = result.rows[0];

    try {
      console.log("Adding welcome email job for:", user.email);
      await emailQueue.add(
        "welcome-email",
        {
          userId: user.id,
          name: user.name,
          email: user.email,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      );
      console.log("Welcome email job added successfully");
    } catch (queueError) {
     
      console.error("Failed to enqueue welcome email:", queueError.message);
    }

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user
    });
  } catch (error) {
    return next(error);
  }
};



const login = async (req, res, next) => {
  try {
    const email = req.body?.email;

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const failedAttempts = await getFailedAttempts(normalizedEmail);
    const threshold = Number(
      process.env.LOGIN_CAPTCHA_THRESHOLD || 3,
    );

    if (failedAttempts >= threshold) {
      const token = req.body?.captchaToken;

      if (typeof token !== "string" || !token) {
        return res.status(403).json({
          success: false,
          captchaRequired: true,
          message: "Please complete the CAPTCHA to continue",
        });
      }

      const validCaptcha = await verifyCaptcha(
        token,
        req.ip,
      );

      if (!validCaptcha) {
        return res.status(403).json({
          success: false,
          captchaRequired: true,
          message: "Invalid CAPTCHA. Please try again.",
        });
      }
    }

    passport.authenticate("local", async (error, user) => {
      try {
        if (error) return next(error);

        if (!user) {
          await recordFailedAttempt(normalizedEmail);

          return res.status(401).json({
            success: false,
            message: "Invalid email or password",
          });
        }

        await clearFailedAttempts(normalizedEmail);

        req.logIn(user, (loginError) => {
          if (loginError) return next(loginError);

          return res.status(200).json({
            success: true,
            message: "Login successful",
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            },
          });
        });
      } catch (innerError) {
        next(innerError);
      }
    })(req, res, next);
  } catch (error) {
    next(error);
  }
};


const logout = (req, res, next) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }

    if (!req.session) {
      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    }

    req.session.destroy((sessionError) => {
      if (sessionError) {
        return next(sessionError);
      }

      res.clearCookie("connect.sid");

      return res.status(200).json({
        success: true,
        message: "Logout successful",
      });
    });
  });
};

export { register, login, logout };
