/**
 * Hair studio starter pack.
 *
 * Same idea as the corporate pack: the widget speaks the published flow.
 * The prices, hours, and address match the Bella Hair Studio page, so a
 * salon can answer from the first minute and then edit the lines.
 */

import type { StarterFlow } from './flow-templates.js'

export const HAIR_STUDIO_PACK_ID = 'hair-studio'
export const SALON_WELCOME_NAME = 'Salon welcome'

export interface SalonIntent {
  name: string
  description: string
  utterances: string[]
  responses: Array<{ text: string }>
}

export interface SalonFaq {
  question: string
  answer: string
  tags: string[]
}

interface Topic {
  flowName: string
  choice: string
  phrases: string[]
  question: string
  answer: string
  kind: 'answer' | 'task'
}

export interface SalonPack {
  id: typeof HAIR_STUDIO_PACK_ID
  name: string
  description: string
  flows: StarterFlow[]
  intents: SalonIntent[]
  faqs: SalonFaq[]
}

export interface PlannedSalonFlow extends StarterFlow {
  publish: boolean
}

export interface SalonImportPlan {
  flows: PlannedSalonFlow[]
  intents: SalonIntent[]
  faqs: SalonFaq[]
}

function companyLabel(companyName: string): string {
  const trimmed = companyName.trim()
  return trimmed || 'the studio'
}

