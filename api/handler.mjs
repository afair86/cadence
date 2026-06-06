var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// apps/api/src/lib/commitment-parser.ts
var commitment_parser_exports = {};
__export(commitment_parser_exports, {
  parseDuePhrase: () => parseDuePhrase,
  ruleDetectCommitments: () => ruleDetectCommitments
});
function parseDuePhrase(text, baseDate = /* @__PURE__ */ new Date()) {
  const lower = text.toLowerCase();
  const d = new Date(baseDate);
  d.setSeconds(0, 0);
  if (/\btonight\b|\bthis evening\b|\bby end of day\b|\beod\b/.test(lower)) {
    d.setHours(20, 0, 0, 0);
    if (d.getTime() < baseDate.getTime()) d.setDate(d.getDate() + 1);
    return d;
  }
  if (/\btomorrow\b/.test(lower)) {
    d.setDate(d.getDate() + 1);
    d.setHours(17, 0, 0, 0);
    return d;
  }
  if (/\basap\b|\bas soon as possible\b|\burgent\b/.test(lower)) {
    d.setHours(d.getHours() + 4, 0, 0, 0);
    if (d.getHours() < 9) d.setHours(9, 0, 0, 0);
    return d;
  }
  if (/\btoday\b|\bthis afternoon\b/.test(lower)) {
    d.setHours(17, 0, 0, 0);
    if (d.getTime() < baseDate.getTime()) d.setHours(baseDate.getHours() + 2, 0, 0, 0);
    return d;
  }
  if (/\bend of (the )?week\b|\bthis week\b|\bby friday\b/.test(lower)) {
    const day = d.getDay();
    const daysUntilFriday = day <= 5 ? 5 - day : 5 + (7 - day);
    d.setDate(d.getDate() + daysUntilFriday);
    d.setHours(17, 0, 0, 0);
    return d;
  }
  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  for (let i = 0; i < weekdays.length; i++) {
    if (lower.includes(weekdays[i])) {
      const target = i;
      let diff = target - d.getDay();
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      d.setHours(17, 0, 0, 0);
      return d;
    }
  }
  const inDays = lower.match(/\b(?:in|within)\s+(\d+)\s+days?\b/);
  if (inDays) {
    d.setDate(d.getDate() + Number(inDays[1]));
    d.setHours(17, 0, 0, 0);
    return d;
  }
  const byDate = lower.match(/\bby\s+(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (byDate) {
    const day = Number(byDate[1]);
    const month = Number(byDate[2]) - 1;
    const year = byDate[3] ? Number(byDate[3].length === 2 ? `20${byDate[3]}` : byDate[3]) : d.getFullYear();
    const parsed = new Date(year, month, day, 17, 0, 0, 0);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}
function ruleDetectCommitments(text, direction, baseDate = /* @__PURE__ */ new Date()) {
  const trimmed = text.trim();
  if (trimmed.length < 8) return [];
  const patterns = direction === "mine" ? MINE_PATTERNS : THEIRS_PATTERNS;
  const matched = patterns.some((p) => p.test(trimmed));
  if (!matched) return [];
  const dueAt = parseDuePhrase(trimmed, baseDate) ?? defaultDue(direction, baseDate);
  let title = trimmed.slice(0, 100);
  if (title.length >= 100) title = `${title.slice(0, 97)}\u2026`;
  if (direction === "theirs") {
    title = title.replace(/^(can you|could you|please)\s+/i, "");
    title = `Respond: ${title.charAt(0).toUpperCase()}${title.slice(1)}`;
  } else {
    title = `Follow up: ${title.charAt(0).toUpperCase()}${title.slice(1)}`;
  }
  const quote = trimmed.length <= 120 ? trimmed : `${trimmed.slice(0, 117)}\u2026`;
  return [{ title, dueAt, direction, sourceQuote: quote }];
}
function defaultDue(direction, baseDate) {
  const d = new Date(baseDate);
  if (direction === "mine") {
    d.setHours(20, 0, 0, 0);
    if (d.getTime() < baseDate.getTime()) {
      d.setDate(d.getDate() + 1);
      d.setHours(17, 0, 0, 0);
    }
  } else {
    d.setDate(d.getDate() + 1);
    d.setHours(12, 0, 0, 0);
  }
  return d;
}
var MINE_PATTERNS, THEIRS_PATTERNS;
var init_commitment_parser = __esm({
  "apps/api/src/lib/commitment-parser.ts"() {
    "use strict";
    MINE_PATTERNS = [
      /\bi['']?ll\b/i,
      /\bi will\b/i,
      /\bget onto\b/i,
      /\bget on to\b/i,
      /\bsend (you|it|that|the)\b/i,
      /\bupdate (you|them)\b/i,
      /\bfollow up\b/i,
      /\bby tonight\b/i,
      /\bby tomorrow\b/i,
      /\bwill do\b/i,
      /\bleave it with me\b/i
    ];
    THEIRS_PATTERNS = [
      /\bcan you\b/i,
      /\bcould you\b/i,
      /\bplease (update|send|review|check|confirm|call|email)\b/i,
      /\bneed you to\b/i,
      /\bwhen can you\b/i,
      /\bany update\b/i,
      /\bcan i get\b/i,
      /\bwaiting on\b/i,
      /\blet me know\b/i
    ];
  }
});

// api/entry.ts
import serverless from "serverless-http";

// apps/api/src/app.ts
import cors from "cors";
import express from "express";

// apps/api/src/db.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
function resolveDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_URL_NON_POOLING ?? "";
}
var databaseUrl = resolveDatabaseUrl();
if (databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}
var globalForPrisma = globalThis;
function createPrismaClient() {
  if (!databaseUrl) {
    return new PrismaClient();
  }
  const pool = globalForPrisma.pgPool ?? new pg.Pool({ connectionString: databaseUrl });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}
var prisma = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// apps/api/src/routes/auth.ts
import { Router } from "express";
import bcrypt from "bcryptjs";

// apps/api/src/middleware/auth.ts
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET ?? "cadence-dev-secret";
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
function getAuth(req) {
  return req.auth;
}

// apps/api/src/routes/auth.ts
var router = Router();
router.post("/register", async (req, res) => {
  const { email, password, name, teamName } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: "Email, password, and name are required" });
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const team = await prisma.team.create({
    data: {
      name: teamName ?? `${name}'s Team`,
      pointConfig: { create: {} }
    }
  });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, teamId: team.id, role: "BDM" },
    include: { team: true }
  });
  const token = signToken({ userId: user.id, teamId: team.id, email: user.email });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: team.id,
      teamName: team.name
    }
  });
});
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const user = await prisma.user.findUnique({
    where: { email },
    include: { team: true }
  });
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = signToken({ userId: user.id, teamId: user.teamId, email: user.email });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
      teamName: user.team.name
    }
  });
});
router.get("/me", authMiddleware, async (req, res) => {
  const { userId } = getAuth(req);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { team: true }
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    teamId: user.teamId,
    teamName: user.team.name
  });
});
var auth_default = router;

// apps/api/src/routes/contacts.ts
import { Router as Router2 } from "express";

// apps/api/src/lib/helpers.ts
function daysSince(date) {
  if (!date) return null;
  const ms = Date.now() - date.getTime();
  return Math.floor(ms / (1e3 * 60 * 60 * 24));
}
function computeHealth(lastContactAt) {
  const days = daysSince(lastContactAt);
  if (days === null) {
    return { healthScore: 50, healthStatus: "cooling" };
  }
  if (days <= 7) return { healthScore: 85, healthStatus: "healthy" };
  if (days <= 14) return { healthScore: 72, healthStatus: "healthy" };
  if (days <= 21) return { healthScore: 58, healthStatus: "cooling" };
  if (days <= 30) return { healthScore: 42, healthStatus: "cooling" };
  return { healthScore: 25, healthStatus: "at_risk" };
}
function formatTime(date) {
  return date.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  });
}
function formatScheduled(date) {
  const now = /* @__PURE__ */ new Date();
  const isToday = date.toDateString() === now.toDateString();
  const day = isToday ? "Today" : date.toLocaleDateString("en-AU", { weekday: "short" });
  return `${day} ${formatTime(date)}`;
}
function greetingForHour(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
function actionLabel(method) {
  const labels = {
    call: "Call Now",
    sms: "Send Text",
    email: "Send Email",
    meeting: "Schedule Meeting"
  };
  return labels[method] ?? "Contact";
}
function ruleBasedInsight(name, days, preferredTimes, healthStatus) {
  if (days !== null && days >= 21) {
    return `Relationship check-in: No contact in ${days} days`;
  }
  if (preferredTimes) {
    return `Best time to reach: ${preferredTimes}`;
  }
  if (healthStatus === "cooling") {
    return `Relationship cooling: Touch base with ${name.split(" ")[0]}`;
  }
  return `Follow up required: Stay on cadence with ${name.split(" ")[0]}`;
}
function suggestScheduledTime(preferredTimes) {
  const d = /* @__PURE__ */ new Date();
  d.setMinutes(0, 0, 0);
  if (preferredTimes?.toLowerCase().includes("11")) {
    d.setHours(11, 15, 0, 0);
  } else if (preferredTimes?.toLowerCase().includes("afternoon")) {
    d.setHours(14, 0, 0, 0);
  } else {
    d.setHours(d.getHours() + 1, 0, 0, 0);
  }
  if (d.getTime() < Date.now()) {
    d.setHours(d.getHours() + 2);
  }
  return d;
}

// apps/api/src/services/contact.service.ts
function toContactDto(row) {
  const days = daysSince(row.lastContactAt);
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    position: row.position ?? void 0,
    phone: row.phone ?? void 0,
    email: row.email ?? void 0,
    whatsappPhone: row.whatsappPhone ?? void 0,
    instagramHandle: row.instagramHandle ?? void 0,
    facebookUsername: row.facebookUsername ?? void 0,
    linkedinUrl: row.linkedinUrl ?? void 0,
    address: row.address ?? void 0,
    tags: row.tags,
    sphere: row.sphere,
    healthScore: row.healthScore,
    healthStatus: row.healthStatus,
    lastContactDaysAgo: days,
    preferredMethod: row.preferredMethod,
    preferredTimes: row.preferredTimes ?? void 0,
    responseTime: row.responseTime ?? void 0
  };
}

