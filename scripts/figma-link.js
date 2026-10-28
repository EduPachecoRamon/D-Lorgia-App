import { config } from '../src/config.js';

const topic = process.argv.slice(2).join(' ').trim() || 'limpieza facial';
if (!config.publicBotNumber) {
  console.error('Define PUBLIC_BOT_NUMBER en .env (formato internacional sin +).');
  process.exit(1);
}
const text = `Hola, vengo de D’Lorgia Orienta. Quiero continuar mi orientación sobre ${topic}.`;
console.log(`https://wa.me/${config.publicBotNumber}?text=${encodeURIComponent(text)}`);