function handleFor(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function topicsFor(companyName: string): Topic[] {
  const company = companyLabel(companyName)
  return [
    {
      flowName: 'Reschedule',
      choice: 'Move an appointment',
      phrases: ['reschedule my appointment', 'move my appointment', 'change my appointment', 'change my booking', 'move my booking', 'reschedule'],
      question: 'How do I move an appointment?',
      answer: 'I can note a new time. The studio will confirm it in this chat.',
      kind: 'task',
    },
    {
      flowName: 'Consultation',
      choice: 'Book a consultation',
      phrases: ['book a consultation', 'free consultation', 'consultation'],
      question: 'How do I book a consultation?',
      answer: 'A consultation is free and takes about 15 minutes. I will note the day, and the studio will confirm the time in this chat.',
      kind: 'task',
    },
    {
      flowName: 'Colour correction',
      choice: 'Colour correction',
      phrases: ['book a colour correction', 'colour correction', 'color correction', 'home dye'],
      question: 'Can you fix a home dye?',
      answer: 'Colour correction is quoted after the studio sees your hair. It often takes 3 to 5 hours. A free consultation is the first step.',
      kind: 'answer',
    },
    {
      flowName: 'Cancellation policy',
      choice: 'Cancellation policy',
      phrases: ['cancellation policy', 'late cancellation', 'how much notice', 'notice to cancel'],
      question: 'How much notice do you need to cancel?',
      answer: 'Tell the studio at least 24 hours before the appointment if you need to cancel or move it. The studio confirms the change in this chat.',
      kind: 'answer',
    },
    {
      flowName: 'Gift voucher',
      choice: 'Gift voucher',
      phrases: ['gift vouchers', 'gift voucher', 'gift card', 'voucher'],
      question: 'Do you sell gift vouchers?',
      answer: 'Gift vouchers are £25, £50, or £100, and they last 12 months. Share the name to print on it and the studio will email the voucher.',
      kind: 'answer',
    },
    {
      flowName: 'Patch test',
      choice: 'Patch test',
      phrases: ['patch test', 'allergy test', 'skin test'],
      question: 'Do I need a patch test?',
      answer: 'A colour appointment needs a patch test at least 48 hours before if you have not had one here recently. The studio will tell you if your booking needs one.',
      kind: 'answer',
    },
    {
      flowName: 'Running late',
      choice: 'Running late',
      phrases: ['running late', 'i am late', "i'm late"],
      question: 'What if I am running late?',
      answer: 'Tell us your name and how late you will be. The studio will hold the chair when the day allows.',
      kind: 'answer',
    },
    {
      flowName: 'Stylist',
      choice: 'Choose a stylist',
      phrases: ['request a stylist', 'same stylist', 'my stylist', 'who will do my hair', 'stylist'],
      question: 'Can I choose my stylist?',
      answer: 'Tell us the stylist you would like. The studio will check they are in, and will offer another stylist or another time if they are booked.',
      kind: 'answer',
    },
    {
      flowName: 'Book an appointment',
      choice: 'Book an appointment',
      phrases: ['book an appointment', 'book a haircut', 'book a cut', 'book a colour', 'book a color', 'book a balayage', 'book a keratin', 'book a treatment', 'book a skin scrub', 'make an appointment', 'to book', 'booking', 'book'],
      question: 'How do I book an appointment?',
      answer: 'I can take a booking. I will note the service and the day, and the studio will confirm the time in this chat.',
      kind: 'task',
    },
    {
      flowName: 'Cancel appointment',
      choice: 'Cancel an appointment',
      phrases: ['cancel my appointment', 'cancel my booking', 'cancel appointment', 'cancellation'],
      question: 'How do I cancel an appointment?',
      answer: 'I can note a cancellation. If the time is soon, the studio will confirm it in this chat.',
      kind: 'task',
    },
    {
      flowName: 'Salon hours',
      choice: 'Opening hours',
      phrases: ['opening hours', 'salon hours', 'when are you open', 'what time do you open', 'hours'],
      question: 'What are your opening hours?',
      answer: `${company} is open Monday to Saturday, 09:00 to 18:00. You can message any time. I still answer outside those hours, and the studio replies during them.`,
      kind: 'answer',
    },
    {
      flowName: 'Services and prices',
      choice: 'Services and prices',
      phrases: ['how much', 'prices', 'price', 'haircut', 'colour', 'color', 'highlights', 'balayage', 'keratin', 'treatment'],
      question: 'How much is a haircut?',
      answer: `${company} cuts start from £35, colour from £70, treatments from £45, balayage from £90, a skin scrub from £200, and keratin smoothing from £120.`,
      kind: 'answer',
    },
    {
      flowName: 'Walk-ins',
      choice: 'Walk-ins',
      phrases: ['walk-in', 'walk in', 'walk-ins', 'walk ins'],
      question: 'Do you take walk-ins?',
      answer: 'Walk-ins are welcome when a chair is free. A booking is the sure way to keep a time.',
      kind: 'answer',
    },
    {
      flowName: 'Location',
      choice: 'Location',
      phrases: ['where are you', 'address', 'directions', 'where is the salon'],
      question: 'Where are you?',
      answer: `${company} is at 14 Rosewood Lane.`,
      kind: 'answer',
    },
    {
      flowName: 'Talk to the salon',
      choice: 'Talk to the salon',
      phrases: ['talk to the salon', 'speak to a person', 'talk to someone', 'real person', 'receptionist'],
      question: 'How do I talk to someone at the salon?',
      answer: 'I am passing this chat to the studio. Someone will continue here.',
      kind: 'task',
    },
  ]
}

function answerFlow(topic: Topic): StarterFlow {
  const y = 120
  return {
    name: topic.flowName,
    description: 'Benchmark answer for a hair studio. Edit the message to match your salon.',
    tags: ['salon', 'template', 'faq'],
    publish: true,
    graph: {
      nodes: [
        { id: 'start', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: topic.flowName, config: {} } },
        { id: 'say', type: 'flow-node', position: { x: 340, y }, data: { kind: 'send_message', label: 'Answer', config: { text: topic.answer } } },
        { id: 'end', type: 'flow-node', position: { x: 640, y }, data: { kind: 'end_flow', label: 'End', config: {} } },
      ],
      edges: [
        { id: 'e1', source: 'start', target: 'say', sourceHandle: 'out' },
        { id: 'e2', source: 'say', target: 'end' },
      ],
    },
  }
}

function bookFlow(topic: Topic): StarterFlow {
  const y = 120
  return {
    name: topic.flowName,
    description: 'Notes a service and a day. The studio confirms the time. Edit the choices to match your menu.',
    tags: ['salon', 'template', 'booking'],
    publish: true,
    graph: {
      nodes: [
        { id: 'b1', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: 'Book', config: {} } },
        { id: 'b2', type: 'flow-node', position: { x: 300, y }, data: { kind: 'send_message', label: 'Intro', config: { text: topic.answer } } },
        { id: 'b3', type: 'flow-node', position: { x: 540, y }, data: { kind: 'ask_question', label: 'Service', config: { question: 'Which service would you like?', variable: 'service', choices: ['Cut', 'Colour', 'Balayage', 'Treatment', 'Keratin', 'Skin scrub', 'Consultation'] } } },
        { id: 'b4', type: 'flow-node', position: { x: 780, y }, data: { kind: 'ask_question', label: 'Day', config: { question: 'Which day works for you?', variable: 'preferred_day' } } },
        { id: 'b5', type: 'flow-node', position: { x: 1020, y }, data: { kind: 'send_message', label: 'Confirm', config: { text: 'I have noted {{service}} on {{preferred_day}}. The studio will confirm the time in this chat.' } } },
        { id: 'b6', type: 'flow-node', position: { x: 1260, y }, data: { kind: 'end_flow', label: 'End', config: {} } },
      ],
      edges: [
        { id: 'e1', source: 'b1', target: 'b2', sourceHandle: 'out' },
        { id: 'e2', source: 'b2', target: 'b3' },
        { id: 'e3', source: 'b3', target: 'b4' },
        { id: 'e4', source: 'b4', target: 'b5' },
        { id: 'e5', source: 'b5', target: 'b6' },
      ],
    },
  }
}

