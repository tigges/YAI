/**
 * Acme Hair Studio — demo seed script
 *
 * Creates (or refreshes) a complete demo workspace so that all analytics
 * dashboards, the conversation inbox, and reports show realistic data.
 *
 * Usage:
 *   npx tsx apps/api/scripts/seed-demo.ts
 *
 * Can also be triggered in a running container via POST /api/v1/system/seed-demo
 * (dev / staging only — protected by SEED_DEMO_SECRET env var).
 *
 * The script is IDEMPOTENT: it upserts the tenant, bot, channels and contacts,
 * then adds new conversations / messages on each run to keep the dashboards fresh.
 */

import { prisma } from '@ybot/db'
import bcrypt from 'bcryptjs'

// ──────────────────────────────────────────────────────────────────────────────
// Configuration
// ──────────────────────────────────────────────────────────────────────────────

const TENANT_SLUG = 'acme-hair-studio'
const TENANT_NAME = 'Acme Hair Studio'
const ADMIN_EMAIL = 'acme@ybot.ai'
const ADMIN_PASS  = 'Demo1234!'
const AGENT_EMAIL = 'sophie@ybot.ai'
const BOT_NAME    = 'Bella'
const PERSONA     = 'Bella'

const DAYS_BACK = 30   // how many days of history to create
const CONVOS    = 240  // total conversations to seed

// ──────────────────────────────────────────────────────────────────────────────
// Conversation data templates
// ──────────────────────────────────────────────────────────────────────────────

