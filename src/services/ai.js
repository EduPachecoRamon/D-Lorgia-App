import { config } from '../config.js';
import { curatedFacts } from '../data/knowledge.js';
import { orientationCatalog } from '../data/orientation.js';

const INSTRUCTIONS = `
Eres D'Lorgia Orienta, un asistente virtual informativo para un prototipo académico.

REGLAS OBLIGATORIAS:
- Responde en español, con tono claro, breve y profesional.
- Usa solamente la información incluida en CONOCIMIENTO D'LORGIA y el contexto del usuario.
- No diagnostiques enfermedades ni condiciones médicas.
- No prescribas medicamentos, dosis ni tratamientos personalizados.
- No garantices resultados ni número exacto de sesiones.
- Diferencia orientación general de evaluación profesional.
- Si falta información, dilo con claridad y ofrece una evaluación profesional.
- Si el usuario describe dolor intenso, sangrado, dificultad para respirar, desmayo, hinchazón importante, reacción alérgica o empeoramiento preocupante, recomienda atención médica o profesional inmediata según la gravedad.
- Si el usuario pide hablar con una persona, indica que puede continuar con el equipo humano.
- No pidas DNI, fotografías clínicas, antecedentes médicos detallados ni otros datos sensibles por iniciativa propia.
- No inventes precios, promociones, horarios o disponibilidad.

CONOCIMIENTO D'LORGIA:
${curatedFacts}
`;

const riskPattern = /(dolor (muy )?fuerte|sangrado|no puedo respirar|dificultad para respirar|desmayo|hinchaz[oó]n (muy )?(fuerte|importante)|reacci[oó]n al[eé]rgica|pus|fiebre alta|empeora mucho)/i;
const diagnosisPattern = /(diagn[oó]stic|qu[eé] tengo|medicamento|pastilla|dosis|rec[eé]tame|receta|qu[eé] debo tomar)/i;