function cancelFlow(topic: Topic): StarterFlow {
  const y = 120
  return {
    name: topic.flowName,
    description: 'Notes a cancellation for the studio to confirm.',
    tags: ['salon', 'template', 'booking'],
    publish: true,
    graph: {
      nodes: [
        { id: 'c1', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: 'Cancel', config: {} } },
        { id: 'c2', type: 'flow-node', position: { x: 300, y }, data: { kind: 'send_message', label: 'Intro', config: { text: topic.answer } } },
        { id: 'c3', type: 'flow-node', position: { x: 540, y }, data: { kind: 'ask_question', label: 'Name', config: { question: 'What name is the appointment under?', variable: 'guest_name' } } },
        { id: 'c4', type: 'flow-node', position: { x: 780, y }, data: { kind: 'ask_question', label: 'When', config: { question: 'Which day and time should I cancel?', variable: 'appointment_time' } } },
        { id: 'c5', type: 'flow-node', position: { x: 1020, y }, data: { kind: 'send_message', label: 'Confirm', config: { text: 'I have noted the cancellation for {{guest_name}} on {{appointment_time}}. The studio will confirm it in this chat.' } } },
        { id: 'c6', type: 'flow-node', position: { x: 1260, y }, data: { kind: 'end_flow', label: 'End', config: {} } },
      ],
      edges: [
        { id: 'e1', source: 'c1', target: 'c2', sourceHandle: 'out' },
        { id: 'e2', source: 'c2', target: 'c3' },
        { id: 'e3', source: 'c3', target: 'c4' },
        { id: 'e4', source: 'c4', target: 'c5' },
        { id: 'e5', source: 'c5', target: 'c6' },
      ],
    },
  }
}

function talkFlow(topic: Topic): StarterFlow {
  const y = 120
  return {
    name: topic.flowName,
    description: 'Tells the guest a person is taking over, then hands the chat to the studio',
    tags: ['salon', 'template', 'handover'],
    publish: true,
    graph: {
      nodes: [
        { id: 't1', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: 'Talk to the salon', config: {} } },
        { id: 't2', type: 'flow-node', position: { x: 300, y }, data: { kind: 'send_message', label: 'Tell them', config: { text: topic.answer } } },
        { id: 't3', type: 'flow-node', position: { x: 540, y }, data: { kind: 'handover', label: 'Hand to the studio', config: { team: 'salon', priority: 'medium' } } },
        { id: 't4', type: 'flow-node', position: { x: 760, y }, data: { kind: 'end_flow', label: 'End', config: {} } },
      ],
      edges: [
        { id: 'e1', source: 't1', target: 't2', sourceHandle: 'out' },
        { id: 'e2', source: 't2', target: 't3' },
        { id: 'e3', source: 't3', target: 't4' },
      ],
    },
  }
}

