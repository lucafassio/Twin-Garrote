// Ultimas lineas de la charla para el mensaje de urgencia al contacto.
// Vive fuera de iniciarVoz: si la voz se vuelve a montar (Detener/Empezar, recarga en caliente
// de Next, cambio de pagina) el contexto no se pierde.

import type { LineaHistorial } from '@/eventos'

const LINEAS_CONTEXTO = 5

const lineas: LineaHistorial[] = []
let enCurso = '' // lo que el interlocutor estaba diciendo y todavia no cerro como turno

export function anotarLinea(linea: LineaHistorial) {
  lineas.push(linea)
  if (lineas.length > LINEAS_CONTEXTO) lineas.shift()
}

export function anotarEnCurso(texto: string) {
  enCurso = texto
}

export function contextoCharla(nombre: string): string {
  const texto = lineas.map((l) => `- ${l.quien === 'usuario' ? nombre : 'Interlocutor'}: ${l.texto}`)
  if (enCurso) texto.push(`- Interlocutor (a medias): ${enCurso}`)
  return texto.join('\n')
}
