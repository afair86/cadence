import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { prisma } from './db.js';
import authRoutes from './routes/auth.js';
import contactRoutes from './routes/contacts.js';
import activityRoutes from './routes/activities.js';
import dashboardRoutes from './routes/dashboard.js';
import automationRoutes from './routes/automations.js';
import messagesRoutes from './routes/messages.js';
import timeBudgetRoutes from './routes/time-budget.js';
import calendarRoutes from './routes/calendar.js';
import commitmentsRoutes from './routes/commitments.js';
import captureWebhookRoutes from './routes/webhooks/capture.js';
import twilioWebhookRoutes from './routes/webhooks/twilio.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'cadence-api', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'cadence-api', db: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/time-budget', timeBudgetRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/commitments', commitmentsRoutes);
app.use('/api/webhooks/capture', captureWebhookRoutes);
app.use('/api/webhooks/twilio', twilioWebhookRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Cadence API running on port ${PORT}`);
});
