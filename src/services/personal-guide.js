import { orientationCatalog, orientationGoals } from '../data/orientation.js';

const GUIDE_STYLES = {
  clara: {
    id: 'clara', name: 'Clara', label: 'Directa',
    intro: 'Voy al punto: ordeno tus prioridades y te muestro caminos para explorar.'
  },
  alma: {
    id: 'alma', name: 'Alma', label: 'Acompañante',
    intro: 'Vamos paso a paso: primero entendemos qué buscas y luego revisamos opciones con calma.'
  },
  nexo: {
    id: 'nexo', name: 'Nexo', label: 'Analítico',
    intro: 'Comparo tus preferencias con el catálogo y explico por qué cada opción aparece.'
  }
};

// Metadatos de experiencia del prototipo. No representan indicaciones clínicas.
const EXPERIENCE_PROFILE = {
  cleansing:    { recovery: 3, intensity: 1 },
  rejuvenation: { recovery: 2, intensity: 2 },
  acne:         { recovery: 2, intensity: 2 },
  spots:        { recovery: 2, intensity: 2 },
  body:         { recovery: 2, intensity: 2 },
  hair:         { recovery: 2, intensity: 1 },
  laser:        { recovery: 2, intensity: 2 },
  tattoo:       { recovery: 1, intensity: 3 }
};

const AREA_LABELS = {
  Todas: 'Aún no tengo un área definida',
  Piel: 'Piel / rostro',
  Corporal: 'Cuerpo',
  Capilar: 'Cabello',
  'Depilación': 'Depilación',
  Tatuajes: 'Tatuajes'
};

const PRIORITY_LABELS = {
  resultados: 'Entender resultados posibles',
  recuperacion: 'Recuperación compatible con mi rutina',
  baja_intervencion: 'Menor intervención posible',
  cuidados: 'Cuidados claros',
  acompanamiento: 'Acompañamiento y continuidad'
};

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function goalLabel(goal) { return orientationGoals.find((x) => x.id === goal)?.label || 'Cuidado general'; }
function profileFor(id) { return EXPERIENCE_PROFILE[id] || { recovery: 2, intensity: 2 }; }

function recoveryScore(preference, value) {
  if (preference === 'sin_pausa') return value === 3 ? 12 : value === 2 ? 6 : 0;
  if (preference === 'corta') return value === 3 ? 11 : value === 2 ? 9 : 3;
  return 5;
}

function intensityScore(preference, value) {
  if (preference === 'minima') return value === 1 ? 12 : value === 2 ? 6 : 0;
  if (preference === 'intermedia') return value === 2 ? 10 : 5;
  return 5;
}

function affinityLabel(score) {
  if (score >= 88) return 'Muy alta';
  if (score >= 72) return 'Alta';
  if (score >= 54) return 'Media';
  return 'Exploratoria';
}

function buildReasoning(treatment, input) {
  const meta = profileFor(treatment.id);
  const reasons = [];
  if (input.area && input.area !== 'Todas' && treatment.category === input.area) reasons.push(`Está dentro del área que elegiste: ${AREA_LABELS[input.area] || input.area}.`);
  if (treatment.goals?.includes(input.goal)) reasons.push(`Su ficha contempla el objetivo “${goalLabel(input.goal)}”.`);
  if (input.recovery === 'sin_pausa' && meta.recovery === 3) reasons.push('Su ficha general es compatible con una recuperación habitualmente corta.');
  else if (input.recovery === 'corta' && meta.recovery >= 2) reasons.push('Puede explorarse cuando la recuperación es una prioridad, confirmando tiempos en evaluación.');
  if (input.intensity === 'minima' && meta.intensity === 1) reasons.push('Coincide con tu preferencia por explorar alternativas de menor intervención.');
  if (input.priorities?.includes('cuidados')) reasons.push('La app puede mostrarte cuidados previos y posteriores antes de que decidas continuar.');
  if (input.priorities?.includes('acompanamiento')) reasons.push('Puede continuar hacia Asesor, Evaluación y Seguimiento sin perder tu contexto.');
  if (input.treatmentId === treatment.id) reasons.push('Ya habías señalado este tratamiento como una opción que querías comparar.');
  return reasons.slice(0, 4);
}

