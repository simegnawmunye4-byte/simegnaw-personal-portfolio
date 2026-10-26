import { Router } from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { z } from "zod";
import { prisma } from "../db.js";

const router = Router();
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many messages. Please try again later." },
});

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(10).max(5000),
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/", contactLimiter, async (req, res) => {
  const result = contactSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: "Invalid contact form data",
      details: result.error.flatten().fieldErrors,
    });
  }

  try {
    const savedMessage = await prisma.contactMessage.create({ data: result.data });

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error("EMAIL_USER / EMAIL_PASS are not configured.");
      return res.status(201).json({
        message: "Message received. Email notification was not sent because SMTP is not configured.",
        savedMessage,
      });
    }

    await transporter.sendMail({
      from: `"${result.data.name}" <${process.env.EMAIL_USER}>`,
      to: "simegnawmunye4@gmail.com",
      replyTo: result.data.email,
      subject: `New Contact Form Message: ${result.data.subject}`,
      text: [
        `Name: ${result.data.name}`,
        `Email: ${result.data.email}`,
        `Subject: ${result.data.subject}`,
        "",
        "Message:",
        result.data.message,
      ].join("\n"),
    });

    return res.status(201).json({ message: "Message received and email notification sent." });
  } catch (error) {
    console.error("Contact form processing failed:", error);
    return res.status(500).json({
      error: "Unable to process contact request.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;