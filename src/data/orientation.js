export const orientationCatalog = [
  {
    id: 'cleansing', category: 'Piel', name: 'Limpieza facial', short: 'Higiene y cuidado de la superficie de la piel.',
    description: 'Orientación general para comprender una limpieza facial, sus objetivos, cuidados y recuperación esperada.',
    objective: 'Higiene, confort y cuidado superficial de la piel.',
    duration: 'La duración depende del protocolo elegido y de la evaluación profesional.',
    recovery: 'La recuperación suele ser corta; puede existir sensibilidad o enrojecimiento transitorio.',
    resultWindow: 'Los cambios visibles y la sensación de limpieza pueden apreciarse de forma progresiva; la respuesta varía entre personas.',
    sessions: 'El número de sesiones se confirma después de evaluar el estado de la piel.',
    results: ['Sensación de piel más limpia y fresca.', 'Mejor apariencia superficial y apoyo a una rutina de cuidado.', 'La respuesta depende del estado inicial de la piel y del protocolo.'],
    before: ['Informar sensibilidad, lesiones activas o productos irritantes.', 'Evitar experimentar con productos agresivos justo antes de la atención.', 'Seguir las indicaciones previas del equipo.'],
    after: ['Mantener limpieza e hidratación suaves.', 'Usar fotoprotección según la indicación profesional.', 'Evitar exfoliantes, ácidos u otros activos irritantes si existe sensibilidad.', 'Consultar al equipo si aparece una reacción que preocupe.'],
    goals: ['cuidado', 'textura', 'hidratacion']
  },
  {
    id: 'rejuvenation', category: 'Piel', name: 'Rejuvenecimiento facial', short: 'Orientación sobre textura, firmeza y líneas de expresión.',
    description: 'Alternativas no quirúrgicas de rejuvenecimiento cuya elección depende de objetivos, características de la piel y evaluación profesional.',
    objective: 'Mejorar de forma progresiva textura, firmeza o apariencia de líneas.',
    duration: 'Depende de la tecnología o protocolo seleccionado.',
    recovery: 'Variable: algunos procedimientos permiten continuar actividades pronto y otros requieren cuidados específicos.',
    resultWindow: 'La evolución suele ser progresiva y depende del procedimiento seleccionado.',
    sessions: 'Se define después de la evaluación y según el protocolo.',
    results: ['La evolución es progresiva.', 'El objetivo puede centrarse en textura, firmeza o líneas de expresión.', 'No se garantizan resultados individuales sin evaluación.'],
    before: ['Definir qué aspecto deseas mejorar.', 'Informar antecedentes o sensibilidad relevantes durante la evaluación.'],
    after: ['Seguir las indicaciones específicas del procedimiento.', 'Mantener fotoprotección y una rutina compatible con el tratamiento.'],
    goals: ['textura', 'firmeza', 'lineas']
  },
  {
    id: 'acne', category: 'Piel', name: 'Acné y secuelas', short: 'Orientación para brotes, marcas, cicatrices y poros.',
    description: 'La actividad del acné y el tipo de secuela deben evaluarse antes de definir una alternativa.',
    objective: 'Orientar sobre objetivos de control, textura y apariencia de secuelas.',
    duration: 'Variable según el objetivo y el protocolo indicado.', recovery: 'Depende de la tecnología y de la respuesta individual.',
    resultWindow: 'Los cambios son progresivos y requieren seguimiento profesional.', sessions: 'Variable; debe definirse en evaluación.',
    results: ['Los objetivos pueden incluir control, textura o apariencia de secuelas.', 'El plan se ajusta según evaluación profesional.'],
    before: ['No manipular lesiones.', 'Informar productos o tratamientos actuales durante la evaluación.'],
    after: ['Seguir las indicaciones profesionales.', 'Evitar automedicación o cambios agresivos de rutina.'], goals: ['brotes', 'textura']
  },
  {
    id: 'spots', category: 'Piel', name: 'Manchas', short: 'Orientación sobre manchas y tono desigual.',
    description: 'Las manchas pueden tener diferentes causas; la evaluación ayuda a determinar un enfoque apropiado.', objective: 'Orientar sobre alternativas para mejorar progresivamente la apariencia del tono.',
    duration: 'Variable según causa, profundidad y protocolo.', recovery: 'Depende del procedimiento seleccionado.', resultWindow: 'La mejoría es progresiva y requiere seguimiento y fotoprotección.', sessions: 'Se determina después de evaluar el tipo de mancha.',
    results: ['El objetivo es mejorar progresivamente la apariencia del tono.', 'La fotoprotección forma parte importante del acompañamiento.'],
    before: ['Evitar despigmentantes fuertes sin indicación.', 'Comentar los productos que ya se utilizan.'], after: ['Priorizar fotoprotección.', 'Seguir el protocolo indicado por el equipo.'], goals: ['manchas', 'textura']
  },
  {
    id: 'body', category: 'Corporal', name: 'Tratamientos corporales', short: 'Orientación sobre medidas, celulitis, estrías y flacidez.',
    description: 'Los protocolos corporales dependen del objetivo, características individuales y evaluación.', objective: 'Comprender alternativas corporales y expectativas antes de una evaluación.', duration: 'Depende del protocolo y zona tratada.', recovery: 'Variable según tecnología y procedimiento.', resultWindow: 'Los resultados suelen valorarse de forma progresiva y dependen del protocolo.', sessions: 'A confirmar después de la evaluación.',
    results: ['Los objetivos pueden variar entre medidas, apariencia de celulitis, estrías o firmeza.', 'La respuesta individual puede variar.'], before: ['Definir el objetivo principal.', 'Informar condiciones relevantes al profesional.'], after: ['Seguir indicaciones del procedimiento.', 'Mantener el seguimiento recomendado.'], goals: ['firmeza', 'cuidado']
  },
  {
    id: 'hair', category: 'Capilar', name: 'Orientación capilar', short: 'Información inicial sobre caída y cuidado capilar.',
    description: 'La causa de la caída debe evaluarse antes de elegir una técnica o protocolo.', objective: 'Orientar y preparar una evaluación capilar.', duration: 'Variable según técnica y plan.', recovery: 'Depende del procedimiento seleccionado.', resultWindow: 'La evolución capilar requiere valoración progresiva.', sessions: 'Se define tras la evaluación profesional.',
    results: ['El plan depende de la causa y del estado capilar.', 'No se recomienda prometer resultados sin evaluación.'], before: ['Registrar dudas y antecedentes relevantes.', 'Evitar iniciar tratamientos por cuenta propia.'], after: ['Seguir el plan indicado.', 'Comunicar cambios relevantes al equipo.'], goals: ['cuidado']
  },
  {
    id: 'laser', category: 'Depilación', name: 'Depilación láser', short: 'Orientación sobre depilación láser y cuidados generales.',
    description: 'La evaluación previa ayuda a definir parámetros, zonas y expectativas.', objective: 'Conocer el proceso y cuidados generales antes de una evaluación.', duration: 'Depende de la zona y del protocolo.', recovery: 'Puede existir sensibilidad temporal.', resultWindow: 'La reducción del vello se evalúa progresivamente durante el proceso.', sessions: 'El número orientativo se confirma en evaluación.',
    results: ['La respuesta varía según zona y características individuales.', 'La evaluación ayuda a establecer expectativas realistas.'], before: ['Seguir instrucciones previas de la sede.', 'Informar sensibilidad o reacciones previas.'], after: ['Evitar irritación de la zona.', 'Seguir fotoprotección y cuidados indicados.'], goals: ['cuidado']
  },
  {
    id: 'tattoo', category: 'Tatuajes', name: 'Eliminación de tatuajes', short: 'Orientación previa sobre el proceso de eliminación.',
    description: 'El proceso depende de pigmento, tamaño, profundidad y respuesta individual.', objective: 'Comprender el proceso, sus límites y cuidados antes de una evaluación.', duration: 'Proceso progresivo; requiere evaluación individual.', recovery: 'Depende del procedimiento y de la respuesta de la zona.', resultWindow: 'La evolución se valora por etapas y puede requerir varias sesiones.', sessions: 'A definir tras evaluar las características del tatuaje.',
    results: ['La eliminación puede requerir varias etapas.', 'No se puede prometer el mismo resultado para todos los tatuajes.'], before: ['No manipular la zona.', 'Informar antecedentes relevantes durante la evaluación.'], after: ['Seguir cuidados locales indicados.', 'Consultar ante una reacción preocupante.'], goals: ['cuidado']
  }
];

export const orientationGoals = [
  { id: 'cuidado', label: 'Cuidado general' },
  { id: 'textura', label: 'Mejorar textura' },
  { id: 'manchas', label: 'Apariencia de manchas' },
  { id: 'firmeza', label: 'Firmeza' },
  { id: 'lineas', label: 'Líneas de expresión' },
  { id: 'hidratacion', label: 'Hidratación / confort' },
  { id: 'brotes', label: 'Brotes / acné' }
];

export function findOrientationTreatment(id) {
  return orientationCatalog.find((item) => item.id === id) || null;
}
