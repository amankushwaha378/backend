import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import transporter from "../config/mailer.js";

const genericResponse = {
  success: true,
  message:
    "If an account exists for that email, a password reset link will be sent.",
};

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// POST /api/auth/forgot-password
export async function forgotPassword(req, res) {
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  if (!email || email.length > 255) {
    return res.status(400).json({
      success: false,
      message: "A valid email is required.",
    });
  }

  let tokenHash;

  try {
    const result = await pool.query(
      `SELECT id, email FROM users WHERE LOWER(email) = $1`,
      [email],
    );

    console.log(result);

    // Do not reveal whether an account exists.
    if (result.rowCount === 0) {
      return res.status(200).json(genericResponse);
    }

    const user = result.rows[0];

    // 32 random bytes = 256 bits of token entropy.
    const rawToken = crypto.randomBytes(32).toString("hex");
    tokenHash = hashToken(rawToken);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `INSERT INTO password_reset_tokens
         (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET
         token_hash = EXCLUDED.token_hash,
         expires_at = EXCLUDED.expires_at,
         created_at = NOW()`,
      [user.id, tokenHash, expiresAt],
    );

    const resetUrl =
      `${process.env.APP_URL}/reset-password?token=` +
      encodeURIComponent(rawToken);

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: user.email,
      subject: "Reset your password",
      text: [
        "We received a request to reset your password.",
        `Open this link within 15 minutes: ${resetUrl}`,
        "If you did not request this, ignore this email.",
      ].join("\n\n"),
      html: `
        <p>We received a request to reset your password.</p>
        <p>
          <a href="${resetUrl}">Reset your password</a>
        </p>
        <p>This link expires in 15 minutes and can only be used once.</p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });

    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Password reset request failed:", error.message);

    // Don't leave a usable token behind if sending the email failed.
    if (tokenHash) {
      try {
        await pool.query(
          `DELETE FROM password_reset_tokens WHERE token_hash = $1`,
          [tokenHash],
        );
      } catch (cleanupError) {
        console.error("Reset-token cleanup failed:", cleanupError.message);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Unable to process the request right now.",
    });
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (
    typeof token !== "string" ||
    !/^[a-f0-9]{64}$/i.test(token) ||
    typeof newPassword !== "string" ||
    newPassword.length < 8 ||
    newPassword.length > 128
  ) {
    return res.status(400).json({
      success: false,
      message:
        "A valid reset token and a password between 8 and 128 characters are required.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tokenHash = hashToken(token);

    const tokenResult = await client.query(
      `SELECT user_id
       FROM password_reset_tokens
       WHERE token_hash = $1
         AND expires_at > NOW()
       FOR UPDATE`,
      [tokenHash],
    );

    if (tokenResult.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token.",
      });
    }

    const userId = tokenResult.rows[0].user_id;
    const passwordHash = await bcrypt.hash(newPassword, 12);

    await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [
      passwordHash,
      userId,
    ]);

    // A token can never be reused after a successful reset.
    await client.query(`DELETE FROM password_reset_tokens WHERE user_id = $1`, [
      userId,
    ]);

    // Assumes connect-pg-simple uses its default "session" table
    // and Passport stores the authenticated ID at sess.passport.user.

    await client.query(
      `DELETE FROM user_sessions
   WHERE sess->'passport'->>'user' = $1`,
      [String(userId)],
    );

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully. Please log in with your new password.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Password reset failed:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to reset the password right now.",
    });
  } finally {
    client.release();
  }
}
