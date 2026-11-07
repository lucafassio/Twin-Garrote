// Estimacion del tamano de un prompt en tokens, sin llamar al proveedor. Sirve para vigilar el umbral
// de ~4.000 tokens del prompt de opciones que activa el modelo de decision (ADR 0001).

// ~2,3 caracteres por token, calibrado con count_tokens de Anthropic sobre el prompt de opciones
// (espanol con tildes y markdown rinde menos que los ~4 del ingles). Erra por menos de un 3%.
export function estimarTokens(texto: string): number {
  return Math.round(texto.length / 2.3)
}
