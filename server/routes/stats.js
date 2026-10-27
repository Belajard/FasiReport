import { Router } from "express";
import { z } from "zod";
import { query } from "../db.js";
import { asyncHandler, parse } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// GET /api/stats?period=7d|30d|90d|all  (default: all)
router.get("/", asyncHandler(async (req, res) => {
  const { period } = parse(z.object({ period: z.enum(["7d", "30d", "90d", "all"]).default("all") }), req.query);
  const days = period === "all" ? null : parseInt(period, 10);
  const u = req.user;

  const conds = [], params = [];
  if (u.role === "employee") { params.push(u.id); conds.push(`r.user_id = $${params.length}`); }
  if (u.role === "technician") { params.push(u.id); conds.push(`r.technician_id = $${params.length}`); }
  if (days) { params.push(days); conds.push(`r.created_at >= NOW() - ($${params.length} || ' days')::interval`); }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

  const main = (await query(
    `SELECT COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status='reported')::int AS reported,
       COUNT(*) FILTER (WHERE status='assigned')::int AS assigned,
       COUNT(*) FILTER (WHERE status='processing')::int AS processing,
       COUNT(*) FILTER (WHERE status='repaired')::int AS repaired,
       COUNT(*) FILTER (WHERE status='completed')::int AS completed,
       COUNT(*) FILTER (WHERE status='rejected')::int AS rejected,
       COUNT(*) FILTER (WHERE priority='low')::int AS p_low,
       COUNT(*) FILTER (WHERE priority='medium')::int AS p_medium,
       COUNT(*) FILTER (WHERE priority='high')::int AS p_high,
       COUNT(*) FILTER (WHERE due_at < NOW() AND status IN ('assigned','processing'))::int AS overdue,
       COUNT(*) FILTER (WHERE reopen_count > 0)::int AS disputed,
       COALESCE(SUM(cost) FILTER (WHERE status IN ('repaired','completed')),0)::numeric AS total_cost,
       ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FILTER (WHERE completed_at IS NOT NULL)::numeric,1) AS avg_resolution_hours
     FROM reports r ${where}`, params)).rows[0];

  const activeFacilities = (await query(`SELECT COUNT(*)::int AS n FROM facilities WHERE status='active'`)).rows[0].n;

  const out = {
    totalReports: main.total,
    reportedCount: main.reported,
    assignedCount: main.assigned,
    processingCount: main.processing,
    repairedCount: main.repaired,
    completedCount: main.completed,
    rejectedCount: main.rejected,
    activeFacilitiesCount: activeFacilities,
    priorityCounts: { low: main.p_low, medium: main.p_medium, high: main.p_high },
    overdueCount: main.overdue,
    disputedCount: main.disputed,
    totalCost: main.total_cost,
    avgResolutionHours: main.avg_resolution_hours === null ? null : Number(main.avg_resolution_hours),
    period,
  };

  if (u.role === "admin") {
    const trend = (await query(
      `SELECT to_char(m,'YYYY-MM') AS month,
         COUNT(r.id)::int AS reports, COUNT(r.id) FILTER (WHERE r.status='completed')::int AS completed
       FROM generate_series(date_trunc('month',NOW()) - INTERVAL '5 months', date_trunc('month',NOW()), INTERVAL '1 month') m
       LEFT JOIN reports r ON date_trunc('month', r.created_at) = m GROUP BY m ORDER BY m`)).rows;
    const byCategory = (await query(
      `SELECT f.category, COUNT(r.id)::int AS count FROM reports r JOIN facilities f ON f.id=r.facility_id
       ${days ? "WHERE r.created_at >= NOW() - ($1 || ' days')::interval" : ""} GROUP BY f.category ORDER BY count DESC LIMIT 6`,
      days ? [days] : [])).rows;
    const topFacilities = (await query(
      `SELECT f.id, f.name, f.location, COUNT(r.id)::int AS count FROM reports r JOIN facilities f ON f.id=r.facility_id
       ${days ? "WHERE r.created_at >= NOW() - ($1 || ' days')::interval" : ""} GROUP BY f.id ORDER BY count DESC LIMIT 5`,
      days ? [days] : [])).rows;
    out.trend = trend;
    out.byCategory = byCategory;
    out.topFacilities = topFacilities;
    out.waitingVerification = main.reported;
  }
  res.json({ data: out });
}));

export default router;