function buildConsiderations(treatment, input) {
  const items = [treatment.recovery];
  if (input.sensitivity === 'sensible') items.push('Indicaste sensibilidad: comunícala durante la evaluación antes de elegir un procedimiento.');
  if (input.area === 'Todas') items.push('Como aún no definiste un área, esta coincidencia es más exploratoria y conviene comparar alternativas.');
  items.push('La compatibilidad de la app organiza preferencias; no determina idoneidad clínica.');
  return items.slice(0, 3);
}

function scoreTreatment(treatment, input) {
  const meta = profileFor(treatment.id);
  let score = 8; // base: todas las fichas son explorables dentro del catálogo.

  if (input.area && input.area !== 'Todas') score += treatment.category === input.area ? 28 : -10;
  else score += 6;

  if (input.goal) score += treatment.goals?.includes(input.goal) ? 25 : 0;
  score += recoveryScore(input.recovery, meta.recovery);
  score += intensityScore(input.intensity, meta.intensity);

  const priorities = new Set(input.priorities || []);
  if (priorities.has('resultados') && treatment.goals?.includes(input.goal)) score += 4;
  if (priorities.has('recuperacion')) score += Math.round(recoveryScore(input.recovery, meta.recovery) * 0.3);
  if (priorities.has('baja_intervencion') && meta.intensity === 1) score += 5;
  if (priorities.has('cuidados')) score += 2;
  if (priorities.has('acompanamiento')) score += 2;
  if (input.treatmentId === treatment.id) score += 8;

  return clamp(score, 0, 100);
}

function normalizeInput(input = {}) {
  const style = GUIDE_STYLES[input.guideStyle] ? input.guideStyle : 'alma';
  const area = Object.hasOwn(AREA_LABELS, input.area) ? input.area : 'Todas';
  const validGoal = orientationGoals.some((x) => x.id === input.goal) ? input.goal : 'cuidado';
  const priorities = [...new Set(Array.isArray(input.priorities) ? input.priorities : [])]
    .filter((x) => Object.hasOwn(PRIORITY_LABELS, x)).slice(0, 3);
  return {
    guideStyle: style,
    area,
    goal: validGoal,
    priorities,
    recovery: ['sin_pausa', 'corta', 'flexible'].includes(input.recovery) ? input.recovery : 'flexible',
    intensity: ['minima', 'intermedia', 'abierta'].includes(input.intensity) ? input.intensity : 'abierta',
    sensitivity: ['no_indicado', 'normal', 'sensible'].includes(input.sensitivity) ? input.sensitivity : 'no_indicado',
    treatmentId: orientationCatalog.some((x) => x.id === input.treatmentId) ? input.treatmentId : ''
  };
}

export function buildPersonalGuide(input = {}) {
  const normalized = normalizeInput(input);
  const guide = GUIDE_STYLES[normalized.guideStyle];
  const ranked = orientationCatalog
    .map((treatment) => ({ treatment, score: scoreTreatment(treatment, normalized) }))
    .sort((a, b) => b.score - a.score || a.treatment.name.localeCompare(b.treatment.name, 'es'))
    .slice(0, 3)
    .map(({ treatment, score }, index) => ({
      rank: index + 1,
      id: treatment.id,
      name: treatment.name,
      category: treatment.category,
      short: treatment.short,
      affinity: affinityLabel(score),
      score,
      reasons: buildReasoning(treatment, normalized),
      considerations: buildConsiderations(treatment, normalized)
    }));

  const caution = normalized.sensitivity === 'sensible'
    ? 'Marcaste sensibilidad. El Orientador no usa ese dato para diagnosticar ni descartar tratamientos; lo conserva para que lo comuniques en la evaluación.'
    : 'El Orientador compara preferencias declaradas con información general del catálogo y conserva la decisión clínica para la evaluación profesional.';

  return {
    generatedAt: new Date().toISOString(),
    guide,
    profile: {
      area: normalized.area,
      areaLabel: AREA_LABELS[normalized.area],
      goal: normalized.goal,
      goalLabel: goalLabel(normalized.goal),
      priorities: normalized.priorities,
      priorityLabels: normalized.priorities.map((x) => PRIORITY_LABELS[x]),
      recovery: normalized.recovery,
      intensity: normalized.intensity,
      sensitivity: normalized.sensitivity,
      treatmentId: normalized.treatmentId
    },
    matches: ranked,
    caution,
    disclaimer: 'Afinidad orientativa del prototipo: organiza tus preferencias para ayudarte a explorar opciones. No es diagnóstico, prescripción, selección clínica ni garantía de resultados.'
  };
}

export { GUIDE_STYLES };