// packages/shared/dist/sections.js
var SECTIONS = [
  {
    id: "business",
    label: "Business",
    subtitle: "Clients, deals & work relationships",
    spheres: ["business"],
    accent: "#6366f1"
  },
  {
    id: "personal",
    label: "Personal",
    subtitle: "Friends & your wider network",
    spheres: ["personal"],
    accent: "#0ea5e9"
  },
  {
    id: "family",
    label: "Family",
    subtitle: "Partner, kids, parents & relatives",
    spheres: ["family"],
    accent: "#ec4899"
  },
  {
    id: "all",
    label: "Everything",
    subtitle: "All relationships in one view",
    spheres: ["business", "personal", "family"],
    accent: "#64748b"
  }
];
var SPHERE_LABELS = {
  business: "Business",
  personal: "Personal",
  family: "Family"
};
function getSection(id) {
  return SECTIONS.find((s) => s.id === id) ?? SECTIONS[0];
}
function spheresForSection(section) {
  return getSection(section).spheres;
}

// packages/shared/dist/time-budget.js
var DEFAULT_TIME_BUDGET = {
  businessHoursPerWeek: 20,
  personalHoursPerWeek: 3,
  familyHoursPerWeek: 2
};
var SPHERE_TIME_ACCENTS = {
  business: "#6366f1",
  personal: "#0ea5e9",
  family: "#ec4899"
};
function totalWeeklyHours(budget) {
  return budget.businessHoursPerWeek + budget.personalHoursPerWeek + budget.familyHoursPerWeek;
}

// packages/shared/dist/time-insights.js
function daysSinceMonday(now = /* @__PURE__ */ new Date()) {
  return (now.getDay() + 6) % 7;
}
function weekFraction(dayIndex) {
  return (dayIndex + 1) / 7;
}
function paceStatus(spentHours, targetHours, dayIndex) {
  if (targetHours <= 0)
    return "none";
  const expected = targetHours * weekFraction(dayIndex);
  if (spentHours >= targetHours * 0.95)
    return "ahead";
  if (spentHours >= expected * 0.85)
    return "on_track";
  if (spentHours === 0 && dayIndex >= 3)
    return "behind";
  if (spentHours < expected * 0.5)
    return "light";
  return "on_track";
}
function buildHeadline(sections) {
  const active = sections.filter((s) => s.status !== "none");
  if (active.length === 0)
    return "Set your weekly hours to start tracking balance";
  const weak = active.filter((s) => s.status === "light" || s.status === "behind");
  const good = active.filter((s) => s.status === "ahead" || s.status === "on_track");
  if (weak.length === 0) {
    return `Good week \u2014 ${good.map((s) => s.label.toLowerCase()).join(" and ")} on track`;
  }
  const goodPart = good.map((s) => s.label.toLowerCase()).join(" and ");
  const weakPart = weak.map((s) => s.status === "behind" ? `behind on ${s.label.toLowerCase()}` : `light on ${s.label.toLowerCase()}`).join(", ");
  if (goodPart) {
    return `You hit ${goodPart}, ${weakPart}`;
  }
  return `This week: ${weakPart}`;
}
function findMostBehind(rows, dayIndex) {
  const spheres = rows.filter((r) => r.id === "business" || r.id === "personal" || r.id === "family");
  let worst = null;
  for (const row of spheres) {
    if (row.targetHours <= 0)
      continue;
    const expected = row.targetHours * weekFraction(dayIndex);
    const deficit = Math.max(0, expected - row.spentHours);
    const score = deficit / row.targetHours;
    if (!worst || score > worst.score) {
      worst = { sphere: row.id, score };
    }
  }
  return worst && worst.score > 0.05 ? worst.sphere : null;
}
function buildWeeklyTimeInsights(balance, now = /* @__PURE__ */ new Date()) {
  const dayIndex = daysSinceMonday(now);
  const weekProgressPercent = Math.round(weekFraction(dayIndex) * 100);
  const sphereRows = balance.rows.filter((r) => r.id === "business" || r.id === "personal" || r.id === "family");
  const sections = sphereRows.map((row) => {
    const status = paceStatus(row.spentHours, row.targetHours, dayIndex);
    let message = "";
    switch (status) {
      case "ahead":
        message = `${row.spentHours}h logged \u2014 ahead of pace`;
        break;
      case "on_track":
        message = `${row.spentHours}h of ${row.targetHours}h \u2014 on track`;
        break;
      case "light":
        message = `Only ${row.spentHours}h so far \u2014 aim for ${row.targetHours}h this week`;
        break;
      case "behind":
        message = `No time logged yet \u2014 ${row.targetHours}h planned this week`;
        break;
      default:
        message = "";
    }
    return { sphere: row.id, label: row.label, status, message };
  });
  const nudges = [];
  const family = sphereRows.find((r) => r.id === "family");
  if (family && family.targetHours > 0 && family.spentHours === 0 && dayIndex >= 3) {
    nudges.push({
      id: "family-zero-thursday",
      sphere: "family",
      message: "You haven\u2019t logged any family time this week. Even a quick call counts \u2014 block 30 minutes?",
      severity: "warning"
    });
  }
  const mostBehind = findMostBehind(balance.rows, dayIndex);
  const sectionBySphere = new Map(sections.map((s) => [s.sphere, s]));
  if (mostBehind && mostBehind !== "family") {
    const sectionStatus = sectionBySphere.get(mostBehind);
    if (sectionStatus && (sectionStatus.status === "light" || sectionStatus.status === "behind")) {
      nudges.push({
        id: `behind-${mostBehind}`,
        sphere: mostBehind,
        message: `${sectionStatus.label} is most behind your weekly plan \u2014 today\u2019s suggestions focus here.`,
        severity: "info"
      });
    }
  } else if (mostBehind === "family" && family && family.spentHours > 0) {
    nudges.push({
      id: "behind-family",
      sphere: "family",
      message: "Family is most behind your weekly plan \u2014 today\u2019s suggestions focus here.",
      severity: "info"
    });
  }
  return {
    nudges,
    summary: {
      headline: buildHeadline(sections),
      sections,
      mostBehindSphere: mostBehind
    },
    daysElapsed: dayIndex + 1,
    weekProgressPercent
  };
}
function smartPlanFocusFromInsights(insights) {
  const sphere = insights.summary.mostBehindSphere;
  if (!sphere)
    return null;
  return {
    sphere,
    label: SPHERE_LABELS[sphere],
    reason: `${SPHERE_LABELS[sphere]} is most behind your weekly plan`
  };
}

// apps/api/src/lib/sections.ts
function parseSectionQuery(section) {
  const valid = ["business", "personal", "family", "all"];
  if (section && valid.includes(section)) {
    return section;
  }
  return "business";
}
function sphereFilter(section) {
  const spheres = spheresForSection(section);
  return { sphere: { in: spheres } };
}
function sectionMeta(section) {
  const config = getSection(section);
  return {
    activeSection: section,
    sectionLabel: config.label,
    sectionSubtitle: config.subtitle
  };
}

// apps/api/src/routes/contacts.ts
var router2 = Router2();
router2.use(authMiddleware);
router2.get("/", async (req, res) => {
  const { teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section);
  const rows = await prisma.contact.findMany({
    where: { teamId, ...sphereFilter(section) },
    orderBy: { name: "asc" }
  });
  res.json(rows.map(toContactDto));
});
router2.get("/:id", async (req, res) => {
  const { teamId } = getAuth(req);
  const row = await prisma.contact.findFirst({
    where: { id: req.params.id, teamId }
  });
  if (!row) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  res.json(toContactDto(row));
});
router2.post("/", async (req, res) => {
  const { teamId } = getAuth(req);
  const body = req.body;
  if (!body.name || !body.company) {
    res.status(400).json({ error: "Name and company required" });
    return;
  }
  const { healthScore, healthStatus } = computeHealth(null);
  const row = await prisma.contact.create({
    data: {
      teamId,
      name: body.name,
      company: body.company,
      position: body.position,
      phone: body.phone,
      email: body.email,
      whatsappPhone: body.whatsappPhone,
      instagramHandle: body.instagramHandle,
      facebookUsername: body.facebookUsername,
      linkedinUrl: body.linkedinUrl,
      address: body.address,
      tags: body.tags ?? [],
      sphere: body.sphere ?? "business",
      preferredMethod: body.preferredMethod ?? "call",
      preferredTimes: body.preferredTimes,
      responseTime: body.responseTime,
      healthScore,
      healthStatus
    }
  });
  res.status(201).json(toContactDto(row));
});
var contacts_default = router2;

// apps/api/src/routes/activities.ts
import { Router as Router3 } from "express";

// apps/api/src/lib/sectionFilter.ts
async function contactIdsForSection(teamId, section) {
  if (section === "all") return null;
  const spheres = spheresForSection(section);
  const rows = await prisma.contact.findMany({
    where: { teamId, sphere: { in: spheres } },
    select: { id: true }
  });
  return rows.map((r) => r.id);
}
function activityFilter(userId, teamId, contactIds) {
  return {
    userId,
    contact: contactIds ? { teamId, id: { in: contactIds } } : { teamId }
  };
}

// apps/api/src/services/points.service.ts
var TYPE_TO_FIELD = {
  call: "call",
  sms: "sms",
  email: "email",
  meeting: "meeting",
  coffee: "coffee",
  site_visit: "siteVisit",
  quote: "quote",
  note: "note"
};
async function getPointConfig(teamId) {
  return await prisma.pointConfig.findUnique({ where: { teamId } }) ?? {
    call: 1,
    sms: 0.5,
    email: 0.5,
    meeting: 2,
    coffee: 2,
    siteVisit: 1.5,
    quote: 0.5,
    note: 0.25,
    dailyTarget: 15,
    monthlyTarget: 15
  };
}
async function pointsForActivity(teamId, type) {
  const config = await getPointConfig(teamId);
  const field = TYPE_TO_FIELD[type];
  return config[field];
}
async function refreshContactHealth(contactId) {
  const contact = await prisma.contact.findUnique({ where: { id: contactId } });
  if (!contact) return;
  const lastActivity = await prisma.activity.findFirst({
    where: { contactId },
    orderBy: { occurredAt: "desc" }
  });
  const lastContactAt = lastActivity?.occurredAt ?? contact.lastContactAt;
  const { healthScore, healthStatus } = computeHealth(lastContactAt);
  await prisma.contact.update({
    where: { id: contactId },
    data: { healthScore, healthStatus, lastContactAt }
  });
}
async function getTodayKpis(userId, teamId, section = "business") {
  const start = /* @__PURE__ */ new Date();
  start.setHours(0, 0, 0, 0);
  const end = /* @__PURE__ */ new Date();
  end.setHours(23, 59, 59, 999);
  const yesterdayStart = new Date(start);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(end);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  const contactIds = await contactIdsForSection(teamId, section);
  const baseWhere = activityFilter(userId, teamId, contactIds);
  const [today, yesterday, config] = await Promise.all([
    prisma.activity.findMany({
      where: { ...baseWhere, occurredAt: { gte: start, lte: end } }
    }),
    prisma.activity.findMany({
      where: { ...baseWhere, occurredAt: { gte: yesterdayStart, lte: yesterdayEnd } }
    }),
    getPointConfig(teamId)
  ]);
  const countBy = (items, type) => items.filter((a) => a.type === type).length;
  const points = (items) => items.reduce((sum, a) => sum + a.points, 0);
  const todayPoints = points(today);
  const progress = Math.min(100, Math.round(todayPoints / config.dailyTarget * 100));
  return {
    calls: countBy(today, "call"),
    callsDelta: countBy(today, "call") - countBy(yesterday, "call"),
    emails: countBy(today, "email"),
    emailsDelta: countBy(today, "email") - countBy(yesterday, "email"),
    meetings: countBy(today, "meeting") + countBy(today, "coffee"),
    meetingsDelta: countBy(today, "meeting") + countBy(today, "coffee") - (countBy(yesterday, "meeting") + countBy(yesterday, "coffee")),
    texts: countBy(today, "sms"),
    textsDelta: countBy(today, "sms") - countBy(yesterday, "sms"),
    points: todayPoints,
    progress,
    dailyTarget: config.dailyTarget
  };
}
async function getMonthlyPoints(userId, teamId, section = "business") {
  const now = /* @__PURE__ */ new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const contactIds = await contactIdsForSection(teamId, section);
  const baseWhere = activityFilter(userId, teamId, contactIds);
  const [activities, config] = await Promise.all([
    prisma.activity.findMany({
      where: { ...baseWhere, occurredAt: { gte: start, lte: end } }
    }),
    getPointConfig(teamId)
  ]);
  const current = activities.reduce((sum, a) => sum + a.points, 0);
  const daysRemaining = end.getDate() - now.getDate();
  return { current, target: config.monthlyTarget, daysRemaining };
}

