import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { routeMessage } from '../src/bot/router.js';

const rl = readline.createInterface({ input, output });
const userId = 'local-demo';

function print(actions) {
  for (const action of actions) {
    if (action.kind === 'text') console.log(`BOT: ${action.body}`);
    if (action.kind === 'buttons') {
      console.log(`BOT: ${action.body}`);
      console.log('BOTONES:', action.buttons.map((b) => `${b.id}=${b.title}`).join(' | '));
    }
    if (action.kind === 'list') {
      console.log(`BOT: ${action.body}`);
      console.log('OPCIONES:', action.rows.map((r) => `${r.id}=${r.title}`).join(' | '));
    }
    if (action.kind === 'link') console.log(`BOT: ${action.body}: ${action.url}`);
  }
}

console.log("Simulador D'Lorgia Orienta. Escribe 'hola'. Para elegir una opción por ID escribe /id <id>. /salir para terminar.\n");
while (true) {
  const value = (await rl.question('TÚ: ')).trim();
  if (value === '/salir') break;
  const incoming = value.startsWith('/id ') ? { id: value.slice(4).trim(), text: '' } : { id: '', text: value };
  const actions = await routeMessage(userId, incoming);
  print(actions);
  console.log('');
}
rl.close();
