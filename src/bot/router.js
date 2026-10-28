import { branches, treatmentCategories, skinOptions, safeGuidance } from '../data/knowledge.js';
import { getSession, resetSession } from '../services/sessions.js';
import { answerWithAI } from '../services/ai.js';
import { orientationCatalog } from '../data/orientation.js';
import { calculateOrientation } from '../services/calculator.js';

const riskPattern = /(dolor (muy )?fuerte|sangrado|no puedo respirar|dificultad para respirar|desmayo|hinchaz[oó]n (muy )?(fuerte|importante)|reacci[oó]n al[eé]rgica|pus|fiebre alta|empeora mucho)/i;
const diagnosisPattern = /(diagn[oó]stic|qu[eé] tengo|medicamento|pastilla|dosis|rec[eé]tame|receta|qu[eé] debo tomar)/i;

const mainMenu = () => ({
  kind: 'list',
  body: '¿Qué deseas hacer?',
  buttonText: 'Ver opciones',
  sectionTitle: 'D’Lorgia Orienta',
  rows: [
    { id: 'discover', title: 'Descubre qué necesitas', description: 'Orientación inicial según tu objetivo' },
    { id: 'treatments', title: 'Tratamientos', description: 'Explora categorías y opciones' },
    { id: 'expectations', title: 'Expectativas reales', description: 'Recuperación, resultados y cuidados' },
    { id: 'care', title: 'Cuidados', description: 'Consulta orientación general de cuidados' },
    { id: 'followup', title: 'Seguimiento', description: 'Próximos pasos y acompañamiento' },
    { id: 'evaluation', title: 'Solicitar evaluación', description: 'Elige una sede para continuar' },
    { id: 'question', title: 'Tengo una pregunta', description: 'Escribe una duda libre al asistente' }
  ]
});

function welcome() {
  return [
    { kind: 'text', body: 'Hola 👋 Soy D’Lorgia Orienta. Puedo ayudarte a explorar tratamientos, comprender información general y continuar hacia una evaluación profesional. No realizo diagnósticos ni reemplazo a una especialista.' },
    mainMenu()
  ];
}

function branchList() {
  return {
    kind: 'list',
    body: '¿En qué sede deseas continuar tu evaluación?',
    buttonText: 'Elegir sede',
    sectionTitle: 'Sedes',
    rows: Object.entries(branches).map(([id, b]) => ({ id: `branch:${id}`, title: b.name, description: b.displayPhone }))
  };
}

function treatmentsList() {
  return {
    kind: 'list',
    body: '¿Qué categoría te interesa conocer?',
    buttonText: 'Ver categorías',
    sectionTitle: 'Tratamientos',
    rows: treatmentCategories
  };
}

function skinList() {
  return {
    kind: 'list',
    body: 'Dentro de piel, ¿sobre qué tema deseas orientarte?',
    buttonText: 'Ver opciones',
    sectionTitle: 'Piel',
    rows: skinOptions
  };
}


function expectationsList() {
  return {
    kind: 'list',
    body: 'Selecciona un tratamiento para recibir una orientación de expectativas, recuperación y cuidados. Es información referencial y no sustituye una evaluación.',
    buttonText: 'Elegir tratamiento',
    sectionTitle: 'Expectativas reales',
    rows: orientationCatalog.slice(0, 10).map((item) => ({
      id: `expect:${item.id}`,
      title: item.name,
      description: `${item.category} · ${item.short}`
    }))
  };
}

function expectationResponse(treatmentId) {
  const result = calculateOrientation({ treatmentId, goal: 'cuidado' });
  const text = [
    `*${result.treatment.name}*`,
    '',
    `⏱️ Recuperación: ${result.expectations.recovery}`,
    `📌 Sesiones: ${result.expectations.sessions}`,
    `🗓️ Duración/proceso: ${result.expectations.duration}`,
    '',
    '*Qué puedes esperar:*',
    ...result.expectations.results.map((x) => `• ${x}`),
    '',
    '*Cuidados posteriores:*',
    ...result.care.after.map((x) => `• ${x}`),
    '',
    `⚠️ ${result.disclaimer}`
  ].join('\n');
  return [
    { kind: 'text', body: text },
    { kind: 'buttons', body: '¿Cómo deseas continuar?', buttons: [
      { id: 'question', title: 'Preguntar' },
      { id: 'evaluation', title: 'Evaluación' },
      { id: 'menu', title: 'Menú' }
    ] }
  ];
}

function discoverList() {
  return {
    kind: 'list',
    body: 'Elige lo que más se parece a lo que quieres mejorar. Esto es orientación inicial, no diagnóstico.',
    buttonText: 'Elegir objetivo',
    sectionTitle: 'Quiero mejorar…',
    rows: [
      { id: 'need:acne', title: 'Acné o secuelas', description: 'Brotes, marcas o cicatrices' },
      { id: 'need:spots', title: 'Manchas', description: 'Quiero revisar manchas de la piel' },
      { id: 'need:rosacea', title: 'Rojez o rosácea', description: 'Piel sensible, rojez o venitas' },
      { id: 'need:rejuvenation', title: 'Rejuvenecimiento', description: 'Arrugas o líneas de expresión' },
      { id: 'need:hair', title: 'Caída del cabello', description: 'Quiero orientación capilar' },
      { id: 'need:body', title: 'Cuerpo', description: 'Medidas, estrías, flacidez o celulitis' },
      { id: 'need:laser', title: 'Depilación láser', description: 'Quiero conocer la opción láser' },
      { id: 'need:tattoo', title: 'Eliminar tatuaje', description: 'Quiero conocer el proceso' },
      { id: 'need:cleansing', title: 'Cuidar mi piel', description: 'Limpieza facial y cuidado general' }
    ]
  };
}