// apps/api/src/services/commitment.service.ts
init_commitment_parser();

// apps/api/src/services/ai.service.ts
import OpenAI from "openai";
var openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
async function generateSmartPlan(contacts, focusSphere = null) {
  const sorted = focusSphere ? [...contacts].sort((a, b) => {
    const aFocus = a.sphere === focusSphere ? 0 : 1;
    const bFocus = b.sphere === focusSphere ? 0 : 1;
    if (aFocus !== bFocus) return aFocus - bFocus;
    return (b.lastContactDaysAgo ?? 0) - (a.lastContactDaysAgo ?? 0);
  }) : contacts;
  if (!openai || sorted.length === 0) {
    return sorted.map((c) => buildRulePlanItem(c, focusSphere));
  }
  try {
    const focusNote = focusSphere ? `
Prioritize contacts in the ${SPHERE_LABELS[focusSphere]} section \u2014 it is most behind the weekly time plan.` : "";
    const prompt = `You are a relationship assistant. For each contact, suggest one follow-up action.${focusNote}
Return JSON object with key "items": array of { "contactId", "insight" (short, actionable), "scheduledTime" (like "11:15 AM"), "suggestedAction" ("call"|"sms"|"email"|"meeting"), "priority" ("high"|"medium"|"low") }

Contacts:
${JSON.stringify(sorted, null, 2)}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const items = parsed.items ?? parsed.plan ?? (Array.isArray(parsed) ? parsed : []);
    if (Array.isArray(items) && items.length > 0) {
      return items.slice(0, 8);
    }
  } catch (err) {
    console.warn("OpenAI smart plan fallback:", err.message);
  }
  return sorted.map((c) => buildRulePlanItem(c, focusSphere));
}
function buildRulePlanItem(c, focusSphere) {
  const scheduled = suggestScheduledTime(c.preferredTimes);
  const method = ["call", "sms", "email", "meeting"].includes(c.preferredMethod) ? c.preferredMethod : "call";
  let priority = "low";
  if (c.healthStatus === "at_risk" || (c.lastContactDaysAgo ?? 0) >= 21) priority = "high";
  else if (c.healthStatus === "cooling" || (c.lastContactDaysAgo ?? 0) >= 14) priority = "medium";
  else if (focusSphere && c.sphere === focusSphere) priority = "medium";
  let insight = ruleBasedInsight(c.name, c.lastContactDaysAgo, c.preferredTimes, c.healthStatus);
  if (focusSphere && c.sphere === focusSphere && priority !== "high") {
    insight = `${SPHERE_LABELS[focusSphere]} time is behind this week \u2014 ${insight.charAt(0).toLowerCase()}${insight.slice(1)}`;
  }
  return {
    contactId: c.id,
    insight,
    scheduledTime: formatTime(scheduled),
    suggestedAction: method,
    priority
  };
}
async function generateMessage(contact, channel, replyTo) {
  const first = contact.name.split(" ")[0];
  const fallback = replyTo?.trim() ? {
    message: channel === "email" ? `Hi ${first},

Thanks for your message. I'll follow up on that shortly.

Best` : `Thanks ${first}! Got your message \u2014 I'll follow up shortly.`,
    insight: "Reply based on their incoming message"
  } : {
    message: `Hey ${first}, free for a quick chat today?`,
    insight: contact.preferredTimes ? `Based on typical availability: ${contact.preferredTimes}` : "Standard follow-up based on contact cadence"
  };
  if (!openai) return fallback;
  try {
    const replyNote = replyTo?.trim() ? `
They just sent you this message \u2014 write a direct reply:
"${replyTo.trim()}"` : "";
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `Write a brief, friendly ${channel} message to ${contact.name} at ${contact.company}. 
Last contact: ${contact.lastContactDaysAgo ?? "unknown"} days ago. Preferred times: ${contact.preferredTimes ?? "unknown"}.${replyNote}
Return JSON: { "message": "...", "insight": "one line why this timing" }`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    if (parsed.message) {
      return {
        message: parsed.message,
        insight: parsed.insight ?? fallback.insight
      };
    }
  } catch (err) {
    console.warn("OpenAI message fallback:", err.message);
  }
  return fallback;
}
async function detectCommitmentsWithAi(text, opts) {
  const { ruleDetectCommitments: ruleDetectCommitments2 } = await Promise.resolve().then(() => (init_commitment_parser(), commitment_parser_exports));
  const fallback = ruleDetectCommitments2(text, opts.direction, opts.messageDate).map((r) => ({
    title: r.title,
    dueAt: r.dueAt.toISOString(),
    direction: r.direction,
    confidence: "medium",
    sourceQuote: r.sourceQuote
  }));
  if (!openai) return fallback;
  try {
    const who = opts.direction === "mine" ? "You (the sender) wrote this outbound message" : `${opts.contactName ?? "The contact"} sent this inbound message to you`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: `${who}:
"${text}"

Message date: ${opts.messageDate.toISOString()}

Find commitments \u2014 promises to do something, or requests asking someone to act (e.g. "I'll get onto that tonight", "can you update this?", "send the quote by Friday").
Return JSON: { "commitments": [{ "title": "short action (max 80 chars)", "dueAt": "ISO8601 datetime", "direction": "mine"|"theirs", "confidence": "high"|"medium"|"low", "sourceQuote": "exact triggering phrase" }] }
Use direction "mine" if the writer promised to do something. Use "theirs" if they asked the reader to do something.
If none found, return { "commitments": [] }`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const items = parsed.commitments ?? [];
    if (!Array.isArray(items) || items.length === 0) return fallback;
    return items.filter((c) => c.title && c.dueAt).map((c) => ({
      title: String(c.title).slice(0, 120),
      dueAt: new Date(String(c.dueAt)).toISOString(),
      direction: c.direction === "theirs" ? "theirs" : "mine",
      confidence: ["high", "medium", "low"].includes(String(c.confidence)) ? c.confidence : "medium",
      sourceQuote: String(c.sourceQuote ?? text.slice(0, 120))
    })).filter((c) => !Number.isNaN(new Date(c.dueAt).getTime()));
  } catch (err) {
    console.warn("OpenAI commitment detection fallback:", err.message);
    return fallback;
  }
}

