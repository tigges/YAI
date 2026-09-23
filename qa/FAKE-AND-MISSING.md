# Fake and missing pieces

The night suite saves only where a real API exists. These screens look finished and are not.

## Local only

- **Reports.** The six report cards are a fixed list in the browser. Creating one does not save.
- **Database.** Tables, rows, and a new table stay in the browser. Nothing is stored.
- **Integrations.** Connect and disconnect change the page only. HubSpot, Salesforce, Zendesk, Jira, Slack, Teams, Zapier, n8n, Google Analytics, Mixpanel, and Shopify have no backend. Stripe is marked Soon.
- **Webhook delivery list.** The webhook itself saves. The delivery log under it is sample data.
- **Overview, by channel.** The bars are 45% web, 30% WhatsApp, 15% SMS, 10% email of the conversation total. They are not counted from channels.
- **Canned replies.** Five replies are hardcoded in the chat box.
- **Ticket form.** Priority, assignee, and description on "New ticket" are not sent. The ticket is saved with the title and the default priority.
- **Chat ticket button.** "Create ticket" inside a chat closes the dialog and does not create a ticket.
- **Assign in the chat.** The menu sends a display name, not a user id.
- **Contact menu.** "Start conversation" and "Create ticket" do nothing. Import and export do nothing.
- **Publish on the canvas.** Save writes the graph. The Publish button only changes the badge in the browser. Publishing for real is a separate API.
- **Run training.** The button saves the model, temperature, and prompt. It does not train a model.
- **Empty-state samples.** If the API returns no tickets, audit events, intents, FAQs, or entities, the page shows built-in sample rows.

## Fixed with this suite

- An agent could not sign in. The sign-in page asks for the bot list, and that list refused the agent role. Agents can now read bots. Creating or editing a bot, and the flow builder, still refuse them.
- A widget message outside 09:00–18:00 London was answered with the away sentence and the published flow never ran. The bot now keeps answering. Hours still start the SLA clock.

## Not built

- Billing and plan gates.
- SSO.
- A real WhatsApp connection. Bella's WhatsApp channel stores demo tokens.
- SMS and email as real channels.
- HubSpot sync and LLM metering.
- Password-reset and invite emails, unless the server has mail set up. The suite opens the forms and does not click an email link.

## Working hours

Hours start the SLA clock for the human queue. They do not replace the bot. A widget message is still handled by the published flow, then the same chat shows in the inbox and on the overview dashboard.
