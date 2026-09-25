import assert from 'node:assert/strict'
import { test } from 'node:test'
import { SessionMachine, type FlowGraph } from '@ybot/runtime'
import type { ExecutionServices, Session } from '@ybot/runtime'
import {
  SALON_WELCOME_NAME,
  flowCatalog,
  hairStudioPack,
  inspectFlowGraph,
  planHairStudioImport,
} from '@ybot/shared'
import { environmentsNeedingGraph } from './bella-salon-sync.js'

function session(text: string, name = 'Ada', start = 'start'): Session {
  return {
    id: 's1',
    conversationId: 'c1',
    botId: 'b1',
    tenantId: 't1',
    flowId: 'f1',
    flowVersionId: 'v1',
    currentNodeId: start,
    variables: { flow: { _last_user_message: text }, global: {}, contact: { name } },
    status: 'running',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function atStart(graph: FlowGraph, text: string, name = 'Ada'): Session {
  const start = graph.nodes.find((node) => node.data.kind === 'trigger_start')?.id ?? 'start'
  return session(text, name, start)
}

interface TurnNode {
  id: string
  data?: { kind?: string; config?: Record<string, unknown> }
}

function questionCount(node: TurnNode | undefined): number {
  const config = node?.data?.config ?? {}
  const text = String(config['text'] ?? config['question'] ?? '')
  return (text.match(/\?/g) ?? []).length
}

/**
 * A turn may answer and then ask once. Two question marks before the chart waits is too many.
 * An ask_question ends the turn, so the next question is a later reply.
 */
function stackedTurn(graph: unknown): string | undefined {
  if (!graph || typeof graph !== 'object') return undefined
  const record = graph as { nodes?: unknown; edges?: unknown }
  const nodes = Array.isArray(record.nodes) ? record.nodes.filter((node): node is TurnNode => (
    !!node && typeof node === 'object' && typeof (node as TurnNode).id === 'string'
  )) : []
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const next = new Map<string, string[]>()
  for (const edge of Array.isArray(record.edges) ? record.edges : []) {
    if (!edge || typeof edge !== 'object') continue
    const link = edge as { source?: unknown; target?: unknown }
    if (typeof link.source !== 'string' || typeof link.target !== 'string') continue
    next.set(link.source, [...(next.get(link.source) ?? []), link.target])
  }
  function walk(id: string, asked: number, seen: Set<string>): string | undefined {
    if (seen.has(id)) return undefined
    const node = byId.get(id)
    if (!node) return undefined
    const count = asked + questionCount(node)
    if (count > 1) return id
    if (node.data?.kind === 'ask_question') return undefined
    const further = new Set(seen)
    further.add(id)
    for (const target of next.get(id) ?? []) {
      const hit = walk(target, count, further)
      if (hit) return hit
    }
    return undefined
  }
  for (const node of nodes) {
    const hit = walk(node.id, 0, new Set())
    if (hit) return `${node.id}->${hit}`
  }
  return undefined
}

function spoken(result: { newMessages: Array<{ content: { text: string } }> }): string {
  return result.newMessages.map((message) => message.content.text).join('\n')
}

/** The live runner stores the new reply before it resumes a waiting question. */
async function reply(
  machine: SessionMachine,
  previous: { session: Session },
  graph: FlowGraph,
  text: string,
  name?: string,
) {
  previous.session.variables.flow['_last_user_message'] = text
  if (name) previous.session.variables.contact = { name }
  return machine.run(previous.session, graph, text)
}

test('a salon widget answers prices, bookings, and the Bella address', async () => {
  const pack = hairStudioPack('Bella Hair Studio')
  const names = pack.flows.map((flow) => flow.name)
  assert.equal(new Set(names).size, names.length)
  for (const intent of pack.intents) {
    const flow = pack.flows.find((item) => item.name === intent.name)
    assert.ok(flow, intent.name)
    const faq = pack.faqs.find((item) => item.question === intent.description)
    assert.equal(faq?.answer, intent.responses[0]!.text)
    assert.match(JSON.stringify(flow.graph), new RegExp(intent.responses[0]!.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
  for (const flow of pack.flows) {
    const issues = inspectFlowGraph(flow.graph as Parameters<typeof inspectFlowGraph>[0], { flowNames: names })
    const blocking = issues.filter((issue) => issue.level === 'block' || issue.level === 'repair')
    assert.deepEqual(blocking, [], flow.name)
    assert.equal(JSON.stringify(flow.graph).includes('http_request'), false, flow.name)
    assert.equal(stackedTurn(flow.graph), undefined, flow.name)
    assert.deepEqual(
      environmentsNeedingGraph(flow.graph, [], ['bella-env-sandbox', 'bella-env-production']),
      ['bella-env-sandbox', 'bella-env-production'],
      flow.name,
    )
  }

  const welcome = pack.flows.find((flow) => flow.name === SALON_WELCOME_NAME)!
  const machine = new SessionMachine({ llm: {}, db: {}, httpFetch: fetch } as unknown as ExecutionServices)
  const graph = welcome.graph as unknown as FlowGraph

  const hours = await machine.run(session('What are your opening hours?'), graph, 'What are your opening hours?')
  assert.equal(hours.jumpToFlow, 'Salon hours')
  assert.match(spoken(hours), /Hi, I'm Bella at Bella Hair Studio/)
  assert.equal(spoken(hours).includes('What would you like done'), false)
  assert.equal((spoken(hours).match(/\?/g) ?? []).length, 0)

  const prices = await machine.run(session('How much is a haircut?'), graph, 'How much is a haircut?')
  assert.equal(prices.jumpToFlow, 'Services and prices')

  const book = await machine.run(session('Can I book a colour?'), graph, 'Can I book a colour?')
  assert.equal(book.jumpToFlow, 'Book an appointment')

  const cancel = await machine.run(session('Please cancel my booking'), graph, 'Please cancel my booking')
  assert.equal(cancel.jumpToFlow, 'Cancel appointment')

  const where = await machine.run(session('Where are you?'), graph, 'Where are you?')
  assert.equal(where.jumpToFlow, 'Location')

  const move = await machine.run(session('Can I move my appointment to Tuesday?'), graph, 'Can I move my appointment to Tuesday?')
  assert.equal(move.jumpToFlow, 'Reschedule')

  const voucher = await machine.run(session('Do you sell gift vouchers?'), graph, 'Do you sell gift vouchers?')
  assert.equal(voucher.jumpToFlow, 'Gift voucher')

  const correction = await machine.run(session('I need colour correction after a home dye'), graph, 'I need colour correction after a home dye')
  assert.equal(correction.jumpToFlow, 'Colour correction')

  const consult = await machine.run(session('Can I book a consultation?'), graph, 'Can I book a consultation?')
  assert.equal(consult.jumpToFlow, 'Consultation')

  const patch = await machine.run(session('Do I need a patch test before colour?'), graph, 'Do I need a patch test before colour?')
  assert.equal(patch.jumpToFlow, 'Patch test')

  const notice = await machine.run(session('What is your cancellation policy?'), graph, 'What is your cancellation policy?')
  assert.equal(notice.jumpToFlow, 'Cancellation policy')

  const late = await machine.run(session("I'm running late"), graph, "I'm running late")
  assert.equal(late.jumpToFlow, 'Running late')

  const stylist = await machine.run(session('Can I request a stylist?'), graph, 'Can I request a stylist?')
  assert.equal(stylist.jumpToFlow, 'Stylist')

  const hello = await machine.run(session('hello'), graph, 'hello')
  assert.equal(hello.jumpToFlow, undefined)
  assert.equal(hello.session.status, 'waiting_input')
  assert.equal(spoken(hello), 'Hi Ada.')
  const knownReply = await reply(machine, hello, graph, 'just saying hello')
  assert.equal(spoken(knownReply), 'Hi Ada. What would you like done? A cut, colour, or something else is fine, and not sure is fine too.')

  const stranger = await machine.run(session('hello', 'there'), graph, 'hello')
  assert.equal(stranger.jumpToFlow, undefined)
  assert.equal(stranger.session.status, 'waiting_input')
  assert.equal(spoken(stranger), "Hi, I'm Bella at Bella Hair Studio.")
  const askName = await reply(machine, stranger, graph, 'do you want to know my name?')
  assert.equal(spoken(askName), "Yes.\nWhat's your name?")
  assert.equal(askName.session.status, 'waiting_input')
  const namedGuest = await reply(machine, askName, graph, 'Sophie', 'Sophie')
  assert.equal(spoken(namedGuest), 'Hi Sophie. What would you like done? A cut, colour, or something else is fine, and not sure is fine too.')
  const haircut = await reply(machine, namedGuest, graph, 'a haircut')
  assert.equal(haircut.jumpToFlow, 'Book an appointment')
  assert.equal(spoken(haircut).includes("Hi, I'm Bella"), false)

  const hoursAfterHello = await reply(machine, { session: (await machine.run(session('hi', 'there'), graph, 'hi')).session }, graph, 'What are your opening hours?')
  assert.equal(hoursAfterHello.jumpToFlow, 'Salon hours')
  assert.equal(spoken(hoursAfterHello).includes("Hi, I'm Bella"), false)

  const lighter = await machine.run(session("I'd like to go lighter", 'there'), graph, "I'd like to go lighter")
  assert.equal(lighter.jumpToFlow, 'Book an appointment')
  assert.match(spoken(lighter), /Hi, I'm Bella at Bella Hair Studio/)
  assert.equal(spoken(lighter).includes("What's your name?"), false)

  const reaction = await machine.run(session('I had an allergic reaction'), graph, 'I had an allergic reaction')
  assert.equal(reaction.jumpToFlow, 'Talk to the salon')

  const pricesFlow = pack.flows.find((flow) => flow.name === 'Services and prices')!
  const pricesSpoken = await machine.run(session('prices'), pricesFlow.graph as unknown as FlowGraph, 'prices')
  assert.match(spoken(pricesSpoken), /£35/)
  assert.equal(pricesSpoken.session.status, 'completed')

  const location = pack.flows.find((flow) => flow.name === 'Location')!
  const address = await machine.run(session('address'), location.graph as unknown as FlowGraph, 'address')
  assert.match(address.newMessages.map((message) => message.content.text).join('\n'), /14 Rosewood Lane/)

  const hoursFlow = pack.flows.find((flow) => flow.name === 'Salon hours')!
  const hoursSpoken = await machine.run(session('hours'), hoursFlow.graph as unknown as FlowGraph, 'hours')
  const hoursText = hoursSpoken.newMessages.map((message) => message.content.text).join('\n')
  assert.match(hoursText, /Monday to Saturday, 09:00 to 18:00/)
  assert.equal(hoursText.includes('Sunday'), false)

  const voucherFlow = pack.flows.find((flow) => flow.name === 'Gift voucher')!
  const voucherSpoken = await machine.run(session('voucher'), voucherFlow.graph as unknown as FlowGraph, 'voucher')
  assert.match(voucherSpoken.newMessages.map((message) => message.content.text).join('\n'), /£25, £50, or £100/)

  const bookFlow = pack.flows.find((flow) => flow.name === 'Book an appointment')!
  const bookGraph = bookFlow.graph as unknown as FlowGraph
  assert.match(JSON.stringify(bookGraph), /Consultation/)

  const colour = await machine.run(atStart(bookGraph, 'Can I book a colour?', 'there'), bookGraph, 'Can I book a colour?')
  assert.match(spoken(colour), /I can book that/)
  assert.match(spoken(colour), /What's your name\?/)
  assert.equal((spoken(colour).match(/\?/g) ?? []).length, 1)
  assert.equal(spoken(colour).includes('What would you like done'), false)
  const named = await reply(machine, colour, bookGraph, 'Sophie', 'Sophie')
  assert.match(spoken(named), /box dye or henna/)
  const history = await reply(machine, named, bookGraph, 'Dark brown, box dye a year ago')
  assert.match(spoken(history), /How did you hear about us/)
  const heard = await reply(machine, history, bookGraph, 'A friend')
  assert.match(spoken(heard), /photo of your hair/)
  const photo = await reply(machine, heard, bookGraph, 'Shoulder length, I want it softer')
  assert.match(spoken(photo), /15-minute consultation/)
  assert.match(spoken(photo), /48 hours/)
  assert.match(spoken(photo), /Saturday morning or a weekday after 5/)
  const time = await reply(machine, photo, bookGraph, 'Saturday morning')
  assert.match(spoken(time), /secure link/)
  assert.match(spoken(time), /card details/)
  assert.match(spoken(time), /24 hours/)
  assert.equal(spoken(time).includes('£20'), false)
  const email = await reply(machine, time, bookGraph, 'sophie@example.com')
  assert.match(spoken(email), /bond-building/)
  const addon = await reply(machine, email, bookGraph, 'No')
  assert.match(spoken(addon), /14 Rosewood Lane/)
  assert.match(spoken(addon), /Sophie/)
  assert.equal(addon.session.status, 'completed')

  const cut = await machine.run(atStart(bookGraph, 'book a haircut'), bookGraph, 'book a haircut')
  assert.match(spoken(cut), /I can book that/)
  assert.match(spoken(cut), /been to us before/)
  assert.equal((spoken(cut).match(/\?/g) ?? []).length, 1)
  assert.equal(spoken(cut).includes('patch test'), false)
  const returning = await reply(machine, cut, bookGraph, 'I have been before')
  assert.match(spoken(returning), /Saturday morning or a weekday after 5/)
  assert.equal(spoken(returning).includes('patch test'), false)
  const cutTime = await reply(machine, returning, bookGraph, 'a weekday after 5')
  assert.match(spoken(cutTime), /24 hours/)
  assert.match(spoken(cutTime), /Ada/)
  assert.equal(spoken(cutTime).includes('card details'), false)

  const newCut = await machine.run(atStart(bookGraph, 'book a haircut', 'Ada'), bookGraph, 'book a haircut')
  const notBeen = await reply(machine, newCut, bookGraph, 'I have not been')
  assert.match(spoken(notBeen), /hoping for with the cut/)
  assert.equal(spoken(notBeen).includes('Saturday morning'), false)

  const correctionFlow = pack.flows.find((flow) => flow.name === 'Colour correction')!
  const correctionGraph = correctionFlow.graph as unknown as FlowGraph
  const handed = await machine.run(atStart(correctionGraph, 'home dye'), correctionGraph, 'home dye')
  assert.equal(handed.handover?.team, 'salon')
  assert.match(spoken(handed), /passing this chat to the studio/)
})

test('cancel, reschedule, and consultation answer and then ask once', async () => {
  const pack = hairStudioPack('Bella Hair Studio')
  const machine = new SessionMachine({ llm: {}, db: {}, httpFetch: fetch } as unknown as ExecutionServices)
  const steps: Array<[string, string, string]> = [
    ['Cancel appointment', 'note a cancellation', 'What name is the appointment under'],
    ['Reschedule', 'note a new time', 'What name is the appointment under'],
    ['Consultation', 'free and takes about 15 minutes', 'Saturday morning or a weekday after 5'],
  ]
  for (const [name, answer, followUp] of steps) {
    const graph = pack.flows.find((flow) => flow.name === name)!.graph as unknown as FlowGraph
    const turn = await machine.run(atStart(graph, name), graph, name)
    assert.match(spoken(turn), new RegExp(answer))
    assert.match(spoken(turn), new RegExp(followUp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    assert.equal((spoken(turn).match(/\?/g) ?? []).length, 1, name)
    assert.equal(turn.session.status, 'waiting_input', name)
  }
})

test('a salon with no welcome publishes Salon welcome', () => {
  const plan = planHairStudioImport({
    companyName: 'Bella Hair Studio',
    existingFlowNames: [],
    existingIntentNames: [],
    existingQuestions: [],
    publishedWelcome: false,
  })
  assert.equal(plan.flows.find((flow) => flow.name === SALON_WELCOME_NAME)?.publish, true)
  assert.match(JSON.stringify(plan.flows.find((flow) => flow.name === SALON_WELCOME_NAME)?.graph), /Bella Hair Studio/)
})

test('Bella keeps her current welcome and gains a salon draft', () => {
  const plan = planHairStudioImport({
    companyName: 'Bella Hair Studio',
    existingFlowNames: ['Welcome & Routing', 'Talk to a person'],
    existingIntentNames: [],
    existingQuestions: ['What is your return policy?'],
    publishedWelcome: true,
  })
  const draft = plan.flows.find((flow) => flow.name === SALON_WELCOME_NAME)
  assert.equal(draft?.publish, false)
  assert.equal(plan.flows.some((flow) => flow.name === 'Welcome & Routing'), false)
  assert.equal(plan.flows.find((flow) => flow.name === 'Services and prices')?.publish, true)
  assert.equal(plan.faqs.some((faq) => faq.question === 'What is your return policy?'), false)

  const again = planHairStudioImport({
    companyName: 'Bella Hair Studio',
    existingFlowNames: ['Welcome & Routing', ...plan.flows.map((flow) => flow.name)],
    existingIntentNames: plan.intents.map((intent) => intent.name),
    existingQuestions: plan.faqs.map((faq) => faq.question),
    publishedWelcome: true,
  })
  assert.deepEqual(again.flows, [])
  assert.deepEqual(again.intents, [])
  assert.deepEqual(again.faqs, [])
})

test('the new-flow list includes the salon answers once', () => {
  const names = flowCatalog('Bella Hair Studio').map((flow) => flow.name)
  assert.ok(names.includes('Salon welcome'))
  assert.ok(names.includes('Services and prices'))
  assert.ok(names.includes('Reschedule'))
  assert.ok(names.includes('Gift voucher'))
  assert.ok(names.includes('Patch test'))
  assert.ok(names.includes('Order Status'))
  assert.equal(new Set(names).size, names.length)
})