// apps/api/src/services/commitment.service.ts
function dueLabel(dueAt) {
  return formatScheduled(dueAt);
}
function toDto(row) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: row.id,
    contactId: row.contactId,
    contactName: row.contact?.name ?? "Unknown",
    company: row.contact?.company ?? "\u2014",
    sphere: row.contact?.sphere ?? null,
    title: row.title,
    description: row.description ?? void 0,
    dueAt: row.dueAt.toISOString(),
    dueLabel: dueLabel(row.dueAt),
    status: row.status,
    direction: row.direction,
    source: row.source,
    sourceQuote: row.sourceQuote ?? void 0,
    overdue: row.status === "open" && row.dueAt.getTime() < now.getTime(),
    createdAt: row.createdAt.toISOString()
  };
}
async function detectCommitments(text, opts) {
  const baseDate = opts.messageDate ?? /* @__PURE__ */ new Date();
  const trimmed = text.trim();
  if (trimmed.length < 8) return [];
  const aiResults = await detectCommitmentsWithAi(trimmed, {
    contactName: opts.contactName,
    direction: opts.direction,
    messageDate: baseDate
  });
  if (aiResults.length > 0) return aiResults;
  return ruleDetectCommitments(trimmed, opts.direction, baseDate).map((r) => ({
    title: r.title,
    dueAt: r.dueAt.toISOString(),
    direction: r.direction,
    confidence: "medium",
    sourceQuote: r.sourceQuote
  }));
}
async function scanAndSaveCommitments(opts) {
  const contact = opts.contactId ? await prisma.contact.findFirst({ where: { id: opts.contactId, teamId: opts.teamId } }) : null;
  const detected = await detectCommitments(opts.text, {
    contactName: contact?.name,
    direction: opts.direction,
    messageDate: opts.messageDate
  });
  if (detected.length === 0) return [];
  const saved = [];
  for (const item of detected) {
    if (opts.sourceId) {
      const existing = await prisma.commitment.findFirst({
        where: { teamId: opts.teamId, source: opts.source, sourceId: opts.sourceId }
      });
      if (existing) continue;
    }
    const dueAt = new Date(item.dueAt);
    if (Number.isNaN(dueAt.getTime())) continue;
    const status = item.confidence === "high" ? "open" : "suggested";
    const row = await prisma.commitment.create({
      data: {
        teamId: opts.teamId,
        userId: opts.userId,
        contactId: opts.contactId ?? void 0,
        title: item.title,
        dueAt,
        status,
        direction: item.direction,
        source: opts.source,
        sourceId: opts.sourceId,
        sourceQuote: item.sourceQuote
      },
      include: { contact: true }
    });
    saved.push(toDto(row));
  }
  return saved;
}
async function buildCommitmentsList(userId, teamId, section) {
  const contactIds = await contactIdsForSection(teamId, section);
  const contactFilter2 = contactIds ? { teamId, contactId: { in: contactIds } } : { teamId };
  const rows = await prisma.commitment.findMany({
    where: {
      userId,
      ...contactFilter2,
      status: { in: ["suggested", "open", "done"] }
    },
    include: { contact: true },
    orderBy: { dueAt: "asc" },
    take: 100
  });
  const dtos = rows.map(toDto);
  const now = /* @__PURE__ */ new Date();
  return {
    suggested: dtos.filter((c) => c.status === "suggested"),
    open: dtos.filter((c) => c.status === "open"),
    done: dtos.filter((c) => c.status === "done").slice(0, 20),
    overdueCount: dtos.filter(
      (c) => c.status === "open" && new Date(c.dueAt).getTime() < now.getTime()
    ).length,
    aiEnabled: Boolean(process.env.OPENAI_API_KEY)
  };
}
async function confirmCommitment(teamId, userId, id) {
  const row = await prisma.commitment.findFirst({
    where: { id, teamId, userId, status: "suggested" },
    include: { contact: true }
  });
  if (!row) throw new Error("Commitment not found");
  const updated = await prisma.commitment.update({
    where: { id: row.id },
    data: { status: "open" },
    include: { contact: true }
  });
  return toDto(updated);
}
async function completeCommitment(teamId, userId, id) {
  const row = await prisma.commitment.findFirst({
    where: { id, teamId, userId, status: { in: ["suggested", "open"] } },
    include: { contact: true }
  });
  if (!row) throw new Error("Commitment not found");
  const updated = await prisma.commitment.update({
    where: { id: row.id },
    data: { status: "done" },
    include: { contact: true }
  });
  return toDto(updated);
}
async function dismissCommitment(teamId, userId, id) {
  const row = await prisma.commitment.findFirst({
    where: { id, teamId, userId },
    include: { contact: true }
  });
  if (!row) throw new Error("Commitment not found");
  const updated = await prisma.commitment.update({
    where: { id: row.id },
    data: { status: "dismissed" },
    include: { contact: true }
  });
  return toDto(updated);
}
async function createManualCommitment(teamId, userId, input) {
  if (input.contactId) {
    const contact = await prisma.contact.findFirst({
      where: { id: input.contactId, teamId }
    });
    if (!contact) throw new Error("Contact not found");
  }
  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) throw new Error("Invalid due date");
  const row = await prisma.commitment.create({
    data: {
      teamId,
      userId,
      contactId: input.contactId,
      title: input.title.trim(),
      description: input.description?.trim(),
      dueAt,
      status: "open",
      direction: input.direction ?? "mine",
      source: "manual"
    },
    include: { contact: true }
  });
  return toDto(row);
}
async function updateCommitmentDue(teamId, userId, id, dueAt) {
  const when = new Date(dueAt);
  if (Number.isNaN(when.getTime())) throw new Error("Invalid due date");
  const row = await prisma.commitment.findFirst({
    where: { id, teamId, userId, status: { in: ["suggested", "open"] } },
    include: { contact: true }
  });
  if (!row) throw new Error("Commitment not found");
  const updated = await prisma.commitment.update({
    where: { id: row.id },
    data: { dueAt: when },
    include: { contact: true }
  });
  return toDto(updated);
}

// apps/api/src/routes/activities.ts
var router3 = Router3();
router3.use(authMiddleware);
router3.get("/", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const limit = Number(req.query.limit) || 50;
  const section = parseSectionQuery(req.query.section);
  const contactIds = await contactIdsForSection(teamId, section);
  const rows = await prisma.activity.findMany({
    where: activityFilter(userId, teamId, contactIds),
    include: { contact: true },
    orderBy: { occurredAt: "desc" },
    take: limit
  });
  res.json(
    rows.map((a) => ({
      id: a.id,
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      type: a.type,
      durationMin: a.durationMin ?? void 0,
      outcome: a.outcome ?? void 0,
      notes: a.notes ?? void 0,
      points: a.points,
      occurredAt: a.occurredAt.toISOString()
    }))
  );
});
router3.post("/", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body;
  if (!body.contactId || !body.type) {
    res.status(400).json({ error: "contactId and type required" });
    return;
  }
  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, teamId }
  });
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  const points = await pointsForActivity(teamId, body.type);
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : /* @__PURE__ */ new Date();
  const activity = await prisma.activity.create({
    data: {
      userId,
      contactId: body.contactId,
      type: body.type,
      durationMin: body.durationMin,
      outcome: body.outcome,
      notes: body.notes,
      points,
      occurredAt
    },
    include: { contact: true }
  });
  await refreshContactHealth(body.contactId);
  if (body.notes?.trim()) {
    await scanAndSaveCommitments({
      teamId,
      userId,
      contactId: body.contactId,
      text: body.notes.trim(),
      direction: "mine",
      source: "outbound",
      sourceId: activity.id,
      messageDate: occurredAt
    });
  }
  res.status(201).json({
    id: activity.id,
    contactId: activity.contactId,
    contactName: activity.contact.name,
    company: activity.contact.company,
    type: activity.type,
    durationMin: activity.durationMin ?? void 0,
    outcome: activity.outcome ?? void 0,
    notes: activity.notes ?? void 0,
    points: activity.points,
    occurredAt: activity.occurredAt.toISOString()
  });
});
var activities_default = router3;

// apps/api/src/routes/dashboard.ts
import { Router as Router4 } from "express";

// apps/api/src/services/time-budget.service.ts
var DEFAULT_DURATION_MIN = {
  call: 10,
  sms: 2,
  email: 5,
  meeting: 30,
  coffee: 45,
  site_visit: 60,
  quote: 15,
  note: 3
};
function getWeekRange(now = /* @__PURE__ */ new Date()) {
  const start = new Date(now);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);
  return { start, end: now };
}
function formatWeekLabel(start, end) {
  const fmt = (d) => d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  const weekEnd = new Date(start);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return `${fmt(start)} \u2013 ${fmt(weekEnd)}`;
}
function roundHours(h) {
  return Math.round(h * 10) / 10;
}
function buildRow(id, label, targetHours, spentHours, accent, highlight = false) {
  const remainingHours = Math.max(0, roundHours(targetHours - spentHours));
  const progressPercent = targetHours > 0 ? Math.min(100, Math.round(spentHours / targetHours * 100)) : 0;
  return {
    id,
    label,
    targetHours,
    spentHours: roundHours(spentHours),
    remainingHours,
    progressPercent,
    accent,
    highlight
  };
}
async function getOrCreateTimeBudget(userId) {
  const row = await prisma.userTimeBudget.upsert({
    where: { userId },
    create: { userId, ...DEFAULT_TIME_BUDGET },
    update: {}
  });
  return {
    businessHoursPerWeek: row.businessHoursPerWeek,
    personalHoursPerWeek: row.personalHoursPerWeek,
    familyHoursPerWeek: row.familyHoursPerWeek
  };
}
async function updateTimeBudget(userId, input) {
  const row = await prisma.userTimeBudget.upsert({
    where: { userId },
    create: {
      userId,
      businessHoursPerWeek: input.businessHoursPerWeek ?? DEFAULT_TIME_BUDGET.businessHoursPerWeek,
      personalHoursPerWeek: input.personalHoursPerWeek ?? DEFAULT_TIME_BUDGET.personalHoursPerWeek,
      familyHoursPerWeek: input.familyHoursPerWeek ?? DEFAULT_TIME_BUDGET.familyHoursPerWeek
    },
    update: {
      ...input.businessHoursPerWeek != null ? { businessHoursPerWeek: input.businessHoursPerWeek } : {},
      ...input.personalHoursPerWeek != null ? { personalHoursPerWeek: input.personalHoursPerWeek } : {},
      ...input.familyHoursPerWeek != null ? { familyHoursPerWeek: input.familyHoursPerWeek } : {}
    }
  });
  return {
    businessHoursPerWeek: row.businessHoursPerWeek,
    personalHoursPerWeek: row.personalHoursPerWeek,
    familyHoursPerWeek: row.familyHoursPerWeek
  };
}
async function getWeeklySpentBySphere(userId, teamId) {
  const { start, end } = getWeekRange();
  const activities = await prisma.activity.findMany({
    where: {
      userId,
      occurredAt: { gte: start, lte: end },
      contact: { teamId }
    },
    include: { contact: { select: { sphere: true } } }
  });
  const spent = { business: 0, personal: 0, family: 0 };
  for (const activity of activities) {
    const sphere = activity.contact.sphere;
    if (!(sphere in spent)) continue;
    const mins = activity.durationMin ?? DEFAULT_DURATION_MIN[activity.type] ?? 5;
    spent[sphere] += mins / 60;
  }
  return spent;
}
async function buildWeeklyTimeBalance(userId, teamId, section = "all") {
  const [budget, spent] = await Promise.all([
    getOrCreateTimeBudget(userId),
    getWeeklySpentBySphere(userId, teamId)
  ]);
  const { start, end } = getWeekRange();
  const sphereRows = ["business", "personal", "family"].map(
    (sphere) => buildRow(
      sphere,
      SPHERE_LABELS[sphere],
      budget[`${sphere}HoursPerWeek`],
      spent[sphere],
      SPHERE_TIME_ACCENTS[sphere],
      section === sphere
    )
  );
  const totalTarget = totalWeeklyHours(budget);
  const totalSpent = spent.business + spent.personal + spent.family;
  const totalRow = buildRow("total", "All sections", totalTarget, totalSpent, "#64748b", section === "all");
  let rows;
  switch (section) {
    case "business":
      rows = [sphereRows[0], totalRow];
      break;
    case "personal":
      rows = [sphereRows[1], totalRow];
      break;
    case "family":
      rows = [sphereRows[2], totalRow];
      break;
    default:
      rows = [...sphereRows, totalRow];
  }
  return {
    weekLabel: formatWeekLabel(start, end),
    rows,
    budget,
    totalTargetHours: totalTarget,
    totalSpentHours: roundHours(totalSpent),
    totalRemainingHours: roundHours(Math.max(0, totalTarget - totalSpent))
  };
}
function remainingHoursForSection(balance, section) {
  if (section === "all") return balance.totalRemainingHours;
  const row = balance.rows.find((r) => r.id === section);
  return row?.remainingHours ?? balance.totalRemainingHours;
}