function topicResponse(topic) {
  return [
    { kind: 'text', body: safeGuidance[topic] || 'Puedo darte orientación general, pero la recomendación adecuada requiere una evaluación profesional.' },
    {
      kind: 'buttons',
      body: '¿Cómo deseas continuar?',
      buttons: [
        { id: 'question', title: 'Hacer pregunta' },
        { id: 'evaluation', title: 'Evaluación' },
        { id: 'menu', title: 'Menú' }
      ]
    }
  ];
}

export async function routeMessage(userId, incoming) {
  const session = getSession(userId);
  const text = (incoming.text || '').trim();
  const id = incoming.id || '';
  const normalized = text.toLowerCase();

  if (riskPattern.test(text)) {
    session.mode = 'menu';
    return [
      { kind: 'text', body: 'Lo que describes puede necesitar atención profesional. No puedo valorar la gravedad por WhatsApp. Si los síntomas son intensos o empeoran, busca atención médica inmediata. También puedo ayudarte a contactar al equipo de D’Lorgia.' },
      branchList()
    ];
  }

  if (diagnosisPattern.test(text)) {
    return [
      { kind: 'text', body: 'No puedo diagnosticar ni indicar medicamentos o dosis. Sí puedo darte información general y ayudarte a solicitar una evaluación profesional.' },
      branchList()
    ];
  }

  if (['hola', 'holi', 'buenas', 'inicio', 'start'].includes(normalized) || id === 'menu') {
    resetSession(userId);
    return welcome();
  }

  if (id === 'discover') return [discoverList()];
  if (id === 'treatments') return [treatmentsList()];
  if (id === 'expectations') return [expectationsList()];
  if (id === 'evaluation') return [branchList()];
  if (id === 'followup') return [
    { kind: 'text', body: 'Tu seguimiento puede incluir: revisar indicaciones, registrar dudas, confirmar la evaluación profesional y mantener los cuidados recomendados. Si ya elegiste un tratamiento, puedo ayudarte a continuar con una sede.' },
    { kind: 'buttons', body: '¿Qué deseas hacer?', buttons: [
      { id: 'expectations', title: 'Expectativas' },
      { id: 'evaluation', title: 'Evaluación' },
      { id: 'menu', title: 'Menú' }
    ] }
  ];

  if (id === 'care') {
    session.mode = 'ai';
    session.lastTopic = 'cuidados generales';
    return [{ kind: 'text', body: 'Escribe qué tratamiento o cuidado deseas consultar. Te daré orientación general; para indicaciones personalizadas, te derivaré a evaluación.' }];
  }

  if (id === 'question') {
    session.mode = 'ai';
    return [{ kind: 'text', body: 'Escribe tu pregunta. Responderé con información general de D’Lorgia y te indicaré cuándo corresponde una evaluación profesional.' }];
  }

  if (id === 'skin') return [skinList()];
  if (id === 'body' || id === 'hair' || id === 'laser' || id === 'tattoo') {
    session.lastTopic = id;
    return topicResponse(id);
  }

  if (['acne', 'spots', 'rosacea', 'rejuvenation', 'cleansing'].includes(id)) {
    session.lastTopic = id;
    return topicResponse(id);
  }

  if (id.startsWith('need:')) {
    const topic = id.split(':')[1];
    session.lastTopic = topic;
    return topicResponse(topic);
  }

  if (id.startsWith('expect:')) {
    const treatmentId = id.split(':')[1];
    session.lastTopic = treatmentId;
    return expectationResponse(treatmentId);
  }

  if (id.startsWith('branch:')) {
    const branch = branches[id.split(':')[1]];
    if (!branch) return [mainMenu()];
    session.mode = 'menu';
    return [
      { kind: 'text', body: `Sede ${branch.name}\n📍 ${branch.address}\n📱 WhatsApp: ${branch.displayPhone}\n\nPara una recomendación personalizada, continúa con el equipo de la sede.` },
      { kind: 'link', body: `Abrir WhatsApp de ${branch.name}`, url: `https://wa.me/${branch.phone}?text=${encodeURIComponent('Hola, vengo de D’Lorgia Orienta y deseo solicitar una evaluación.')}` },
      mainMenu()
    ];
  }

  if (session.mode === 'ai' && text) {
    try {
      const answer = await answerWithAI(text, session.lastTopic || 'orientación general');
      if (answer) {
        return [
          { kind: 'text', body: answer },
          { kind: 'buttons', body: '¿Deseas continuar?', buttons: [
            { id: 'evaluation', title: 'Evaluación' },
            { id: 'question', title: 'Otra pregunta' },
            { id: 'menu', title: 'Menú' }
          ] }
        ];
      }
    } catch (error) {
      console.error('[AI ERROR]', error.message);
    }

    return [
      { kind: 'text', body: 'No pude obtener una respuesta del servicio inteligente. Puedo seguir guiándote por el menú o ayudarte a solicitar una evaluación.' },
      mainMenu()
    ];
  }

  if (text) {
    session.mode = 'ai';
    try {
      const answer = await answerWithAI(text, session.lastTopic || 'orientación general');
      if (answer) return [{ kind: 'text', body: answer }, mainMenu()];
    } catch (error) {
      console.error('[AI ERROR]', error.message);
    }
  }

  return welcome();
}

export { mainMenu, welcome };