function rescheduleFlow(topic: Topic): StarterFlow {
  const y = 120
  return {
    name: topic.flowName,
    description: 'Notes a new day. The studio confirms the time. Edit the notice line on Cancellation policy to match your salon.',
    tags: ['salon', 'template', 'booking'],
    publish: true,
    graph: {
      nodes: [
        { id: 'm1', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: 'Reschedule', config: {} } },
        { id: 'm2', type: 'flow-node', position: { x: 300, y }, data: { kind: 'send_message', label: 'Intro', config: { text: topic.answer } } },
        { id: 'm3', type: 'flow-node', position: { x: 540, y }, data: { kind: 'ask_question', label: 'Name', config: { question: 'What name is the appointment under?', variable: 'guest_name' } } },
        { id: 'm4', type: 'flow-node', position: { x: 780, y }, data: { kind: 'ask_question', label: 'Current time', config: { question: 'Which day and time is it now?', variable: 'appointment_time' } } },
        { id: 'm5', type: 'flow-node', position: { x: 1020, y }, data: { kind: 'ask_question', label: 'New day', config: { question: 'Which day would you like instead?', variable: 'new_day' } } },
        { id: 'm6', type: 'flow-node', position: { x: 1260, y }, data: { kind: 'send_message', label: 'Confirm', config: { text: 'I have noted a move for {{guest_name}} from {{appointment_time}} to {{new_day}}. The studio will confirm the new time in this chat.' } } },
        { id: 'm7', type: 'flow-node', position: { x: 1500, y }, data: { kind: 'end_flow', label: 'End', config: {} } },
      ],
      edges: [
        { id: 'e1', source: 'm1', target: 'm2', sourceHandle: 'out' },
        { id: 'e2', source: 'm2', target: 'm3' },
        { id: 'e3', source: 'm3', target: 'm4' },
        { id: 'e4', source: 'm4', target: 'm5' },
        { id: 'e5', source: 'm5', target: 'm6' },
        { id: 'e6', source: 'm6', target: 'm7' },
      ],
    },
  }
}

function consultationFlow(topic: Topic): StarterFlow {
  const y = 120
  return {
    name: topic.flowName,
    description: 'Notes a free consultation. The studio confirms the time.',
    tags: ['salon', 'template', 'booking'],
    publish: true,
    graph: {
      nodes: [
        { id: 'n1', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: 'Consultation', config: {} } },
        { id: 'n2', type: 'flow-node', position: { x: 300, y }, data: { kind: 'send_message', label: 'Intro', config: { text: topic.answer } } },
        { id: 'n3', type: 'flow-node', position: { x: 540, y }, data: { kind: 'ask_question', label: 'Day', config: { question: 'Which day works for you?', variable: 'preferred_day' } } },
        { id: 'n4', type: 'flow-node', position: { x: 780, y }, data: { kind: 'send_message', label: 'Confirm', config: { text: 'I have noted a consultation on {{preferred_day}}. The studio will confirm the time in this chat.' } } },
        { id: 'n5', type: 'flow-node', position: { x: 1020, y }, data: { kind: 'end_flow', label: 'End', config: {} } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', sourceHandle: 'out' },
        { id: 'e2', source: 'n2', target: 'n3' },
        { id: 'e3', source: 'n3', target: 'n4' },
        { id: 'e4', source: 'n4', target: 'n5' },
      ],
    },
  }
}

function taskFlow(topic: Topic): StarterFlow {
  if (topic.flowName === 'Book an appointment') return bookFlow(topic)
  if (topic.flowName === 'Cancel appointment') return cancelFlow(topic)
  if (topic.flowName === 'Reschedule') return rescheduleFlow(topic)
  if (topic.flowName === 'Consultation') return consultationFlow(topic)
  return talkFlow(topic)
}