const CONVOS_DATA: Array<{ subject: string; msgs: Array<{ role: 'user' | 'bot'; text: string }> }> = [
  {
    subject: 'Booking inquiry',
    msgs: [
      { role: 'user', text: 'Hi, I\'d like to book an appointment please.' },
      { role: 'bot', text: `Hi there! I'm ${PERSONA} from ${TENANT_NAME}. I'd be happy to help you book. What service are you interested in?` },
      { role: 'user', text: 'I need a haircut and blow-dry.' },
      { role: 'bot', text: 'Great choice! We have slots available this week. Our cuts start from £35 (ladies) and £25 (gents). Do you have a preferred day?' },
      { role: 'user', text: 'Thursday afternoon if possible.' },
      { role: 'bot', text: 'Thursday at 2 pm or 4 pm both work — which suits you better?' },
      { role: 'user', text: '4 pm please.' },
      { role: 'bot', text: 'Booked! You\'re all set for Thursday at 4 pm. We\'ll send a confirmation to your email. See you then! 💇' },
    ],
  },
  {
    subject: 'Opening hours query',
    msgs: [
      { role: 'user', text: 'What are your opening hours?' },
      { role: 'bot', text: `Hi! ${TENANT_NAME} is open Monday–Saturday 9 am–6 pm and Sunday 10 am–4 pm. Walk-ins are welcome subject to availability.` },
      { role: 'user', text: 'Are you open on bank holidays?' },
      { role: 'bot', text: 'We\'re closed on major bank holidays. Check our Instagram for any special holiday closures.' },
    ],
  },
  {
    subject: 'Pricing question',
    msgs: [
      { role: 'user', text: 'How much is a balayage?' },
      { role: 'bot', text: 'Our balayage service starts from £120, including a conditioning treatment and blow-dry. Price depends on hair length and density. Would you like a free consultation first?' },
      { role: 'user', text: 'Yes please, how do I book that?' },
      { role: 'bot', text: 'You can book a 15-minute consultation right here in chat! Want me to check availability for you?' },
    ],
  },
  {
    subject: 'Colour correction enquiry',
    msgs: [
      { role: 'user', text: 'I have a botched home dye job and need colour correction.' },
      { role: 'bot', text: 'I\'m sorry to hear that! Colour correction is one of our specialties. It\'s a multi-step process and pricing varies — we always recommend a consultation first. Can I book you in?' },
      { role: 'user', text: 'Yes, how long does it normally take?' },
      { role: 'bot', text: 'Colour correction typically takes 3–5 hours depending on the severity. We\'ll give you a detailed quote after seeing your hair.' },
      { role: 'user', text: 'Great, let\'s book.' },
      { role: 'bot', text: 'I\'ll check for a consultation slot now — could you share your preferred days and times?' },
    ],
  },
  {
    subject: 'Rescheduling request',
    msgs: [
      { role: 'user', text: 'I need to reschedule my appointment tomorrow.' },
      { role: 'bot', text: 'Of course! I can see your booking. Any specific day/time you\'d like to move it to?' },
      { role: 'user', text: 'Next Tuesday at 11 am if that\'s free.' },
      { role: 'bot', text: 'Tuesday 11 am is available. I\'ve rescheduled you — you\'ll get a confirmation shortly.' },
    ],
  },
  {
    subject: 'Parking availability',
    msgs: [
      { role: 'user', text: 'Do you have parking?' },
      { role: 'bot', text: 'There\'s a pay & display car park on the high street, 2 minutes away, and free on-street parking on side roads after 6 pm.' },
    ],
  },
  {
    subject: 'Hair treatment options',
    msgs: [
      { role: 'user', text: 'Do you do Olaplex treatments?' },
      { role: 'bot', text: 'Yes, we\'re Olaplex-certified! We offer Olaplex as an add-on to any colour service or as a standalone bond-building treatment from £25.' },
      { role: 'user', text: 'Can I add it to my existing appointment?' },
      { role: 'bot', text: 'Absolutely — just mention it when you arrive and your stylist will add it to your treatment.' },
    ],
  },
  {
    subject: 'Kids haircut query',
    msgs: [
      { role: 'user', text: 'Do you cut children\'s hair?' },
      { role: 'bot', text: 'We do! Kids\' cuts are £18 for under 12s. We recommend booking ahead — weekends can get busy.' },
      { role: 'user', text: 'Great, can I bring two kids at the same time?' },
      { role: 'bot', text: 'Of course! We can seat siblings together. I\'ll book two consecutive slots — what day works for you?' },
    ],
  },
  {
    subject: 'Wedding hair enquiry',
    msgs: [
      { role: 'user', text: 'I\'m getting married next June and need a bridal package.' },
      { role: 'bot', text: 'Congratulations! 💍 We offer bespoke bridal packages including trial, wedding day styling, and bridesmaid packages. Would you like to speak with our bridal specialist?' },
      { role: 'user', text: 'Yes please.' },
      { role: 'bot', text: 'I\'ll connect you with Emma, our bridal specialist. She\'ll reach out within 24 hours to discuss your vision!' },
    ],
  },
  {
    subject: 'Complaint about wait time',
    msgs: [
      { role: 'user', text: 'I waited 20 minutes past my appointment time last visit.' },
      { role: 'bot', text: 'I\'m really sorry about that — that\'s not the experience we want for you. I\'m escalating this to our salon manager who will follow up with you today.' },
      { role: 'user', text: 'Thank you.' },
    ],
  },
  {
    subject: 'Gift voucher request',
    msgs: [
      { role: 'user', text: 'Do you sell gift vouchers?' },
      { role: 'bot', text: 'Yes! We offer digital and physical gift vouchers in any amount from £20. They\'re perfect for birthdays or special occasions.' },
      { role: 'user', text: 'How do I buy one?' },
      { role: 'bot', text: 'You can purchase them directly on our website or in salon. Want me to send you the link?' },
    ],
  },
  {
    subject: 'Loyalty programme query',
    msgs: [
      { role: 'user', text: 'Do you have a loyalty programme?' },
      { role: 'bot', text: 'We do! Every £1 spent earns 1 point. At 200 points you get a free blow-dry. Ask your stylist to sign you up on your next visit.' },
    ],
  },
  {
    subject: 'Location question',
    msgs: [
      { role: 'user', text: 'Where are you located?' },
      { role: 'bot', text: 'We\'re at 42 High Street, right next to the Costa Coffee. Nearest tube: Green Park (5-min walk).' },
    ],
  },
  {
    subject: 'Online booking trouble',
    msgs: [
      { role: 'user', text: 'I can\'t get the online booking to work.' },
      { role: 'bot', text: 'Sorry to hear that! Can you tell me what\'s happening when you try to book? Alternatively I can book for you directly here.' },
      { role: 'user', text: 'It just says "no availability" but I\'m looking at next month.' },
      { role: 'bot', text: 'Ah, the calendar sometimes loads slowly. Try refreshing or I can manually check availability for you — what date are you aiming for?' },
    ],
  },
  {
    subject: 'Vegan product enquiry',
    msgs: [
      { role: 'user', text: 'Are your products vegan and cruelty free?' },
      { role: 'bot', text: 'Great question! All of our colour products are vegan and cruelty-free. We use Schwarzkopf BLONDME and Olaplex, both certified. Our retail range includes Davines which is also fully vegan.' },
    ],
  },
]

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const FIRST_NAMES = ['Emma','Olivia','Sophie','Charlotte','Amelia','Isabella','Mia','Harper','Aria','Luna',
  'James','Oliver','Noah','Liam','William','Ethan','Mason','Lucas','Aiden','Jack',
  'Priya','Aisha','Fatima','Yuki','Mei','Leila','Camille','Ingrid','Zara','Nina']

const LAST_NAMES = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Taylor','Wilson',
  'Thompson','White','Harris','Martin','Anderson','Jackson','Thomas','Lee','Walker','Hall']

function fakeName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
}

