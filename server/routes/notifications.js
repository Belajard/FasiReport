import { Router } from "express";
import { query } from "../db.js";
import { asyncHandler } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC, id DESC LIMIT 50`, [req.user.id]);
  const unread = (await query(`SELECT COUNT(*)::int AS n FROM notifications WHERE user_id=$1 AND NOT is_read`, [req.user.id])).rows[0].n;
  res.json({ data: rows, unread });
}));

router.post("/read-all", asyncHandler(async (req, res) => {
  await query(`UPDATE notifications SET is_read=TRUE WHERE user_id=$1`, [req.user.id]);
  res.json({ message: "ok" });
}));

router.post("/:id/read", asyncHandler(async (req, res) => {
  await query(`UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2`, [Number(req.params.id), req.user.id]);
  res.json({ message: "ok" });
}));

export default router;
