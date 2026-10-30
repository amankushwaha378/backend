import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import pool from "./db.js";

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const result = await pool.query(
          `SELECT id, name, email, password_hash
           FROM users
           WHERE email = $1`,
          [email.trim().toLowerCase()]
        );

        const user = result.rows[0];

        if (!user) {
          return done(null, false, {
            message: "Invalid email or password",
          });
        }

        const isMatch = await bcrypt.compare(
          password,
          user.password_hash
        );

        if (!isMatch) {
          return done(null, false, {
            message: "Invalid email or password",
          });
        }

        delete user.password_hash;

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});


passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, age, role FROM users WHERE id = $1",
      [id]
    );

    done(null, result.rows[0] || false);
  } catch (error) {
    done(error);
  }
});


export default passport;