function fakeEmail(name: string) {
  return `${name.toLowerCase().replace(/ /g, '.')}${randomBetween(10, 99)}@example.com`
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

export async function seedDemo() {
  console.log('🌱  Seeding demo workspace: Acme Hair Studio…')

  // ── Tenant ─────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: TENANT_SLUG },
    update: { name: TENANT_NAME },
    create: { name: TENANT_NAME, slug: TENANT_SLUG, plan: 'pro' },
  })
  console.log(`  ✓ Tenant: ${tenant.id}`)

  // ── Admin user ─────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(ADMIN_PASS, 12)
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: ADMIN_EMAIL } },
    update: {},
    create: { tenantId: tenant.id, email: ADMIN_EMAIL, passwordHash, displayName: 'Acme Admin' },
  })
  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: admin.id } },
    update: { role: 'ADMIN' },
    create: { tenantId: tenant.id, userId: admin.id, role: 'ADMIN' },
  })
  console.log(`  ✓ Admin user: ${ADMIN_EMAIL} / ${ADMIN_PASS}`)

  // ── Agent user ─────────────────────────────────────────────────────────────
  const agentHash = await bcrypt.hash('Agent1234!', 12)
  const agent = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: AGENT_EMAIL } },
    update: {},
    create: { tenantId: tenant.id, email: AGENT_EMAIL, passwordHash: agentHash, displayName: 'Sophie (Agent)' },
  })
  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: agent.id } },
    update: { role: 'AGENT' },
    create: { tenantId: tenant.id, userId: agent.id, role: 'AGENT' },
  })
  console.log(`  ✓ Agent user: ${AGENT_EMAIL}`)

  // ── Bot ────────────────────────────────────────────────────────────────────
  const existingBot = await prisma.bot.findFirst({ where: { tenantId: tenant.id, name: BOT_NAME } })
  const bot = existingBot ?? await prisma.bot.create({
    data: { tenantId: tenant.id, name: BOT_NAME, personaName: PERSONA, status: 'active' },
  })
  await prisma.botConfig.upsert({
    where: { botId: bot.id },
    update: {},
    create: {
      tenantId: tenant.id,
      botId: bot.id,
      model: 'claude-sonnet-4-5',
      temperature: 0.3,
      maxTokens: 2048,
      systemPrompt: `You are ${PERSONA}, a helpful and friendly AI assistant for ${TENANT_NAME}. Help customers with bookings, pricing, and general enquiries. Be warm, concise, and professional.`,
    },
  })
  console.log(`  ✓ Bot: ${bot.id} (${BOT_NAME})`)

  // ── Environment ────────────────────────────────────────────────────────────
  const env = await prisma.environment.upsert({
    where: { id: `demo-env-${bot.id}` },
    update: {},
    create: {
      id: `demo-env-${bot.id}`,
      tenantId: tenant.id,
      botId: bot.id,
      kind: 'production',
      name: 'Production',
      isActive: true,
    },
  })

  // ── Channels ───────────────────────────────────────────────────────────────
  const webChannel = await prisma.channel.upsert({
    where: { id: `demo-web-${bot.id}` },
    update: {},
    create: {
      id: `demo-web-${bot.id}`,
      tenantId: tenant.id,
      botId: bot.id,
      environmentId: env.id,
      name: 'Website Chat',
      kind: 'web',
      isActive: true,
      config: { primaryColor: '#7c3aed', greeting: `Hi! I'm ${PERSONA}. How can I help today?` },
    },
  })
  const waChannel = await prisma.channel.upsert({
    where: { id: `demo-wa-${bot.id}` },
    update: {},
    create: {
      id: `demo-wa-${bot.id}`,
      tenantId: tenant.id,
      botId: bot.id,
      environmentId: env.id,
      name: 'WhatsApp Business',
      kind: 'whatsapp',
      isActive: true,
      config: { phoneNumberId: 'demo_phone', accessToken: 'demo_token', verifyToken: 'demo_verify' },
    },
  })
  console.log(`  ✓ Channels: web + whatsapp`)

  // ── Contacts + Conversations + Messages + CSAT ─────────────────────────────
  console.log(`  Creating ${CONVOS} conversations over the past ${DAYS_BACK} days…`)

  let created = 0
  for (let i = 0; i < CONVOS; i++) {
    const daysAgoCount = randomBetween(0, DAYS_BACK)
    const createdAt = daysAgo(daysAgoCount)
    // Offset by a random number of hours within the day
    createdAt.setHours(randomBetween(8, 20), randomBetween(0, 59), 0, 0)

    const name = fakeName()
    const email = fakeEmail(name)

    const contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        displayName: name,
        email,
        channelId: Math.random() > 0.3 ? webChannel.id : waChannel.id,
        createdAt,
      },
    })

    // Pick a template
    const template = pick(CONVOS_DATA)

    // Assign a status (40% resolved, 50% active, 10% escalated)
    const rand = Math.random()
    const status = rand < 0.40 ? 'resolved' : rand < 0.90 ? 'active' : 'escalated'
    const resolvedAt = status === 'resolved' ? new Date(createdAt.getTime() + randomBetween(5, 60) * 60_000) : null

    // 30% of conversations were handled by the agent
    const assignedTo = (status !== 'active' && Math.random() > 0.6) ? agent.id : null

    const conv = await prisma.conversation.create({
      data: {
        tenantId: tenant.id,
        botId: bot.id,
        environmentId: env.id,
        channelId: contact.channelId,
        contactId: contact.id,
        status,
        assignedTo,
        subject: template.subject,
        createdAt,
        updatedAt: resolvedAt ?? createdAt,
        resolvedAt,
      },
    })

    // Create messages with staggered timestamps
    let msgTime = new Date(createdAt)
    for (const m of template.msgs) {
      msgTime = new Date(msgTime.getTime() + randomBetween(10, 90) * 1000)
      await prisma.message.create({
        data: {
          tenantId: tenant.id,
          conversationId: conv.id,
          direction: m.role === 'user' ? 'inbound' : 'outbound',
          authorKind: m.role,
          authorId: m.role === 'user' ? contact.id : bot.id,
          content: { text: m.text },
          createdAt: msgTime,
        },
      })
    }

    // CSAT: 60% of resolved conversations get a rating
    if (status === 'resolved' && Math.random() < 0.6) {
      const rating = Math.random() < 0.82 ? 1 : -1  // 82% positive
      await prisma.csatResponse.create({
        data: {
          tenantId: tenant.id,
          conversationId: conv.id,
          rating,
          comment: rating === 1
            ? pick(['Great service!', 'Very helpful, thank you!', 'Quick and friendly ☺', 'Bella was amazing!', 'Sorted my issue fast.', null, null])
            : pick(['Took a while to get an answer.', 'Could be faster.', 'Didn\'t fully resolve my issue.', null]),
          createdAt: resolvedAt ?? createdAt,
        },
      })
    }

    created++
  }
  console.log(`  ✓ Created ${created} conversations`)

  // ── Training activity log ──────────────────────────────────────────────────
  const trainingRuns = [
    { daysBack: 25, model: 'claude-sonnet-4-5', examples: 12, status: 'success', durationMs: 1843 },
    { daysBack: 18, model: 'claude-sonnet-4-5', examples: 18, status: 'success', durationMs: 2104 },
    { daysBack: 10, model: 'claude-sonnet-4-5', examples: 23, status: 'success', durationMs: 1977 },
    { daysBack: 3,  model: 'gpt-4o-mini',       examples: 23, status: 'success', durationMs: 1543 },
  ]
  for (const run of trainingRuns) {
    await prisma.activity.create({
      data: {
        tenantId: tenant.id,
        userId: admin.id,
        action: 'training.run',
        resource: 'bot',
        resourceId: bot.id,
        metadata: {
          model: run.model,
          examples: run.examples,
          intents: Math.floor(run.examples * 0.5),
          faqs: Math.floor(run.examples * 0.3),
          sources: Math.floor(run.examples * 0.2),
          status: run.status,
          durationMs: run.durationMs,
        },
        createdAt: daysAgo(run.daysBack),
      },
    })
  }
  console.log(`  ✓ Training run history (${trainingRuns.length} runs)`)

  // ── Summary ────────────────────────────────────────────────────────────────
  const totals = {
    conversations: await prisma.conversation.count({ where: { tenantId: tenant.id } }),
    messages:      await prisma.message.count({ where: { tenantId: tenant.id } }),
    contacts:      await prisma.contact.count({ where: { tenantId: tenant.id } }),
    csatResponses: await prisma.csatResponse.count({ where: { tenantId: tenant.id } }),
  }
  console.log(`\n✅  Demo seed complete!`)
  console.log(`   Tenant: ${TENANT_SLUG}`)
  console.log(`   Login:  ${ADMIN_EMAIL} / ${ADMIN_PASS}`)
  console.log(`   Stats:  ${totals.conversations} convos · ${totals.messages} messages · ${totals.contacts} contacts · ${totals.csatResponses} CSAT responses`)
  return { tenant: tenant.id, ...totals }
}

// ──────────────────────────────────────────────────────────────────────────────
// CLI entry point
// ──────────────────────────────────────────────────────────────────────────────
if (process.argv[1]?.endsWith('seed-demo.ts') || process.argv[1]?.endsWith('seed-demo.js')) {
  seedDemo()
    .then(() => process.exit(0))
    .catch((err) => { console.error(err); process.exit(1) })
}
