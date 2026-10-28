import { config } from '../config.js';

const apiUrl = () => `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;

async function postWhatsApp(payload) {
  if (!config.accessToken || !config.phoneNumberId) {
    console.log('[DRY RUN WhatsApp]', JSON.stringify(payload, null, 2));
    return { dryRun: true };
  }

  const res = await fetch(apiUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload })
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`WhatsApp API ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

export function sendText(to, body) {
  return postWhatsApp({ to, type: 'text', text: { preview_url: false, body } });
}

export function sendButtons(to, body, buttons) {
  return postWhatsApp({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) }
        }))
      }
    }
  });
}

export function sendList(to, body, buttonText, rows, sectionTitle = 'Opciones') {
  return postWhatsApp({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: body },
      action: {
        button: buttonText.slice(0, 20),
        sections: [{
          title: sectionTitle.slice(0, 24),
          rows: rows.slice(0, 10).map((r) => ({
            id: r.id,
            title: r.title.slice(0, 24),
            description: (r.description || '').slice(0, 72)
          }))
        }]
      }
    }
  });
}
