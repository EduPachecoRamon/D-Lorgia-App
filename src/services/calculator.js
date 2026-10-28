import { findOrientationTreatment } from '../data/orientation.js';

const goalNotes = {
  cuidado: 'Tu prioridad es comprender el cuidado general y el proceso.',
  textura: 'Tu prioridad es la textura. La evaluación permite definir qué alternativa es compatible con tu piel.',
  manchas: 'Tu prioridad son las manchas. Es importante confirmar su tipo y mantener fotoprotección.',
  firmeza: 'Tu prioridad es la firmeza. Las alternativas y tiempos dependen del procedimiento indicado.',
  lineas: 'Tu prioridad son las líneas de expresión. La respuesta varía según el procedimiento y características individuales.',
  hidratacion: 'Tu prioridad es hidratación y confort. La orientación favorece cuidados suaves y expectativas realistas.',
  brotes: 'Tu prioridad son los brotes. No se recomienda definir un tratamiento personalizado sin evaluación.'
};

export function calculateOrientation({ treatmentId, goal = 'cuidado', sensitivity = 'no_indicado', availability = 'flexible' } = {}) {
  const treatment = findOrientationTreatment(treatmentId);
  if (!treatment) {
    const error = new Error('Tratamiento no encontrado');
    error.code = 'NOT_FOUND';
    throw error;
  }

  const personalization = [];
  if (sensitivity === 'sensible') personalization.push('Mencionaste piel o zona sensible: prioriza cuidados suaves y comunícalo durante la evaluación.');
  if (availability === 'rapida') personalization.push('Buscas una recuperación compatible con tu rutina: confirma los tiempos del procedimiento específico antes de agendar.');

  return {
    generatedAt: new Date().toISOString(),
    treatment: {
      id: treatment.id,
      category: treatment.category,
      name: treatment.name,
      short: treatment.short,
      description: treatment.description,
      objective: treatment.objective
    },
    goal,
    goalNote: goalNotes[goal] || goalNotes.cuidado,
    personalization,
    expectations: {
      resultWindow: treatment.resultWindow,
      recovery: treatment.recovery,
      results: treatment.results,
      sessions: treatment.sessions,
      duration: treatment.duration
    },
    care: { before: treatment.before, after: treatment.after },
    followUp: [
      'Revisar las indicaciones recibidas antes del procedimiento.',
      'Registrar dudas o cambios relevantes para comentarlos con el equipo.',
      'Mantener los cuidados indicados durante la recuperación.',
      'Solicitar seguimiento si necesitas una recomendación individual.'
    ],
    disclaimer: 'Orientación referencial del prototipo. No es diagnóstico, prescripción, cálculo clínico ni garantía de resultados. La recomendación final depende de una evaluación profesional.'
  };
}