// apps/api/src/services/dashboard.service.ts
async function buildDashboard(userId, teamId, userName, userRole, section = "business") {
  const weeklyTimeAll = await buildWeeklyTimeBalance(userId, teamId, "all");
  const weeklyInsights = buildWeeklyTimeInsights(weeklyTimeAll);
  const smartPlanFocus = smartPlanFocusFromInsights(weeklyInsights);
  const planSection = section === "all" && smartPlanFocus ? smartPlanFocus.sphere : section;
  const contacts = await prisma.contact.findMany({
    where: { teamId, ...sphereFilter(planSection) },
    include: { opportunities: { orderBy: { value: "desc" }, take: 3 } },
    orderBy: { healthScore: "asc" },
    take: 10
  });
  const contactContexts = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    preferredMethod: c.preferredMethod,
    preferredTimes: c.preferredTimes,
    healthStatus: c.healthStatus,
    lastContactDaysAgo: daysSince(c.lastContactAt),
    tags: c.tags,
    sphere: c.sphere
  }));
  const aiPlan = await generateSmartPlan(contactContexts, smartPlanFocus?.sphere ?? null);
  const contactMap = new Map(contacts.map((c) => [c.id, c]));
  const smartPlan = aiPlan.map((item, i) => {
    const c = contactMap.get(item.contactId);
    if (!c) return null;
    return {
      id: `sp-${i}`,
      contactId: c.id,
      contactName: c.name,
      company: c.company,
      priority: item.priority,
      insight: item.insight,
      scheduledTime: item.scheduledTime,
      suggestedAction: item.suggestedAction,
      actionLabel: actionLabel(item.suggestedAction)
    };
  }).filter(Boolean);
  const kpisRaw = await getTodayKpis(userId, teamId, section);
  const monthly = await getMonthlyPoints(userId, teamId, section);
  const fmtDelta = (n) => `${n >= 0 ? "+" : ""}${n} vs yesterday`;
  const pendingAuto = await prisma.automation.findFirst({
    where: { status: "pending", contact: { teamId, ...sphereFilter(section) } },
    include: { contact: true },
    orderBy: { scheduledAt: "asc" }
  });
  const total = contacts.length || 1;
  const healthy = contacts.filter((c) => c.healthStatus === "healthy").length;
  const cooling = contacts.filter((c) => c.healthStatus === "cooling").length;
  const atRisk = contacts.filter((c) => c.healthStatus === "at_risk").length;
  const allOpps = contacts.flatMap(
    (c) => c.opportunities.map((o) => ({
      id: o.id,
      company: c.company,
      value: o.value,
      stage: o.stage
    }))
  );
  allOpps.sort((a, b) => b.value - a.value);
  const contactIds = await contactIdsForSection(teamId, section);
  const inboundUnreadWhere = contactIds ? { teamId, contactId: { in: contactIds }, status: "unread" } : { teamId, status: "unread" };
  const [pendingCount, unreadInboundCount] = await Promise.all([
    prisma.automation.count({
      where: { status: "pending", contact: { teamId, ...sphereFilter(section) } }
    }),
    prisma.inboxMessage.count({ where: inboundUnreadWhere })
  ]);
  const overdueCount = contacts.filter(
    (c) => (daysSince(c.lastContactAt) ?? 999) >= 21
  ).length;
  const meta = sectionMeta(section);
  const weeklyTime = await buildWeeklyTimeBalance(userId, teamId, section);
  const remainingHours = remainingHoursForSection(weeklyTime, section);
  const remainingMinutes = Math.round(remainingHours * 60);
  return {
    greeting: greetingForHour((/* @__PURE__ */ new Date()).getHours()),
    userName,
    userRole,
    dateLabel: "Today",
    ...meta,
    kpis: [
      {
        id: "calls",
        label: "Calls Made",
        value: kpisRaw.calls,
        delta: fmtDelta(kpisRaw.callsDelta),
        icon: "phone",
        accent: "#22c55e"
      },
      {
        id: "emails",
        label: "Emails Sent",
        value: kpisRaw.emails,
        delta: fmtDelta(kpisRaw.emailsDelta),
        icon: "mail",
        accent: "#3b82f6"
      },
      {
        id: "meetings",
        label: "Meetings",
        value: kpisRaw.meetings,
        delta: fmtDelta(kpisRaw.meetingsDelta),
        icon: "meeting",
        accent: "#8b5cf6"
      },
      {
        id: "texts",
        label: "Texts Sent",
        value: kpisRaw.texts,
        delta: fmtDelta(kpisRaw.textsDelta),
        icon: "message",
        accent: "#f97316"
      },
      {
        id: "points",
        label: "Points Today",
        value: kpisRaw.points,
        delta: `${kpisRaw.progress}% of daily target`,
        icon: "points",
        accent: "#eab308",
        progress: kpisRaw.progress
      }
    ],
    smartPlan,
    estimatedMinutes: Math.min(
      Math.max(smartPlan.length * 4, 10),
      Math.max(remainingMinutes, 10)
    ),
    automation: pendingAuto ? {
      id: pendingAuto.id,
      contactId: pendingAuto.contactId,
      contactName: pendingAuto.contact.name,
      company: pendingAuto.contact.company,
      scheduledFor: formatScheduled(pendingAuto.scheduledAt),
      message: pendingAuto.message,
      statusLabel: `Message will be sent ${formatScheduled(pendingAuto.scheduledAt)}`,
      channel: pendingAuto.channel,
      insight: pendingAuto.insight ?? void 0
    } : null,
    relationshipHealth: {
      healthy: Math.round(healthy / total * 100),
      cooling: Math.round(cooling / total * 100),
      atRisk: Math.round(atRisk / total * 100)
    },
    opportunities: allOpps.slice(0, 3),
    monthlyPoints: monthly,
    notifications: { messages: pendingCount + unreadInboundCount, alerts: overdueCount },
    weeklyTime,
    weeklyInsights,
    smartPlanFocus,
    aiEnabled: Boolean(process.env.OPENAI_API_KEY)
  };
}

// apps/api/src/routes/dashboard.ts
var router4 = Router4();
router4.use(authMiddleware);
router4.get("/", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const data = await buildDashboard(userId, teamId, user.name, user.role, section);
  res.json(data);
});
var dashboard_default = router4;

// apps/api/src/routes/automations.ts
import { Router as Router5 } from "express";
var router5 = Router5();
router5.use(authMiddleware);
router5.get("/upcoming", async (req, res) => {
  const { teamId } = getAuth(req);
  const rows = await prisma.automation.findMany({
    where: { status: { in: ["pending", "scheduled"] }, contact: { teamId } },
    include: { contact: true },
    orderBy: { scheduledAt: "asc" },
    take: 20
  });
  res.json(
    rows.map((a) => ({
      id: a.id,
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      scheduledFor: formatScheduled(a.scheduledAt),
      message: a.message,
      status: a.status,
      channel: a.channel
    }))
  );
});
router5.post("/:id/approve", async (req, res) => {
  const { teamId } = getAuth(req);
  const auto = await prisma.automation.findFirst({
    where: { id: req.params.id, contact: { teamId } }
  });
  if (!auto) {
    res.status(404).json({ error: "Automation not found" });
    return;
  }
  const updated = await prisma.automation.update({
    where: { id: auto.id },
    data: { status: "scheduled" }
  });
  res.json({ ok: true, id: updated.id, status: updated.status });
});
router5.post("/generate", async (req, res) => {
  const { teamId } = getAuth(req);
  const { contactId, channel } = req.body;
  if (!contactId) {
    res.status(400).json({ error: "contactId required" });
    return;
  }
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, teamId }
  });
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  const ch = channel ?? contact.preferredMethod;
  const draft = await generateMessage(
    {
      id: contact.id,
      name: contact.name,
      company: contact.company,
      preferredMethod: contact.preferredMethod,
      preferredTimes: contact.preferredTimes,
      healthStatus: contact.healthStatus,
      lastContactDaysAgo: daysSince(contact.lastContactAt),
      tags: contact.tags
    },
    ch
  );
  const scheduledAt = /* @__PURE__ */ new Date();
  scheduledAt.setMinutes(scheduledAt.getMinutes() + 30);
  const automation = await prisma.automation.create({
    data: {
      contactId: contact.id,
      channel: ch,
      message: draft.message,
      insight: draft.insight,
      scheduledAt,
      status: "pending"
    },
    include: { contact: true }
  });
  res.status(201).json({
    id: automation.id,
    contactName: automation.contact.name,
    company: automation.contact.company,
    message: automation.message,
    insight: automation.insight,
    scheduledFor: formatScheduled(automation.scheduledAt),
    channel: automation.channel
  });
});
var automations_default = router5;

// apps/api/src/routes/messages.ts
import { Router as Router6 } from "express";

// apps/api/src/services/inbound-message.service.ts
function phoneDigits2(phone) {
  return phone.replace(/\D/g, "");
}
async function findContactByPhone(teamId, from) {
  const incoming = phoneDigits2(from);
  if (incoming.length < 8) return null;
  const tail = incoming.slice(-9);
  const contacts = await prisma.contact.findMany({ where: { teamId } });
  return contacts.find((c) => {
    const phones = [c.phone, c.whatsappPhone].filter(Boolean);
    return phones.some((p) => {
      const d = phoneDigits2(p);
      return d.endsWith(tail) || tail.endsWith(d.slice(-9));
    });
  }) ?? null;
}
async function findContactByEmail(teamId, email) {
  const normalized = email.trim().toLowerCase();
  return prisma.contact.findFirst({
    where: { teamId, email: { equals: normalized, mode: "insensitive" } }
  });
}
async function recordInboundMessage(opts) {
  if (opts.externalId) {
    const existing = await prisma.inboxMessage.findUnique({
      where: { externalId: opts.externalId }
    });
    if (existing) return existing;
  }
  const row = await prisma.inboxMessage.create({
    data: {
      teamId: opts.teamId,
      userId: opts.userId,
      contactId: opts.contactId ?? void 0,
      platform: opts.platform,
      body: opts.body.trim(),
      fromLabel: opts.fromLabel,
      externalId: opts.externalId,
      receivedAt: opts.receivedAt ?? /* @__PURE__ */ new Date(),
      status: "unread"
    },
    include: { contact: true }
  });
  if (opts.contactId) {
    await prisma.contact.update({
      where: { id: opts.contactId },
      data: { lastContactAt: /* @__PURE__ */ new Date() }
    });
    await refreshContactHealth(opts.contactId);
  }
  return row;
}
function toInboundDto(row) {
  return {
    id: row.id,
    contactId: row.contactId,
    contactName: row.contact?.name ?? row.fromLabel ?? "Unknown",
    company: row.contact?.company ?? "\u2014",
    sphere: row.contact?.sphere ?? null,
    platform: row.platform,
    body: row.body,
    fromLabel: row.fromLabel ?? void 0,
    status: row.status,
    receivedAt: formatScheduled(row.receivedAt)
  };
}

