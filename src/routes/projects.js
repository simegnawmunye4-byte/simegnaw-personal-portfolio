import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

const router = Router();
const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .nullish()
  .transform((value) => value || null);

const projectSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(5000),
  imageUrl: optionalUrl,
  techStack: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  liveDemoUrl: optionalUrl,
  githubUrl: optionalUrl,
});

function requireAdminKey(req, res, next) {
  const expectedKey = process.env.ADMIN_API_KEY;
  const suppliedKey = req.get("x-admin-key");

  if (!expectedKey) {
    return res.status(503).json({ error: "Project creation is not configured" });
  }
  if (!suppliedKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const expected = Buffer.from(expectedKey);
  const supplied = Buffer.from(suppliedKey);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

router.get("/", async (_req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });
  return res.json(projects);
});

router.post("/", requireAdminKey, async (req, res) => {
  const result = projectSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: "Invalid project data",
      details: result.error.flatten().fieldErrors,
    });
  }

  const project = await prisma.project.create({ data: result.data });
  return res.status(201).json(project);
});

export default router;