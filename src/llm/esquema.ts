// JSON Schema de la respuesta del modelo, para la salida estructurada de los proveedores reales.
// Tiene que coincidir con lo que interpreta opciones.ts.
export const ESQUEMA_RESPUESTA = {
  type: 'object',
  properties: {
    opciones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          intencion: { type: 'string', enum: ['aceptar', 'rechazar', 'preguntar', 'otra'] },
          texto: { type: 'string' },
          // Ids cortos (h1, h2...) de los hechos del prompt que uso la opcion; vacia si ninguno.
          hechos: { type: 'array', items: { type: 'string' } },
        },
        required: ['intencion', 'texto', 'hechos'],
        additionalProperties: false,
      },
    },
    registro: { type: 'string', enum: ['formal', 'casual', 'intimo'] },
    nuevaConversacion: { type: 'boolean' },
  },
  required: ['opciones', 'registro', 'nuevaConversacion'],
  additionalProperties: false,
} as const

// Pocas opciones cortas: alcanza con poco y corta antes si el modelo se va de largo.
export const MAX_TOKENS = 400
