import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.activity.deleteMany();
  await prisma.automation.deleteMany();
  await prisma.inboxMessage.deleteMany();
  await prisma.commitment.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.userTimeBudget.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pointConfig.deleteMany();
  await prisma.team.deleteMany();

  const team = await prisma.team.create({
    data: {
      name: 'Demo Sales Team',
      pointConfig: { create: {} },
    },
  });

  const passwordHash = await bcrypt.hash('demo1234', 10);
  const user = await prisma.user.create({
    data: {
      email: 'alex@demo.com',
      passwordHash,
      name: 'Alex Thomas',
      role: 'BDM',
      teamId: team.id,
      timeBudget: {
        create: {
          businessHoursPerWeek: 20,
          personalHoursPerWeek: 3,
          familyHoursPerWeek: 2,
        },
      },
    },
  });

  const seedContacts = [
    {
      sphere: 'business',
      name: 'John Smith',
      company: 'TPY Ltd',
      position: 'Operations Manager',
      phone: '+61 400 111 222',
      email: 'john@tpyltd.com',
      linkedinUrl: 'john-smith-tpy',
      tags: ['Key Client', 'Active', 'Trade'],
      preferredMethod: 'call',
      preferredTimes: 'Fridays 11:00 AM – 12:00 PM',
      responseTime: 'Usually within 15 mins',
      healthScore: 58,
      healthStatus: 'cooling',
      lastContactAt: daysAgo(24),
    },
    {
      sphere: 'business',
      name: 'Sarah Johnson',
      company: 'Summit Finance',
      position: 'Director',
      phone: '+61 400 222 333',
      email: 'sarah@summitfinance.com',
      linkedinUrl: 'https://www.linkedin.com/in/sarah-johnson-summit',
      tags: ['Quote Pending', 'Finance'],
      preferredMethod: 'email',
      preferredTimes: 'Tue–Thu afternoons',
      responseTime: 'Same day',
      healthScore: 74,
      healthStatus: 'healthy',
      lastContactAt: daysAgo(5),
    },
    {
      sphere: 'business',
      name: 'Michael Brown',
      company: 'BuildCo',
      position: 'Project Lead',
      phone: '+61 400 333 444',
      email: 'mike@buildco.com',
      tags: ['Proposal', 'Construction'],
      preferredMethod: 'sms',
      preferredTimes: 'Mornings before 10am',
      responseTime: 'Within 1 hour',
      healthScore: 55,
      healthStatus: 'cooling',
      lastContactAt: daysAgo(21),
    },
    {
      sphere: 'business',
      name: 'Emma Williams',
      company: 'EW Plumbing',
      position: 'Owner',
      phone: '+61 400 444 555',
      email: 'emma@ewplumbing.com',
      tags: ['Quarterly', 'Trade'],
      preferredMethod: 'call',
      preferredTimes: 'Thu/Fri responsive',
      responseTime: 'Within 30 mins',
      healthScore: 82,
      healthStatus: 'healthy',
      lastContactAt: daysAgo(12),
    },
    {
      sphere: 'business',
      name: 'Daniel Lee',
      company: 'DL Electrical',
      position: 'BDM',
      phone: '+61 400 555 666',
      email: 'daniel@dlelectrical.com',
      tags: ['Follow-up', 'Trade'],
      preferredMethod: 'email',
      preferredTimes: 'After lunch',
      responseTime: 'Same day',
      healthScore: 71,
      healthStatus: 'healthy',
      lastContactAt: daysAgo(7),
    },
    {
      sphere: 'family',
      name: 'Kate Thomas',
      company: 'Family',
      position: 'Mum',
      phone: '+61 400 777 888',
      email: 'kate.thomas@email.com',
      facebookUsername: 'kate.thomas',
      tags: ['Birthday', 'Weekly call'],
      preferredMethod: 'call',
      preferredTimes: 'Sunday mornings',
      responseTime: 'Same day',
      healthScore: 45,
      healthStatus: 'cooling',
      lastContactAt: daysAgo(18),
    },
    {
      sphere: 'personal',
      name: 'Tom Harris',
      company: 'Friends',
      position: 'Mate',
      phone: '+61 400 888 999',
      email: 'tom.h@gmail.com',
      instagramHandle: 'tomharris',
      tags: ['Footy', 'Catch-up'],
      preferredMethod: 'sms',
      preferredTimes: 'Weekends',
      responseTime: 'Within a few hours',
      healthScore: 78,
      healthStatus: 'healthy',
      lastContactAt: daysAgo(9),
    },
    {
      sphere: 'family',
      name: 'Lily Thomas',
      company: 'Family',
      position: 'Daughter',
      phone: '+61 400 999 000',
      tags: ['School'],
      preferredMethod: 'sms',
      preferredTimes: 'After 4pm',
      healthScore: 88,
      healthStatus: 'healthy',
      lastContactAt: daysAgo(2),
    },
  ];

  const contacts = [];
  for (const c of seedContacts) {
    const contact = await prisma.contact.create({
      data: { teamId: team.id, ...c },
    });
    contacts.push(contact);
  }

  const [john, sarah, mike, emma, daniel, kate, tom, lily] = contacts;

  await prisma.opportunity.createMany({
    data: [
      { contactId: sarah.id, value: 25000, stage: 'Quote Sent' },
      { contactId: mike.id, value: 18500, stage: 'Proposal' },
      { contactId: john.id, value: 12000, stage: 'Discussion' },
    ],
  });

  const scheduledAt = new Date();
  scheduledAt.setHours(11, 0, 0, 0);
  if (scheduledAt.getTime() < Date.now()) {
    scheduledAt.setDate(scheduledAt.getDate() + 1);
  }

  await prisma.automation.createMany({
    data: [
      {
        contactId: john.id,
        channel: 'sms',
        message: 'Hey John, free for a quick chat around 11 today?',
        insight: 'Based on his typical availability Fridays between 11am – 12pm',
        scheduledAt,
        status: 'pending',
      },
      {
        contactId: kate.id,
        channel: 'sms',
        message: 'Hi Kate! Free for a catch-up call Sunday morning?',
        insight: 'Family check-in — you block Sunday mornings for family time',
        scheduledAt: hoursFromNow(4),
        status: 'pending',
      },
      {
        contactId: tom.id,
        channel: 'email',
        message: 'Hey Tom — want to grab coffee this weekend?',
        insight: 'Personal network — overdue for a catch-up',
        scheduledAt: hoursFromNow(6),
        status: 'pending',
      },
    ],
  });

  await prisma.inboxMessage.createMany({
    data: [
      {
        teamId: team.id,
        userId: user.id,
        contactId: john.id,
        platform: 'sms',
        body: 'Yes — 11 works for me. Can you bring the updated quote?',
        status: 'unread',
        receivedAt: hoursAgo(1),
      },
      {
        teamId: team.id,
        userId: user.id,
        contactId: sarah.id,
        platform: 'email',
        body: 'Thanks for sending the proposal. Board meets Tuesday — I’ll have an answer by Wed.',
        status: 'unread',
        receivedAt: hoursAgo(3),
      },
      {
        teamId: team.id,
        userId: user.id,
        contactId: kate.id,
        platform: 'sms',
        body: 'Sunday works! Lily wants to say hi too 🥰',
        status: 'read',
        receivedAt: hoursAgo(8),
      },
      {
        teamId: team.id,
        userId: user.id,
        contactId: tom.id,
        platform: 'instagram',
        body: 'Coffee Saturday arvo? Belgrave social?',
        status: 'unread',
        receivedAt: hoursAgo(5),
      },
      {
        teamId: team.id,
        userId: user.id,
        contactId: mike.id,
        platform: 'whatsapp',
        body: 'Site walk done — can you send the revised timeline by end of week?',
        status: 'read',
        receivedAt: hoursAgo(12),
      },
    ],
  });

  const tonight = new Date();
  tonight.setHours(20, 0, 0, 0);
  const tomorrow = hoursFromNow(24);
  tomorrow.setHours(17, 0, 0, 0);
  const friday = new Date();
  const daysUntilFriday = (5 - friday.getDay() + 7) % 7 || 7;
  friday.setDate(friday.getDate() + daysUntilFriday);
  friday.setHours(17, 0, 0, 0);

  await prisma.commitment.createMany({
    data: [
      {
        teamId: team.id,
        userId: user.id,
        contactId: john.id,
        title: 'Bring updated quote to John',
        dueAt: tonight,
        status: 'open',
        direction: 'mine',
        source: 'outbound',
        sourceQuote: "I'll get the updated quote to you tonight",
      },
      {
        teamId: team.id,
        userId: user.id,
        contactId: sarah.id,
        title: 'Respond: Update proposal before board meeting',
        dueAt: hoursFromNow(48),
        status: 'suggested',
        direction: 'theirs',
        source: 'inbox',
        sourceQuote: 'Can you update the proposal before the board meeting Tuesday?',
      },
      {
        teamId: team.id,
        userId: user.id,
        contactId: mike.id,
        title: 'Respond: Send revised timeline',
        dueAt: friday,
        status: 'suggested',
        direction: 'theirs',
        source: 'inbox',
        sourceQuote: 'can you send the revised timeline by end of week?',
      },
    ],
  });

  const today = new Date();
  today.setHours(9, 0, 0, 0);

  await prisma.activity.createMany({
    data: [
      { userId: user.id, contactId: john.id, type: 'call', durationMin: 45, points: 1, occurredAt: today },
      { userId: user.id, contactId: sarah.id, type: 'email', durationMin: 10, points: 0.5, notes: 'Following up on the finance proposal — let me know if you have questions.', occurredAt: hoursAgo(2) },
      { userId: user.id, contactId: mike.id, type: 'sms', durationMin: 5, points: 0.5, notes: 'Hey Mike, just checking in on the BuildCo project timeline.', occurredAt: hoursAgo(3) },
      { userId: user.id, contactId: emma.id, type: 'call', durationMin: 25, points: 1, occurredAt: hoursAgo(4) },
      { userId: user.id, contactId: daniel.id, type: 'meeting', durationMin: 60, points: 2, occurredAt: hoursAgo(5) },
      { userId: user.id, contactId: john.id, type: 'site_visit', durationMin: 90, points: 1.5, occurredAt: hoursAgo(26) },
      { userId: user.id, contactId: sarah.id, type: 'meeting', durationMin: 45, points: 2, occurredAt: hoursAgo(30) },
      { userId: user.id, contactId: kate.id, type: 'call', durationMin: 35, points: 1, occurredAt: hoursAgo(6) },
      { userId: user.id, contactId: tom.id, type: 'coffee', durationMin: 60, points: 2, occurredAt: hoursAgo(7) },
      { userId: user.id, contactId: lily.id, type: 'call', durationMin: 15, points: 1, occurredAt: hoursAgo(1) },
      { userId: user.id, contactId: john.id, type: 'meeting', durationMin: 60, points: 2, occurredAt: hoursFromNow(26), notes: 'Quote review at TPY office' },
      { userId: user.id, contactId: sarah.id, type: 'meeting', durationMin: 45, points: 2, occurredAt: hoursFromNow(50), notes: 'Board prep call' },
      { userId: user.id, contactId: tom.id, type: 'coffee', durationMin: 60, points: 2, occurredAt: hoursFromNow(74), notes: 'Belgrave Social catch-up' },
      { userId: user.id, contactId: kate.id, type: 'call', durationMin: 30, points: 1, occurredAt: hoursFromNow(8), notes: 'Sunday plans check-in' },
    ],
  });

  console.log('Seed complete');
  console.log('  Login: alex@demo.com / demo1234');
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

function hoursFromNow(n: number) {
  const d = new Date();
  d.setHours(d.getHours() + n);
  return d;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
