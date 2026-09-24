import { prisma } from '@ybot/db'
import { planCorporateImport } from '@ybot/shared'

export interface CorporateInstallResult {
  flowsAdded: string[]
  publishedNames: string[]
  draftNames: string[]
  intentsAdded: number
  faqsAdded: number
}

/**
 * Adds the corporate services pack. Names already on the bot are left as they are.
 * New answers are published on the environment you pass (Sandbox for a new bot).
 * A welcome that is already published stays the widget entry.
 */
export async function installCorporatePack(
  tenantId: string,
  botId: string,
  companyName: string,
  environmentId: string | null,
): Promise<CorporateInstallResult> {
  const [flows, intents, faqs, publishedWelcome] = await Promise.all([
    prisma.flow.findMany({ where: { tenantId, botId }, select: { name: true } }),
    prisma.intent.findMany({ where: { tenantId, botId }, select: { name: true } }),
    prisma.faq.findMany({ where: { tenantId, botId }, select: { question: true } }),
    prisma.flowVersion.findFirst({
      where: {
        status: 'published',
        flow: {
          botId,
          tenantId,
          OR: [{ tags: { has: 'welcome' } }, { name: 'Welcome & Routing' }, { name: 'Product welcome' }],
        },
      },
      select: { id: true },
    }),
  ])

  const plan = planCorporateImport({
    companyName,
    existingFlowNames: flows.map((flow) => flow.name),
    existingIntentNames: intents.map((intent) => intent.name),
    existingQuestions: faqs.map((faq) => faq.question),
    publishedWelcome: Boolean(publishedWelcome),
  })

  const flowsAdded: string[] = []
  const publishedNames: string[] = []
  const draftNames: string[] = []
  for (const starter of plan.flows) {
    const publish = starter.publish && Boolean(environmentId)
    const flow = await prisma.flow.create({
      data: {
        tenantId,
        botId,
        name: starter.name,
        description: starter.description,
        kind: 'flow',
        tags: starter.tags,
      },
    })
    await prisma.flowVersion.create({
      data: {
        tenantId,
        flowId: flow.id,
        version: 1,
        status: publish ? 'published' : 'draft',
        environmentId: publish ? environmentId : null,
        graph: starter.graph,
        publishedAt: publish ? new Date() : null,
      },
    })
    flowsAdded.push(starter.name)
    if (publish) publishedNames.push(starter.name)
    else draftNames.push(starter.name)
  }

  let intentsAdded = 0
  for (const intent of plan.intents) {
    await prisma.intent.create({
      data: {
        tenantId,
        botId,
        name: intent.name,
        description: intent.description,
        utterances: intent.utterances,
        responses: intent.responses,
      },
    })
    intentsAdded += 1
  }

  let faqsAdded = 0
  for (const faq of plan.faqs) {
    await prisma.faq.create({
      data: {
        tenantId,
        botId,
        question: faq.question,
        answer: faq.answer,
        tags: faq.tags,
      },
    })
    faqsAdded += 1
  }

  return { flowsAdded, publishedNames, draftNames, intentsAdded, faqsAdded }
}
