
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config({quiet : true});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database:
    process.env.NODE_ENV === "test"
      ? "blog_api_test"
      : process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export default pool;