function normalize(value = '') {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function detectTreatment(userText = '', context = '') {
  const text = normalize(`${context} ${userText}`);
  const aliases = {
    cleansing: ['limpieza', 'facial', 'hydrafacial', 'dermoabrasion'],
    rejuvenation: ['rejuvenecimiento', 'arruga', 'lineas de expresion', 'firmeza facial'],
    acne: ['acne', 'brotes', 'cicatriz', 'secuelas'],
    spots: ['mancha', 'tono desigual', 'pigmentacion'],
    body: ['corporal', 'celulitis', 'estrias', 'medidas', 'flacidez'],
    hair: ['capilar', 'cabello', 'caida'],
    laser: ['depilacion', 'laser', 'vello'],
    tattoo: ['tatuaje', 'tattoo']
  };
  for (const item of orientationCatalog) {
    const terms = [item.id, item.name, ...(aliases[item.id] || [])].map(normalize);
    if (terms.some((term) => term && text.includes(term))) return item;
  }
  return null;
}

function bullets(items = []) {
  return items.map((x) => `• ${x}`).join('\n');
}

export function localAssistantAnswer(userText, context = '') {
  const text = String(userText || '').trim();
  const normalized = normalize(text);

  if (riskPattern.test(text)) {
    return 'Lo que describes puede necesitar atención profesional. No puedo valorar la gravedad por chat. Si los síntomas son intensos, empeoran o incluyen dificultad para respirar, busca atención médica inmediata. También puedes continuar con el equipo profesional de D’Lorgia.';
  }

  if (diagnosisPattern.test(text)) {
    return 'No puedo diagnosticar ni indicar medicamentos o dosis. Sí puedo darte información general sobre los tratamientos y ayudarte a continuar hacia una evaluación profesional.';
  }

  const treatment = detectTreatment(text, context);
  if (treatment) {
    if (/(evaluacion|evaluación|preguntar|consulta profesional)/i.test(text)) {
      return `Para preparar tu evaluación sobre ${treatment.name}, puedes llevar estas preguntas:
• ¿Qué objetivo es realista en mi caso?
• ¿Qué alternativa o protocolo consideran adecuado y por qué?
• ¿Cómo sería la recuperación y qué cuidados tendría?
• ¿Qué factores podrían cambiar el número de sesiones?
• ¿Qué señales justificarían contactar al equipo después?

El asesor te ayuda a prepararte; la indicación final corresponde al profesional.`;
    }
    if (/(cuidado|despues|después|post|posterior)/i.test(text)) {
      return `Cuidados generales después de ${treatment.name}:\n${bullets(treatment.after)}\n\nEstas indicaciones son orientativas; el equipo profesional puede ajustarlas según tu evaluación.`;
    }
    if (/(antes|previo|prepar)/i.test(text)) {
      return `Antes de ${treatment.name}, como orientación general:\n${bullets(treatment.before)}\n\nLa preparación definitiva debe confirmarse con el equipo profesional.`;
    }
    if (/(recuper|tiempo|duracion|duración)/i.test(text)) {
      return `Sobre ${treatment.name}:\n• Recuperación: ${treatment.recovery}\n• Duración/proceso: ${treatment.duration}\n• Resultados: ${treatment.resultWindow}\n\nLos tiempos pueden variar entre personas y deben confirmarse en evaluación.`;
    }
    if (/(sesion|sesión|sesiones|cuantas|cuántas)/i.test(text)) {
      return `Para ${treatment.name}, ${treatment.sessions.toLowerCase()} No es recomendable fijar un número exacto sin una evaluación profesional.`;
    }
    return `${treatment.name}: ${treatment.description}\n\nQué puedes esperar de forma general:\n${bullets(treatment.results)}\n\nRecuperación: ${treatment.recovery}\nSesiones: ${treatment.sessions}\n\nEsta orientación no sustituye una evaluación profesional.`;
  }

  if (/(evaluacion|evaluación|cita|especialista|profesional)/i.test(normalized)) {
    return 'Puedes solicitar una evaluación profesional desde la sección “Evaluación”. Allí eliges la sede y preparas el contacto para continuar por WhatsApp. El equipo confirma disponibilidad y valida el procedimiento adecuado.';
  }

  if (/(tratamiento|opciones|ofrecen|tienen)/i.test(normalized)) {
    return 'D’Lorgia Orienta agrupa opciones de piel, corporal, capilar, depilación láser y eliminación de tatuajes. Puedes elegir una categoría en “Tratamientos” y luego usar la calculadora de expectativas para obtener información orientativa.';
  }

  return 'Puedo orientarte sobre tratamientos, expectativas, recuperación y cuidados generales. Por ejemplo, pregúntame “¿qué puedo esperar de una limpieza facial?” o “¿qué cuidados generales hay después?”. Para una recomendación personalizada, corresponde una evaluación profesional.';
}

function extractGeminiText(data) {
  return (data?.candidates || [])
    .flatMap((candidate) => candidate?.content?.parts || [])
    .map((part) => part?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function geminiModelName() {
  return String(config.geminiModel || 'gemini-3.8-flash').replace(/^models\//, '').trim();
}

export function getAIState() {
  if (config.geminiKey) return { configured: true, provider: 'Gemini', model: geminiModelName(), fallback: true };
  return { configured: false, provider: 'Local', model: 'respuestas de respaldo', fallback: true };
}

export async function answerWithAIDetails(userText, context = '') {
  const local = localAssistantAnswer(userText, context);

  // Seguridad primero: riesgo, diagnóstico y medicación nunca se delegan al modelo.
  if (riskPattern.test(userText) || diagnosisPattern.test(userText)) {
    return { answer: local, source: 'local-safety', model: 'reglas de seguridad' };
  }

  // La app nunca queda inutilizada si no existe una clave externa.
  if (!config.geminiKey) {
    return { answer: local, source: 'local', model: 'respaldo local' };
  }

  const model = geminiModelName();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.geminiKey
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
        contents: [{
          role: 'user',
          parts: [{ text: `Contexto de navegación y personalización: ${context || 'orientación general'}\n\nMensaje del usuario: ${userText}` }]
        }],
        generationConfig: {
          temperature: 0.22,
          maxOutputTokens: 360
        }
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[GEMINI ERROR] ${res.status}`, JSON.stringify(data).slice(0, 1200));
      return { answer: local, source: 'local-fallback', model: 'respaldo local' };
    }

    const answer = extractGeminiText(data);
    if (!answer) return { answer: local, source: 'local-fallback', model: 'respaldo local' };
    return { answer, source: 'gemini', model };
  } catch (error) {
    console.error('[GEMINI NETWORK ERROR]', error?.message || error);
    return { answer: local, source: 'local-fallback', model: 'respaldo local' };
  }
}

export async function answerWithAI(userText, context = '') {
  const result = await answerWithAIDetails(userText, context);
  return result.answer;
}