function welcomeFlow(companyName: string, topics: Topic[]): StarterFlow {
  const company = companyLabel(companyName)
  const routes = topics.map((topic) => ({
    handle: handleFor(topic.flowName),
    phrases: topic.phrases,
    flowName: topic.flowName,
  }))
  const y = 80
  const nodes: object[] = [
    { id: 'start', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: 'Start', config: {} } },
    {
      id: 'hi',
      type: 'flow-node',
      position: { x: 300, y },
      data: {
        kind: 'send_message',
        label: 'Welcome',
        config: { text: `Hi {{contact.name}}. Welcome to ${company}. I can help with a booking, prices, a voucher, opening hours, or a person at the studio.` },
      },
    },
    { id: 'route', type: 'flow-node', position: { x: 620, y }, data: { kind: 'route_topic', label: 'Route by topic', config: { routes } } },
    {
      id: 'ask',
      type: 'flow-node',
      position: { x: 620, y: 420 },
      data: {
        kind: 'ask_question',
        label: 'Ask for topic',
        config: { question: 'What do you need help with?', variable: 'topic', choices: topics.map((topic) => topic.choice) },
      },
    },
    { id: 'route2', type: 'flow-node', position: { x: 900, y: 420 }, data: { kind: 'route_topic', label: 'Route the answer', config: { routes } } },
    {
      id: 'menu',
      type: 'flow-node',
      position: { x: 1180, y: 420 },
      data: {
        kind: 'send_message',
        label: 'Offer the menu',
        config: { text: 'I can help with a booking, a new time, prices, a voucher, opening hours, walk-ins, our address, or a person at the studio.' },
      },
    },
    { id: 'end', type: 'flow-node', position: { x: 1460, y: 420 }, data: { kind: 'end_flow', label: 'End', config: {} } },
  ]
  const edges: object[] = [
    { id: 'e-start', source: 'start', target: 'hi', sourceHandle: 'out' },
    { id: 'e-route', source: 'hi', target: 'route' },
    { id: 'e-other', source: 'route', target: 'ask', sourceHandle: 'other' },
    { id: 'e-ask', source: 'ask', target: 'route2' },
    { id: 'e-other-2', source: 'route2', target: 'menu', sourceHandle: 'other' },
    { id: 'e-end', source: 'menu', target: 'end' },
  ]
  topics.forEach((topic, index) => {
    const id = `go-${handleFor(topic.flowName)}`
    nodes.push({
      id,
      type: 'flow-node',
      position: { x: 980, y: y + index * 72 },
      data: { kind: 'execute_flow', label: topic.flowName, config: { flowName: topic.flowName } },
    })
    edges.push({ id: `e-${handleFor(topic.flowName)}`, source: 'route', target: id, sourceHandle: handleFor(topic.flowName) })
    edges.push({ id: `e2-${handleFor(topic.flowName)}`, source: 'route2', target: id, sourceHandle: handleFor(topic.flowName) })
  })
  return {
    name: SALON_WELCOME_NAME,
    description: `Greets guests and answers the usual salon questions for ${company}`,
    tags: ['welcome', 'routing', 'salon'],
    publish: true,
    graph: { nodes, edges },
  }
}

export function hairStudioPack(companyName: string): SalonPack {
  const topics = topicsFor(companyName)
  const flows: StarterFlow[] = [welcomeFlow(companyName, topics)]
  for (const topic of topics) {
    flows.push(topic.kind === 'answer' ? answerFlow(topic) : taskFlow(topic))
  }
  return {
    id: HAIR_STUDIO_PACK_ID,
    name: 'Hair studio',
    description: 'Benchmark flows, intents, and FAQs for a salon widget. Prices and the address match the Bella demo page.',
    flows,
    intents: topics.map((topic) => ({
      name: topic.flowName,
      description: topic.question,
      utterances: topic.phrases,
      responses: [{ text: topic.answer }],
    })),
    faqs: topics.map((topic) => ({
      question: topic.question,
      answer: topic.answer,
      tags: ['salon', handleFor(topic.flowName)],
    })),
  }
}

/**
 * Existing names stay as they are. A published welcome stays the widget entry.
 * The salon greeting is saved as a draft named Salon welcome.
 */
export function planHairStudioImport(input: {
  companyName: string
  existingFlowNames: string[]
  existingIntentNames: string[]
  existingQuestions: string[]
  publishedWelcome: boolean
}): SalonImportPlan {
  const pack = hairStudioPack(input.companyName)
  const existing = new Set(input.existingFlowNames)
  const flows: PlannedSalonFlow[] = []
  const welcome = pack.flows.find((flow) => flow.name === SALON_WELCOME_NAME)
  for (const flow of pack.flows) {
    if (flow.name === SALON_WELCOME_NAME) continue
    if (existing.has(flow.name)) continue
    flows.push({ ...flow, publish: true })
  }
  if (welcome && !input.publishedWelcome && !existing.has(SALON_WELCOME_NAME)) {
    flows.unshift({ ...welcome, publish: true })
  } else if (welcome && !existing.has(SALON_WELCOME_NAME) && input.publishedWelcome) {
    flows.push({
      ...welcome,
      description: 'Benchmark greeting for a hair studio. Publish it in Sandbox when you want the widget to use it. Your current welcome stays until then.',
      publish: false,
    })
  }
  const intentNames = new Set(input.existingIntentNames)
  const questions = new Set(input.existingQuestions)
  return {
    flows,
    intents: pack.intents.filter((intent) => !intentNames.has(intent.name)),
    faqs: pack.faqs.filter((faq) => !questions.has(faq.question)),
  }
}
