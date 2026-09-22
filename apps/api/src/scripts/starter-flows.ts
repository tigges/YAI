/**
 * Starter flowcharts copied into each company.
 * The shape matches the Acme walkthrough. Company-specific words are filled in
 * at copy time. Each company keeps its own copy.
 */

export interface StarterFlow {
  name: string
  description: string
  tags: string[]
  /** Only the welcome flow is published, so the widget starts with a greeting. */
  publish: boolean
  graph: { nodes: object[]; edges: object[] }
}

export function starterFlows(companyName: string): StarterFlow[] {
  const y = 120
  return [
    {
      name: 'Welcome & Routing',
      description: 'Greets visitors and routes them to the right flow',
      tags: ['welcome', 'routing'],
      publish: true,
      graph: {
        nodes: [
          { id: 'start-1', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: 'Conversation Start', config: {} } },
          { id: 'send-1', type: 'flow-node', position: { x: 280, y }, data: { kind: 'send_message', label: 'Welcome Message', config: { text: `Hi {{contact.name}}! 👋 Welcome to ${companyName}. How can I help you today?` } } },
          { id: 'ask-1', type: 'flow-node', position: { x: 480, y }, data: { kind: 'ask_question', label: 'Ask for topic', config: { question: 'What do you need help with?', variable: 'topic', choices: ['Order status', 'Returns', 'Billing', 'Technical support', 'Other'] } } },
          { id: 'intent-1', type: 'flow-node', position: { x: 680, y }, data: { kind: 'classify_intent', label: 'Classify intent', config: {} } },
          { id: 'cond-1', type: 'flow-node', position: { x: 880, y }, data: { kind: 'condition', label: 'Route by intent', config: { conditions: [{ field: 'intent', operator: 'equals', value: 'order_status' }, { field: 'intent', operator: 'equals', value: 'return_request' }] } } },
          { id: 'end-1', type: 'flow-node', position: { x: 1080, y }, data: { kind: 'end_flow', label: 'End', config: {} } },
        ],
        edges: [
          { id: 'e1', source: 'start-1', target: 'send-1' },
          { id: 'e2', source: 'send-1', target: 'ask-1' },
          { id: 'e3', source: 'ask-1', target: 'intent-1' },
          { id: 'e4', source: 'intent-1', target: 'cond-1' },
          { id: 'e5', source: 'cond-1', target: 'end-1' },
        ],
      },
    },
    {
      name: 'Order Status',
      description: 'Looks up an order and tells the customer where it is',
      tags: ['orders'],
      publish: false,
      graph: {
        nodes: [
          { id: 's1', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: 'Order Status Trigger', config: {} } },
          { id: 's2', type: 'flow-node', position: { x: 280, y }, data: { kind: 'ask_question', label: 'Ask order number', config: { question: 'Please share your order number so I can look it up.', variable: 'order_number' } } },
          { id: 's3', type: 'flow-node', position: { x: 480, y }, data: { kind: 'http_request', label: 'Fetch order', config: { method: 'GET', url: '', headers: {} } } },
          { id: 's4', type: 'flow-node', position: { x: 680, y }, data: { kind: 'condition', label: 'Order found?', config: { conditions: [{ field: 'response.status', operator: 'equals', value: '200' }] } } },
          { id: 's5', type: 'flow-node', position: { x: 880, y: 60 }, data: { kind: 'send_message', label: 'Order details', config: { text: 'Order {{order_number}} status: {{response.status}} — estimated delivery: {{response.estimated_delivery}}' } } },
          { id: 's6', type: 'flow-node', position: { x: 880, y: 200 }, data: { kind: 'handover', label: 'Escalate to agent', config: { team: 'support', priority: 'medium' } } },
          { id: 's7', type: 'flow-node', position: { x: 1080, y }, data: { kind: 'end_flow', label: 'End', config: {} } },
        ],
        edges: [
          { id: 'e1', source: 's1', target: 's2' },
          { id: 'e2', source: 's2', target: 's3' },
          { id: 'e3', source: 's3', target: 's4' },
          { id: 'e4', source: 's4', sourceHandle: 'yes', target: 's5' },
          { id: 'e5', source: 's4', sourceHandle: 'no', target: 's6' },
          { id: 'e6', source: 's5', target: 's7' },
          { id: 'e7', source: 's6', target: 's7' },
        ],
      },
    },
    {
      name: 'Return Request',
      description: 'Handles a return and opens a ticket',
      tags: ['returns'],
      publish: false,
      graph: {
        nodes: [
          { id: 'r1', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: 'Return Request', config: {} } },
          { id: 'r2', type: 'flow-node', position: { x: 280, y }, data: { kind: 'send_message', label: 'Policy intro', config: { text: 'I can help with returns. Our return window is 30 days from purchase.' } } },
          { id: 'r3', type: 'flow-node', position: { x: 480, y }, data: { kind: 'ask_question', label: 'Reason for return', config: { question: 'What is the reason for your return?', variable: 'return_reason', choices: ['Defective product', 'Wrong item', 'Changed mind', 'Not as described'] } } },
          { id: 'r4', type: 'flow-node', position: { x: 680, y }, data: { kind: 'set_variable', label: 'Set return type', config: { variable: 'return_type', value: '{{return_reason}}' } } },
          { id: 'r5', type: 'flow-node', position: { x: 880, y }, data: { kind: 'send_message', label: 'Return label', config: { text: 'I will send a return label to your email within 5 minutes.' } } },
          { id: 'r6', type: 'flow-node', position: { x: 1080, y }, data: { kind: 'create_ticket', label: 'Create return ticket', config: { subject: 'Return request: {{return_reason}}', priority: 'normal', team: 'returns' } } },
          { id: 'r7', type: 'flow-node', position: { x: 1280, y }, data: { kind: 'end_flow', label: 'End', config: {} } },
        ],
        edges: [
          { id: 'e1', source: 'r1', target: 'r2' },
          { id: 'e2', source: 'r2', target: 'r3' },
          { id: 'e3', source: 'r3', target: 'r4' },
          { id: 'e4', source: 'r4', target: 'r5' },
          { id: 'e5', source: 'r5', target: 'r6' },
          { id: 'e6', source: 'r6', target: 'r7' },
        ],
      },
    },
    {
      name: 'Lead Capture',
      description: 'Collects contact details and sends them to the CRM',
      tags: ['sales'],
      publish: false,
      graph: {
        nodes: [
          { id: 'l1', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: 'Lead Capture Start', config: {} } },
          { id: 'l2', type: 'flow-node', position: { x: 280, y }, data: { kind: 'send_message', label: 'Intro', config: { text: 'I can take a few details and ask the team to follow up.' } } },
          { id: 'l3', type: 'flow-node', position: { x: 480, y }, data: { kind: 'ask_question', label: 'Company name', config: { question: 'What company are you from?', variable: 'company' } } },
          { id: 'l4', type: 'flow-node', position: { x: 680, y }, data: { kind: 'ask_question', label: 'Email', config: { question: 'What is your work email?', variable: 'email', validate: 'email' } } },
          { id: 'l5', type: 'flow-node', position: { x: 880, y }, data: { kind: 'ask_question', label: 'Team size', config: { question: 'How large is your team?', variable: 'team_size', choices: ['1-10', '11-50', '51-200', '200+'] } } },
          { id: 'l6', type: 'flow-node', position: { x: 1080, y }, data: { kind: 'http_request', label: 'Push to CRM', config: { method: 'POST', url: '', body: { email: '{{email}}', company: '{{company}}', team_size: '{{team_size}}' } } } },
          { id: 'l7', type: 'flow-node', position: { x: 1280, y }, data: { kind: 'send_message', label: 'Confirm', config: { text: 'Thanks {{contact.name}}. Someone from the team will be in touch within 24 hours.' } } },
          { id: 'l8', type: 'flow-node', position: { x: 1480, y }, data: { kind: 'end_flow', label: 'End', config: {} } },
        ],
        edges: [
          { id: 'e1', source: 'l1', target: 'l2' },
          { id: 'e2', source: 'l2', target: 'l3' },
          { id: 'e3', source: 'l3', target: 'l4' },
          { id: 'e4', source: 'l4', target: 'l5' },
          { id: 'e5', source: 'l5', target: 'l6' },
          { id: 'e6', source: 'l6', target: 'l7' },
          { id: 'e7', source: 'l7', target: 'l8' },
        ],
      },
    },
    {
      name: 'CSAT Survey',
      description: 'Asks for a rating after a conversation is resolved',
      tags: ['csat'],
      publish: false,
      graph: {
        nodes: [
          { id: 'sv1', type: 'flow-node', position: { x: 80, y }, data: { kind: 'trigger_start', label: 'CSAT Trigger', config: { event: 'conversation.resolved' } } },
          { id: 'sv2', type: 'flow-node', position: { x: 280, y }, data: { kind: 'send_message', label: 'Thank you', config: { text: 'Thanks for reaching out. We would like your feedback on this conversation.' } } },
          { id: 'sv3', type: 'flow-node', position: { x: 480, y }, data: { kind: 'ask_question', label: 'CSAT score', config: { question: 'How would you rate your experience? (1-5)', variable: 'csat_score', choices: ['1', '2', '3', '4', '5'] } } },
          { id: 'sv4', type: 'flow-node', position: { x: 680, y }, data: { kind: 'condition', label: 'Score < 3?', config: { conditions: [{ field: 'csat_score', operator: 'less_than', value: '3' }] } } },
          { id: 'sv5', type: 'flow-node', position: { x: 880, y: 60 }, data: { kind: 'ask_question', label: 'Ask for feedback', config: { question: 'Sorry to hear that. What could we do better?', variable: 'feedback' } } },
          { id: 'sv6', type: 'flow-node', position: { x: 880, y: 200 }, data: { kind: 'send_message', label: 'Positive response', config: { text: 'Thank you for the kind rating.' } } },
          { id: 'sv7', type: 'flow-node', position: { x: 1080, y }, data: { kind: 'end_flow', label: 'End', config: {} } },
        ],
        edges: [
          { id: 'e1', source: 'sv1', target: 'sv2' },
          { id: 'e2', source: 'sv2', target: 'sv3' },
          { id: 'e3', source: 'sv3', target: 'sv4' },
          { id: 'e4', source: 'sv4', sourceHandle: 'yes', target: 'sv5' },
          { id: 'e5', source: 'sv4', sourceHandle: 'no', target: 'sv6' },
          { id: 'e6', source: 'sv5', target: 'sv7' },
          { id: 'e7', source: 'sv6', target: 'sv7' },
        ],
      },
    },
  ]
}
