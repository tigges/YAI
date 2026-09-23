# Fake and missing pieces

Wave 1, 2, and 3 are saved for real. Stripe is the remaining Planned mark on a screen. It will become a real feature.

## Now saved

- **Publish.** The canvas Publish button publishes the latest version to the selected environment.
- **By Channel.** The overview bars count conversations per channel.
- **Tickets.** Priority, assignee, and description are stored. A ticket can be created from a chat or on its own. Empty inboxes show no sample tickets.
- **Chat actions.** Assign and transfer send a user id. Internal notes are stored on the message. Labels are saved. Canned replies are stored per workspace. History lists the contact's other chats.
- **FAQ and entity Save.** Both write through the existing update APIs.
- **Profile name and agent alias.** Both update the signed-in user's display name.
- **Contacts.** Import, export, start conversation, and create ticket call the API. The filter limits the list to contacts with an email.
- **Webhooks.** Test calls the endpoint and records the delivery. The signing secret is stored. Success rate is counted from deliveries. Pause, edit, and delete are wired.
- **Undo and Redo.** The canvas keeps a local history of the graph.
- **Run Training.** The button saves the model settings and records a training run counted from intents, FAQs, and sources.
- **Audit.** An empty log stays empty.
- **Reports.** Creating a report saves it. Run now stamps the last run and download returns a CSV of current data.
- **Database.** Tables and rows are stored for the workspace.
- **Integrations.** Connect stores the API key. Disconnect removes it.

## Still planned

- **Stripe.** Connect stays unavailable. The card is marked Planned.

## Not built

- Billing and plan gates.
- SSO.
- A real WhatsApp connection. Bella's WhatsApp channel stores demo tokens.
- SMS and email as real channels.
- HubSpot sync beyond the saved connection, and LLM metering.
- Password-reset and invite emails, unless the server has mail set up. The suite opens the forms and does not click an email link.

## Working hours

Hours start the SLA clock for the human queue. They do not replace the bot. A widget message is still handled by the published flow, then the same chat shows in the inbox and on the overview dashboard.