// apps/api/src/services/capture.service.ts
import { randomUUID } from "crypto";
var PLATFORMS = /* @__PURE__ */ new Set([
  "sms",
  "whatsapp",
  "email",
  "instagram",
  "facebook",
  "linkedin"
]);
function publicApiBase(req) {
  const env = process.env.PUBLIC_API_URL?.replace(/\/$/, "");
  if (env) return env;
  const host = req.get("host");
  const proto = req.get("x-forwarded-proto") || req.protocol;
  return `${proto}://${host}`;
}
async function getTeamByCaptureToken(token) {
  return prisma.team.findUnique({ where: { captureToken: token } });
}
async function ensureCaptureToken(teamId) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { captureToken: true }
  });
  if (!team) throw new Error("Team not found");
  if (team.captureToken) return team.captureToken;
  const updated = await prisma.team.update({
    where: { id: teamId },
    data: { captureToken: randomUUID() },
    select: { captureToken: true }
  });
  return updated.captureToken;
}
async function buildCaptureSetup(teamId, baseUrl) {
  const token = await ensureCaptureToken(teamId);
  const root = `${baseUrl}/api/webhooks/capture/${token}`;
  return {
    webhookUrl: root,
    emailWebhookUrl: `${root}/email`,
    smsWebhookUrl: `${root}/sms`
  };
}
function normalizePlatform(raw, hasEmail) {
  const p = raw?.trim().toLowerCase();
  if (p && PLATFORMS.has(p)) return p;
  if (hasEmail) return "email";
  return "sms";
}
function extractEmailAddress(raw) {
  const match = raw.match(/<([^>]+)>/) ?? raw.match(/([\w.+-]+@[\w.-]+\.\w+)/);
  return (match?.[1] ?? raw).trim().toLowerCase();
}
async function resolveContactForInbound(teamId, opts) {
  if (opts.contactId) {
    const byId = await prisma.contact.findFirst({
      where: { id: opts.contactId, teamId }
    });
    if (byId) return byId;
  }
  if (opts.email) {
    const byEmail = await findContactByEmail(teamId, extractEmailAddress(opts.email));
    if (byEmail) return byEmail;
  }
  if (opts.phone) {
    const byPhone = await findContactByPhone(teamId, opts.phone);
    if (byPhone) return byPhone;
  }
  return null;
}
async function processCapturePayload(teamId, raw) {
  const subject = raw.subject?.trim();
  const body = (raw.body ?? raw.text ?? raw.message ?? "").trim();
  const fullBody = subject && body ? `${subject}

${body}` : body || subject || "";
  if (!fullBody) {
    throw new Error("Message body required");
  }
  const emailHint = raw.email ?? (raw.from?.includes("@") ? raw.from : void 0);
  const phoneHint = raw.phone ?? (raw.from && !raw.from.includes("@") ? raw.from : void 0);
  const platform = normalizePlatform(raw.platform, Boolean(emailHint));
  const contact = await resolveContactForInbound(teamId, {
    contactId: raw.contactId,
    phone: phoneHint,
    email: emailHint
  });
  const fromLabel = raw.from?.trim() || raw.phone?.trim() || (emailHint ? extractEmailAddress(emailHint) : void 0);
  return recordInboundMessage({
    teamId,
    contactId: contact?.id ?? null,
    platform,
    body: fullBody,
    fromLabel,
    externalId: raw.externalId
  });
}
function parseEmailWebhook(body) {
  const sender = String(body.sender ?? body.from ?? body.envelope ?? "").trim() || String(body.headers ?? "").match(/From: (.+)/i)?.[1]?.trim();
  const text = String(body["body-plain"] ?? body["stripped-text"] ?? body.text ?? body.body ?? "").trim() || String(body.html ?? "").replace(/<[^>]+>/g, " ").trim();
  const subject = String(body.subject ?? "").trim();
  const messageId = String(body["Message-Id"] ?? body.message_id ?? body.messageId ?? "").trim() || void 0;
  return {
    from: sender,
    email: sender,
    subject,
    body: text,
    platform: "email",
    externalId: messageId
  };
}
async function processSmsWebhook(teamId, from, body, externalId) {
  return processCapturePayload(teamId, {
    from,
    phone: from,
    body,
    platform: "sms",
    externalId
  });
}

// apps/api/src/routes/messages.ts
var router6 = Router6();
router6.use(authMiddleware);
function contactFilter(teamId, contactIds) {
  return contactIds ? { teamId, id: { in: contactIds } } : { teamId };
}
router6.get("/", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section);
  const contactIds = await contactIdsForSection(teamId, section);
  const filter = contactFilter(teamId, contactIds);
  const inboundWhere = contactIds ? { teamId, contactId: { in: contactIds } } : { teamId };
  const [inboundRows, upcomingRows, sentRows] = await Promise.all([
    prisma.inboxMessage.findMany({
      where: inboundWhere,
      include: { contact: true },
      orderBy: { receivedAt: "desc" },
      take: 50
    }),
    prisma.automation.findMany({
      where: {
        status: { in: ["pending", "scheduled"] },
        contact: filter
      },
      include: { contact: true },
      orderBy: { scheduledAt: "asc" },
      take: 30
    }),
    prisma.activity.findMany({
      where: {
        userId,
        type: { in: ["sms", "email", "note"] },
        contact: filter
      },
      include: { contact: true },
      orderBy: { occurredAt: "desc" },
      take: 30
    })
  ]);
  const inbound = inboundRows.map(toInboundDto);
  const unreadCount = inbound.filter((m) => m.status === "unread").length;
  let capture = { webhookUrl: "", emailWebhookUrl: "", smsWebhookUrl: "" };
  try {
    capture = await buildCaptureSetup(teamId, publicApiBase(req));
  } catch {
  }
  const data = {
    inbound,
    unreadCount,
    upcoming: upcomingRows.map((a) => ({
      id: a.id,
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      sphere: a.contact.sphere,
      scheduledFor: formatScheduled(a.scheduledAt),
      message: a.message,
      status: a.status,
      channel: a.channel,
      insight: a.insight ?? void 0
    })),
    sent: sentRows.map((a) => ({
      id: a.id,
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      sphere: a.contact.sphere,
      channel: a.type === "email" ? "email" : a.type === "sms" ? "sms" : "sms",
      message: a.notes?.trim() || `${a.type === "sms" ? "Text" : a.type === "email" ? "Email" : "Message"} with ${a.contact.name}`,
      sentAt: formatScheduled(a.occurredAt)
    })),
    aiEnabled: Boolean(process.env.OPENAI_API_KEY),
    captureEnabled: true,
    capture
  };
  res.json(data);
});
router6.post("/capture/test", async (req, res) => {
  const { teamId } = getAuth(req);
  const row = await recordInboundMessage({
    teamId,
    platform: "sms",
    body: "Test auto-capture \u2014 you can delete this after confirming it works.",
    fromLabel: "Cadence test",
    externalId: `test-${Date.now()}`
  });
  res.status(201).json(toInboundDto(row));
});
router6.post("/inbound", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body;
  if (!body.contactId || !body.body?.trim() || !body.platform) {
    res.status(400).json({ error: "contactId, platform, and body required" });
    return;
  }
  const contact = await prisma.contact.findFirst({
    where: { id: body.contactId, teamId }
  });
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  const row = await recordInboundMessage({
    teamId,
    userId,
    contactId: contact.id,
    platform: body.platform,
    body: body.body.trim(),
    receivedAt: body.receivedAt ? new Date(body.receivedAt) : void 0
  });
  const commitments = await scanAndSaveCommitments({
    teamId,
    userId,
    contactId: contact.id,
    text: body.body.trim(),
    direction: "theirs",
    source: "inbox",
    sourceId: row.id,
    messageDate: row.receivedAt
  });
  res.status(201).json({ ...toInboundDto({ ...row, contact }), commitments });
});
router6.patch("/inbox/:id/read", async (req, res) => {
  const { teamId } = getAuth(req);
  const row = await prisma.inboxMessage.findFirst({
    where: { id: req.params.id, teamId }
  });
  if (!row) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  const updated = await prisma.inboxMessage.update({
    where: { id: row.id },
    data: { status: "read" },
    include: { contact: true }
  });
  res.json(toInboundDto(updated));
});
router6.post("/generate", async (req, res) => {
  const { teamId } = getAuth(req);
  const { contactId, channel, replyTo } = req.body;
  if (!contactId) {
    res.status(400).json({ error: "contactId required" });
    return;
  }
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, teamId }
  });
  if (!contact) {
    res.status(404).json({ error: "Contact not found" });
    return;
  }
  const ch = channel ?? contact.preferredMethod;
  if (ch !== "sms" && ch !== "email") {
    res.status(400).json({ error: "Messages support SMS or email only" });
    return;
  }
  const draft = await generateMessage(
    {
      id: contact.id,
      name: contact.name,
      company: contact.company,
      preferredMethod: contact.preferredMethod,
      preferredTimes: contact.preferredTimes,
      healthStatus: contact.healthStatus,
      lastContactDaysAgo: daysSince(contact.lastContactAt),
      tags: contact.tags,
      sphere: contact.sphere
    },
    ch,
    typeof replyTo === "string" ? replyTo : void 0
  );
  const scheduledAt = /* @__PURE__ */ new Date();
  scheduledAt.setMinutes(scheduledAt.getMinutes() + 30);
  const automation = await prisma.automation.create({
    data: {
      contactId: contact.id,
      channel: ch,
      message: draft.message,
      insight: draft.insight,
      scheduledAt,
      status: "pending"
    },
    include: { contact: true }
  });
  res.status(201).json({
    id: automation.id,
    contactId: automation.contactId,
    contactName: automation.contact.name,
    company: automation.contact.company,
    sphere: automation.contact.sphere,
    scheduledFor: formatScheduled(automation.scheduledAt),
    message: automation.message,
    status: automation.status,
    channel: automation.channel,
    insight: automation.insight ?? void 0
  });
});
router6.post("/:id/approve", async (req, res) => {
  const { teamId } = getAuth(req);
  const auto = await prisma.automation.findFirst({
    where: { id: req.params.id, contact: { teamId } }
  });
  if (!auto) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  const updated = await prisma.automation.update({
    where: { id: auto.id },
    data: { status: "scheduled" }
  });
  res.json({ ok: true, id: updated.id, status: updated.status });
});
router6.patch("/:id", async (req, res) => {
  const { teamId } = getAuth(req);
  const { message } = req.body;
  if (!message?.trim()) {
    res.status(400).json({ error: "Message text required" });
    return;
  }
  const auto = await prisma.automation.findFirst({
    where: {
      id: req.params.id,
      contact: { teamId },
      status: { in: ["pending", "scheduled"] }
    }
  });
  if (!auto) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  const updated = await prisma.automation.update({
    where: { id: auto.id },
    data: { message: message.trim() }
  });
  res.json({
    id: updated.id,
    message: updated.message,
    status: updated.status
  });
});
router6.delete("/:id", async (req, res) => {
  const { teamId } = getAuth(req);
  const auto = await prisma.automation.findFirst({
    where: { id: req.params.id, contact: { teamId } }
  });
  if (!auto) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  await prisma.automation.update({
    where: { id: auto.id },
    data: { status: "cancelled" }
  });
  res.json({ ok: true });
});
var messages_default = router6;

