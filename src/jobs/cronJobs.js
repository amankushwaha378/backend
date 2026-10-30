
import cron from "node-cron";
import pool from "../config/db.js";
import logger from "../config/logger.js";

const startCronJobs = () => {
  // Daily summary at 9:00 AM Indian Standard Time
  cron.schedule(
    "0 9 * * *",
    // "*/1 * * * *",
    async () => {
      try {
        const result = await pool.query(`
          WITH bounds AS (
            SELECT
              date_trunc(
                'day',
                NOW() AT TIME ZONE 'Asia/Kolkata'
              ) AT TIME ZONE 'Asia/Kolkata' AS start_at,

              (
                date_trunc(
                  'day',
                  NOW() AT TIME ZONE 'Asia/Kolkata'
                ) + INTERVAL '1 day'
              ) AT TIME ZONE 'Asia/Kolkata' AS end_at
          )
          SELECT
            (SELECT COUNT(*)::INTEGER FROM posts)
              AS total_posts,

            (SELECT COUNT(*)::INTEGER FROM comments)
              AS total_comments,

            (SELECT COUNT(*)::INTEGER FROM post_likes)
              AS total_likes,

            (
              SELECT COUNT(*)::INTEGER
              FROM posts p CROSS JOIN bounds b
              WHERE p.created_at >= b.start_at
                AND p.created_at < b.end_at
            ) AS posts_today,

            (
              SELECT COUNT(*)::INTEGER
              FROM comments c CROSS JOIN bounds b
              WHERE c.created_at >= b.start_at
                AND c.created_at < b.end_at
            ) AS comments_today,

            (
              SELECT COUNT(*)::INTEGER
              FROM post_likes pl CROSS JOIN bounds b
              WHERE pl.created_at >= b.start_at
                AND pl.created_at < b.end_at
            ) AS likes_today
        `);

        logger.info(
          {
            ...result.rows[0],
            summaryDate: new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Kolkata",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date()),
          },
          "Daily blog summary completed"
        );
      } catch (error) {
        logger.error(
          { err: error },
          "Daily blog summary failed"
        );
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  logger.info("Daily blog summary scheduled for 9:00 AM IST");
};

export default startCronJobs;
