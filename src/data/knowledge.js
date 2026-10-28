export const branches = {
  huancayo: {
    name: 'Huancayo',
    phone: '51915026618',
    displayPhone: '915 026 618',
    address: 'Jr. Panamá 245, 1er piso, entre Puno y Breña, Huancayo, Perú'
  },
  piura: {
    name: 'Piura',
    phone: '51928302781',
    displayPhone: '928 302 781',
    address: 'Piura, Perú'
  },
  pucallpa: {
    name: 'Pucallpa',
    phone: '51982435588',
    displayPhone: '982 435 588',
    address: 'Pasaje Julio C. Tello 198, Pucallpa, Perú'
  }
};

export const treatmentCategories = [
  { id: 'skin', title: 'Piel', description: 'Acné, manchas, rojez, rejuvenecimiento y cuidado facial' },
  { id: 'body', title: 'Corporal', description: 'Reducción de medidas, estrías, celulitis y flacidez' },
  { id: 'hair', title: 'Capilar', description: 'Caída del cabello y regeneración capilar' },
  { id: 'laser', title: 'Depilación láser', description: 'Orientación sobre depilación láser' },
  { id: 'tattoo', title: 'Eliminación de tatuajes', description: 'Orientación y evaluación previa' }
];

export const skinOptions = [
  { id: 'acne', title: 'Acné y secuelas', description: 'Brotes, marcas, cicatrices y poros' },
  { id: 'spots', title: 'Manchas', description: 'Orientación sobre manchas y evaluación' },
  { id: 'rosacea', title: 'Rosácea y rojez', description: 'Rojez, venitas y piel sensible' },
  { id: 'rejuvenation', title: 'Rejuvenecimiento', description: 'Arrugas y líneas de expresión' },
  { id: 'cleansing', title: 'Limpieza facial', description: 'Limpieza profunda y cuidado de la piel' }
];

export const curatedFacts = `
D'Lorgia se presenta como un Centro Integral de Bienestar y Transformación con sedes en Huancayo, Piura y Pucallpa.
Sus categorías públicas incluyen tratamientos para la piel, tratamientos corporales, tratamientos capilares, depilación láser y eliminación de tatuajes.
En tratamientos para la piel publica opciones relacionadas con acné y secuelas, manchas, rosácea/rojez, rejuvenecimiento y cuidado de piel, incluyendo limpieza facial profunda, dermoabrasión, HydraFacial y peeling ultrasónico.
En corporal publica reducción de medidas, estrías, celulitis, flacidez y protocolos de glúteos, además de tecnologías como radiofrecuencia, cavitación, lipoláser, criolipólisis, BodySculpt y presoterapia.
En capilar publica técnicas como PRP, mesoterapia, fototerapia, oxigenación y carboxiterapia; cualquier tratamiento concreto debe ser confirmado por una especialista.
D'Lorgia indica que antes de recomendar un tratamiento busca entender qué necesita la persona y que la evaluación profesional es parte del proceso.
La web ofrece diagnóstico/orientación online y evaluación integral, pero el bot NO debe diagnosticar ni sustituir a un profesional.
Sedes y WhatsApp: Huancayo 915 026 618; Piura 928 302 781; Pucallpa 982 435 588.
`;

export const safeGuidance = {
  acne: 'D’Lorgia trabaja casos de acné activo y secuelas. La elección de tecnología y número de sesiones depende de una evaluación profesional.',
  spots: 'D’Lorgia ofrece orientación y tratamientos para manchas. La causa y el protocolo adecuado deben confirmarse en evaluación.',
  rosacea: 'Para rojez o rosácea, D’Lorgia publica alternativas como láser vascular e IPL; la indicación depende de la evaluación de la piel.',
  rejuvenation: 'D’Lorgia ofrece alternativas de rejuvenecimiento no quirúrgico. El plan adecuado depende de objetivos, piel y evaluación profesional.',
  cleansing: 'D’Lorgia publica opciones de cuidado facial como limpieza profunda, dermoabrasión, HydraFacial y peeling ultrasónico. La alternativa adecuada depende del estado de la piel.',
  body: 'D’Lorgia ofrece opciones corporales orientadas a reducción de medidas, estrías, celulitis y flacidez. La selección del protocolo requiere evaluación.',
  hair: 'D’Lorgia ofrece evaluación capilar y técnicas como PRP, mesoterapia, fototerapia, oxigenación y carboxiterapia. La causa de la caída debe evaluarse antes de recomendar un plan.',
  laser: 'D’Lorgia ofrece depilación láser para distintas zonas. La evaluación previa permite definir parámetros y número orientativo de sesiones.',
  tattoo: 'D’Lorgia ofrece eliminación de tatuajes. El proceso depende de características como pigmento, profundidad, tamaño y respuesta individual, por lo que requiere evaluación.'
};