// apps/api/src/routes/time-budget.ts
import { Router as Router7 } from "express";
var router7 = Router7();
router7.use(authMiddleware);
router7.get("/", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const [settings, balance] = await Promise.all([
    getOrCreateTimeBudget(userId),
    buildWeeklyTimeBalance(userId, teamId, "all")
  ]);
  res.json({ settings, balance });
});
router7.patch("/", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const { businessHoursPerWeek, personalHoursPerWeek, familyHoursPerWeek } = req.body ?? {};
  const parseHours = (v) => {
    if (v == null) return void 0;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 168) return null;
    return n;
  };
  const business = parseHours(businessHoursPerWeek);
  const personal = parseHours(personalHoursPerWeek);
  const family = parseHours(familyHoursPerWeek);
  if (business === null || personal === null || family === null) {
    res.status(400).json({ error: "Hours must be between 0 and 168" });
    return;
  }
  const settings = await updateTimeBudget(userId, {
    businessHoursPerWeek: business,
    personalHoursPerWeek: personal,
    familyHoursPerWeek: family
  });
  const balance = await buildWeeklyTimeBalance(userId, teamId, "all");
  res.json({ settings, balance });
});
var time_budget_default = router7;

// apps/api/src/routes/calendar.ts
import { Router as Router8 } from "express";

// apps/api/src/lib/calendar-helpers.ts
function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function endOfWeek(weekStart) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function parseWeekQuery(value) {
  if (!value) return startOfWeek(/* @__PURE__ */ new Date());
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return startOfWeek(/* @__PURE__ */ new Date());
  return startOfWeek(parsed);
}
function parseDisplayTime(timeStr, baseDate) {
  const d = new Date(baseDate);
  d.setSeconds(0, 0);
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) {
    d.setHours(9, 0, 0, 0);
    return d;
  }
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = match[3]?.toLowerCase();
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (!meridiem && hours <= 7) hours += 12;
  d.setHours(hours, minutes, 0, 0);
  return d;
}
function defaultDurationForType(type) {
  switch (type) {
    case "meeting":
    case "coffee":
      return 60;
    case "site_visit":
      return 90;
    case "call":
    case "message":
    case "sms":
    case "email":
      return 15;
    default:
      return 30;
  }
}
function eventTitleForType(type, contactName) {
  const first = contactName.split(" ")[0];
  switch (type) {
    case "meeting":
      return `Meeting with ${first}`;
    case "coffee":
      return `Coffee with ${first}`;
    case "call":
      return `Call ${first}`;
    case "site_visit":
      return `Site visit \u2014 ${first}`;
    case "message":
    case "sms":
      return `Send message to ${first}`;
    case "email":
      return `Email ${first}`;
    default:
      return `Follow up with ${first}`;
  }
}

// apps/api/src/services/calendar.service.ts
function withEnd(start, durationMin) {
  return new Date(start.getTime() + durationMin * 6e4);
}
function toEvent(partial) {
  const durationMin = partial.durationMin ?? defaultDurationForType(partial.eventType);
  const startsAt = partial.startsAt;
  return {
    ...partial,
    durationMin,
    endsAt: withEnd(new Date(startsAt), durationMin).toISOString()
  };
}
async function buildSmartPlanEvents(userId, teamId, section, weekStart, weekEnd) {
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  if (today < weekStart || today > weekEnd) return [];
  const weeklyTimeAll = await buildWeeklyTimeBalance(userId, teamId, "all");
  const smartPlanFocus = smartPlanFocusFromInsights(buildWeeklyTimeInsights(weeklyTimeAll));
  const planSection = section === "all" && smartPlanFocus ? smartPlanFocus.sphere : section;
  const contacts = await prisma.contact.findMany({
    where: { teamId, ...sphereFilter(planSection) },
    orderBy: { healthScore: "asc" },
    take: 10
  });
  const contactContexts = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    company: c.company,
    preferredMethod: c.preferredMethod,
    preferredTimes: c.preferredTimes,
    healthStatus: c.healthStatus,
    lastContactDaysAgo: daysSince(c.lastContactAt),
    tags: c.tags,
    sphere: c.sphere
  }));
  const aiPlan = await generateSmartPlan(contactContexts, smartPlanFocus?.sphere ?? null);
  const contactMap = new Map(contacts.map((c) => [c.id, c]));
  return aiPlan.map((item, i) => {
    const c = contactMap.get(item.contactId);
    if (!c) return null;
    const starts = parseDisplayTime(item.scheduledTime, today);
    return toEvent({
      id: `task-${i}-${c.id}`,
      kind: "task",
      title: `${actionLabel(item.suggestedAction)} \u2014 ${c.name}`,
      subtitle: c.company,
      contactId: c.id,
      contactName: c.name,
      company: c.company,
      sphere: c.sphere,
      eventType: item.suggestedAction,
      startsAt: starts.toISOString(),
      durationMin: defaultDurationForType(item.suggestedAction),
      status: item.priority,
      insight: item.insight,
      editable: false,
      link: "/smart-tasks"
    });
  }).filter(Boolean);
}
async function buildCalendar(userId, teamId, section, weekStartInput) {
  const weekStart = startOfWeek(weekStartInput);
  const weekEnd = endOfWeek(weekStart);
  const contactIds = await contactIdsForSection(teamId, section);
  const contactFilter2 = contactIds ? { teamId, id: { in: contactIds } } : { teamId };
  const [automations, activities, smartTasks, commitments] = await Promise.all([
    prisma.automation.findMany({
      where: {
        status: { in: ["pending", "scheduled"] },
        scheduledAt: { gte: weekStart, lte: weekEnd },
        contact: contactFilter2
      },
      include: { contact: true },
      orderBy: { scheduledAt: "asc" }
    }),
    prisma.activity.findMany({
      where: {
        ...activityFilter(userId, teamId, contactIds),
        occurredAt: { gte: weekStart, lte: weekEnd }
      },
      include: { contact: true },
      orderBy: { occurredAt: "asc" }
    }),
    buildSmartPlanEvents(userId, teamId, section, weekStart, weekEnd),
    prisma.commitment.findMany({
      where: {
        userId,
        status: { in: ["suggested", "open"] },
        dueAt: { gte: weekStart, lte: weekEnd },
        ...contactIds ? { contactId: { in: contactIds } } : { teamId }
      },
      include: { contact: true },
      orderBy: { dueAt: "asc" }
    })
  ]);
  const messageEvents = automations.map(
    (a) => toEvent({
      id: a.id,
      kind: "message",
      title: eventTitleForType(a.channel, a.contact.name),
      subtitle: a.message.slice(0, 80) + (a.message.length > 80 ? "\u2026" : ""),
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      sphere: a.contact.sphere,
      eventType: "message",
      startsAt: a.scheduledAt.toISOString(),
      durationMin: 15,
      status: a.status,
      insight: a.insight ?? void 0,
      editable: true,
      link: "/messages"
    })
  );
  const activityEvents = activities.map(
    (a) => toEvent({
      id: a.id,
      kind: "activity",
      title: eventTitleForType(a.type, a.contact.name),
      subtitle: a.notes ?? void 0,
      contactId: a.contactId,
      contactName: a.contact.name,
      company: a.contact.company,
      sphere: a.contact.sphere,
      eventType: a.type,
      startsAt: a.occurredAt.toISOString(),
      durationMin: a.durationMin ?? defaultDurationForType(a.type),
      editable: true,
      link: "/activities"
    })
  );
  const commitmentEvents = commitments.map(
    (c) => toEvent({
      id: c.id,
      kind: "commitment",
      title: c.title,
      subtitle: c.sourceQuote ?? void 0,
      contactId: c.contactId ?? void 0,
      contactName: c.contact?.name,
      company: c.contact?.company,
      sphere: c.contact?.sphere ?? null,
      eventType: c.direction === "mine" ? "promise" : "request",
      startsAt: c.dueAt.toISOString(),
      durationMin: 30,
      status: c.status,
      insight: c.direction === "mine" ? "You promised this" : "They asked for this",
      editable: true,
      link: "/commitments"
    })
  );
  const events = [...messageEvents, ...activityEvents, ...smartTasks, ...commitmentEvents].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  );
  const summary = {
    meetings: events.filter((e) => ["meeting", "coffee", "site_visit"].includes(e.eventType)).length,
    messages: events.filter((e) => e.kind === "message").length,
    tasks: events.filter((e) => e.kind === "task").length,
    commitments: events.filter((e) => e.kind === "commitment").length,
    total: events.length
  };
  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    events,
    summary
  };
}
async function scheduleCalendarEvent(userId, teamId, input) {
  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, teamId }
  });
  if (!contact) throw new Error("Contact not found");
  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) throw new Error("Invalid date");
  if (input.eventType === "message") {
    const scheduledAt = startsAt;
    const automation = await prisma.automation.create({
      data: {
        contactId: contact.id,
        channel: contact.preferredMethod === "email" ? "email" : "sms",
        message: input.notes?.trim() || `Follow up with ${contact.name.split(" ")[0]}`,
        insight: "Scheduled from calendar",
        scheduledAt,
        status: "scheduled"
      },
      include: { contact: true }
    });
    return toEvent({
      id: automation.id,
      kind: "message",
      title: eventTitleForType("message", contact.name),
      contactId: contact.id,
      contactName: contact.name,
      company: contact.company,
      sphere: contact.sphere,
      eventType: "message",
      startsAt: automation.scheduledAt.toISOString(),
      durationMin: input.durationMin ?? 15,
      status: automation.status,
      editable: true,
      link: "/messages"
    });
  }
  const type = input.eventType === "call" ? "call" : input.eventType;
  const points = await pointsForActivity(teamId, type);
  const activity = await prisma.activity.create({
    data: {
      userId,
      contactId: contact.id,
      type,
      durationMin: input.durationMin ?? defaultDurationForType(type),
      notes: input.notes,
      points,
      occurredAt: startsAt
    },
    include: { contact: true }
  });
  return toEvent({
    id: activity.id,
    kind: "activity",
    title: eventTitleForType(type, contact.name),
    subtitle: activity.notes ?? void 0,
    contactId: contact.id,
    contactName: contact.name,
    company: contact.company,
    sphere: contact.sphere,
    eventType: type,
    startsAt: activity.occurredAt.toISOString(),
    durationMin: activity.durationMin ?? defaultDurationForType(type),
    editable: true,
    link: "/activities"
  });
}
async function rescheduleCalendarEvent(teamId, userId, kind, id, startsAt, durationMin) {
  const when = new Date(startsAt);
  if (Number.isNaN(when.getTime())) throw new Error("Invalid date");
  if (kind === "commitment") {
    const c = await updateCommitmentDue(teamId, userId, id, startsAt);
    return toEvent({
      id: c.id,
      kind: "commitment",
      title: c.title,
      subtitle: c.sourceQuote,
      contactId: c.contactId ?? void 0,
      contactName: c.contactName,
      company: c.company,
      sphere: c.sphere,
      eventType: c.direction === "mine" ? "promise" : "request",
      startsAt: c.dueAt,
      durationMin: 30,
      status: c.status,
      editable: true,
      link: "/commitments"
    });
  }
  if (kind === "message") {
    const auto = await prisma.automation.findFirst({
      where: { id, contact: { teamId } },
      include: { contact: true }
    });
    if (!auto) throw new Error("Event not found");
    const updated2 = await prisma.automation.update({
      where: { id: auto.id },
      data: { scheduledAt: when },
      include: { contact: true }
    });
    return toEvent({
      id: updated2.id,
      kind: "message",
      title: eventTitleForType("message", updated2.contact.name),
      contactId: updated2.contactId,
      contactName: updated2.contact.name,
      company: updated2.contact.company,
      sphere: updated2.contact.sphere,
      eventType: "message",
      startsAt: updated2.scheduledAt.toISOString(),
      durationMin: durationMin ?? 15,
      status: updated2.status,
      editable: true,
      link: "/messages"
    });
  }
  const activity = await prisma.activity.findFirst({
    where: { id, userId, contact: { teamId } },
    include: { contact: true }
  });
  if (!activity) throw new Error("Event not found");
  const updated = await prisma.activity.update({
    where: { id: activity.id },
    data: {
      occurredAt: when,
      durationMin: durationMin ?? activity.durationMin
    },
    include: { contact: true }
  });
  return toEvent({
    id: updated.id,
    kind: "activity",
    title: eventTitleForType(updated.type, updated.contact.name),
    contactId: updated.contactId,
    contactName: updated.contact.name,
    company: updated.contact.company,
    sphere: updated.contact.sphere,
    eventType: updated.type,
    startsAt: updated.occurredAt.toISOString(),
    durationMin: updated.durationMin ?? defaultDurationForType(updated.type),
    editable: true,
    link: "/activities"
  });
}
async function planWeekFromSmartTasks(userId, teamId, section) {
  const weekStart = startOfWeek(/* @__PURE__ */ new Date());
  const data = await buildCalendar(userId, teamId, section, weekStart);
  const tasks = data.events.filter((e) => e.kind === "task").slice(0, 5);
  if (tasks.length === 0) return [];
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  let dayOffset = 0;
  const created = [];
  for (const task of tasks) {
    let slotDay = addDays(today, dayOffset);
    while (slotDay.getDay() === 0 || slotDay.getDay() === 6) {
      dayOffset += 1;
      slotDay = addDays(today, dayOffset);
    }
    const starts = parseDisplayTime(
      new Date(task.startsAt).toLocaleTimeString("en-AU", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      }),
      slotDay
    );
    const event = await scheduleCalendarEvent(userId, teamId, {
      contactId: task.contactId,
      eventType: task.eventType === "message" || task.eventType === "email" ? "call" : task.eventType,
      startsAt: starts.toISOString(),
      durationMin: task.durationMin,
      notes: task.insight
    });
    created.push(event);
    dayOffset += 1;
  }
  return created;
}

// apps/api/src/routes/calendar.ts
var router8 = Router8();
router8.use(authMiddleware);
router8.get("/", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section);
  const week = parseWeekQuery(req.query.week);
  const data = await buildCalendar(userId, teamId, section, week);
  res.json(data);
});
router8.post("/schedule", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body;
  if (!body.contactId || !body.eventType || !body.startsAt) {
    res.status(400).json({ error: "contactId, eventType, and startsAt required" });
    return;
  }
  try {
    const event = await scheduleCalendarEvent(userId, teamId, body);
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router8.patch("/reschedule", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body;
  if (!body.kind || !body.id || !body.startsAt) {
    res.status(400).json({ error: "kind, id, and startsAt required" });
    return;
  }
  if (!["message", "activity", "commitment"].includes(body.kind)) {
    res.status(400).json({ error: "Invalid kind" });
    return;
  }
  try {
    const event = await rescheduleCalendarEvent(
      teamId,
      userId,
      body.kind,
      body.id,
      body.startsAt,
      body.durationMin
    );
    res.json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router8.post("/plan-week", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section);
  try {
    const events = await planWeekFromSmartTasks(userId, teamId, section);
    res.status(201).json({ created: events.length, events });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var calendar_default = router8;

// apps/api/src/routes/commitments.ts
import { Router as Router9 } from "express";
var router9 = Router9();
router9.use(authMiddleware);
router9.get("/", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const section = parseSectionQuery(req.query.section);
  const data = await buildCommitmentsList(userId, teamId, section);
  res.json(data);
});
router9.post("/", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body;
  if (!body.title?.trim() || !body.dueAt) {
    res.status(400).json({ error: "title and dueAt required" });
    return;
  }
  try {
    const row = await createManualCommitment(teamId, userId, body);
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router9.post("/scan", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const body = req.body;
  if (!body.text?.trim()) {
    res.status(400).json({ error: "text required" });
    return;
  }
  try {
    const saved = await scanAndSaveCommitments({
      teamId,
      userId,
      contactId: body.contactId,
      text: body.text.trim(),
      direction: body.direction ?? "theirs",
      source: body.source ?? "manual",
      sourceId: body.sourceId
    });
    res.status(201).json({ created: saved.length, commitments: saved });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router9.patch("/:id/confirm", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  try {
    const row = await confirmCommitment(teamId, userId, req.params.id);
    res.json(row);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});
router9.patch("/:id/done", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  try {
    const row = await completeCommitment(teamId, userId, req.params.id);
    res.json(row);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});
router9.patch("/:id/dismiss", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  try {
    const row = await dismissCommitment(teamId, userId, req.params.id);
    res.json(row);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});
router9.patch("/:id/due", async (req, res) => {
  const { userId, teamId } = getAuth(req);
  const { dueAt } = req.body;
  if (!dueAt) {
    res.status(400).json({ error: "dueAt required" });
    return;
  }
  try {
    const row = await updateCommitmentDue(teamId, userId, req.params.id, dueAt);
    res.json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
var commitments_default = router9;

// apps/api/src/routes/webhooks/capture.ts
import { Router as Router10 } from "express";
var router10 = Router10();
async function teamOr404(token, res) {
  const team = await getTeamByCaptureToken(token);
  if (!team) {
    res.status(404).json({ error: "Unknown capture link" });
    return null;
  }
  return team;
}
router10.post("/:token", async (req, res) => {
  const team = await teamOr404(req.params.token, res);
  if (!team) return;
  try {
    const row = await processCapturePayload(team.id, req.body);
    res.status(201).json({ ok: true, matched: Boolean(row.contactId), message: toInboundDto(row) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router10.post("/:token/email", async (req, res) => {
  const team = await teamOr404(req.params.token, res);
  if (!team) return;
  try {
    const payload = parseEmailWebhook(req.body);
    const row = await processCapturePayload(team.id, payload);
    res.status(201).json({ ok: true, matched: Boolean(row.contactId), message: toInboundDto(row) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
router10.post("/:token/sms", async (req, res) => {
  const team = await teamOr404(req.params.token, res);
  if (!team) return;
  const from = String(req.body.From ?? req.body.from ?? "");
  const body = String(req.body.Body ?? req.body.body ?? "").trim();
  const messageSid = req.body.MessageSid ? String(req.body.MessageSid) : void 0;
  if (!body) {
    res.type("text/xml").send("<Response></Response>");
    return;
  }
  try {
    await processSmsWebhook(team.id, from, body, messageSid);
  } catch (err) {
    console.warn("SMS capture failed:", err.message);
  }
  res.type("text/xml").send("<Response></Response>");
});
var capture_default = router10;

// apps/api/src/routes/webhooks/twilio.ts
import { Router as Router11 } from "express";
var router11 = Router11();
router11.post("/sms", async (req, res) => {
  const teamId = process.env.TWILIO_DEFAULT_TEAM_ID;
  if (!teamId) {
    res.status(503).type("text/xml").send("<Response></Response>");
    return;
  }
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) {
    res.status(503).type("text/xml").send("<Response></Response>");
    return;
  }
  const from = String(req.body.From ?? "");
  const body = String(req.body.Body ?? "").trim();
  const messageSid = req.body.MessageSid ? String(req.body.MessageSid) : void 0;
  if (!body) {
    res.type("text/xml").send("<Response></Response>");
    return;
  }
  try {
    await processSmsWebhook(team.id, from, body, messageSid);
  } catch (err) {
    console.warn("Twilio SMS capture failed:", err.message);
  }
  res.type("text/xml").send("<Response></Response>");
});
var twilio_default = router11;

// apps/api/src/app.ts
function createApp() {
  const app2 = express();
  app2.use(cors());
  app2.use(express.json());
  app2.use(express.urlencoded({ extended: false }));
  app2.get("/health", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", service: "cadence-api", db: "connected" });
    } catch {
      res.status(503).json({ status: "degraded", service: "cadence-api", db: "disconnected" });
    }
  });
  app2.use("/api/auth", auth_default);
  app2.use("/api/contacts", contacts_default);
  app2.use("/api/activities", activities_default);
  app2.use("/api/dashboard", dashboard_default);
  app2.use("/api/automations", automations_default);
  app2.use("/api/messages", messages_default);
  app2.use("/api/time-budget", time_budget_default);
  app2.use("/api/calendar", calendar_default);
  app2.use("/api/commitments", commitments_default);
  app2.use("/api/webhooks/capture", capture_default);
  app2.use("/api/webhooks/twilio", twilio_default);
  app2.use((err, _req, res, _next) => {
    console.error("Unhandled API error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
  });
  return app2;
}
var app = createApp();

// api/entry.ts
var entry_default = serverless(createApp());
export {
  entry_default as default
};
