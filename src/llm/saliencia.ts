// Saliencia (#36, SPICA): los hechos usados en las opciones que el usuario elige ganan peso y aparecen
// antes en el prompt de opciones. "Otra" y las opciones fijas no tocan nada.
// El decaimiento al cerrar una conversacion es de #39: los usados en ella tienen ultimoUso >= su inicio.
import type { Almacen, Hecho } from './tipos.ts'
import { enFila } from './fila.ts'

// Las opciones fijas que se pueden elegir (las del nucleo, sin "Otra", que va aparte).
export const FIJAS = ['si', 'no', 'espera', 'deletrear', 'repetir', 'urgencia'] as const
export type Fija = (typeof FIJAS)[number]

// Lo que eligio el usuario entre lo que tenia en pantalla. Solo una opcion del LLM toca la saliencia.
// Pensado para que el registro de elecciones (#19) lo extienda con posicion, hora y cercania.
export type Eleccion = { tipo: 'opcion'; texto: string } | { tipo: 'otra' } | { tipo: 'fija'; fija: Fija }

export function esEleccion(x: unknown): x is Eleccion {
  if (typeof x !== 'object' || x === null) return false
  const e = x as Record<string, unknown>
  if (e.tipo === 'opcion') return typeof e.texto === 'string'
  if (e.tipo === 'otra') return true
  return e.tipo === 'fija' && (FIJAS as readonly unknown[]).includes(e.fija)
}

// Cuantas opciones mostradas se guardan (3 vueltas de "Otra").
export const MAX_MOSTRADAS = 12

export const SALIENCIA_INICIAL = 1
export const SALIENCIA_TOPE = 2 // un hecho muy elegido llega a pesar el doble que su importancia
export const PASO_SALIENCIA = 0.25 // cuatro elecciones para llegar al tope

// Una memoria vieja sin saliencia se lee como recien cargada.
export const salienciaDe = (h: Hecho) => h.saliencia ?? SALIENCIA_INICIAL

// Peso de un hecho para ordenar el prompt, antes de sumar la coincidencia con el turno.
export const pesoDe = (h: Hecho) => h.importancia * salienciaDe(h)

// Registra lo que eligio el usuario. Si es una de las ultimas opciones mostradas, sus hechos activos
// suben de saliencia hasta el tope y anotan su ultimo uso. Devuelve los ids que subieron.
// Un texto que no esta entre las mostradas (deletreado, de hace muchas vueltas) no toca nada. Si el
// mismo texto salio en dos vueltas, cuenta la mas nueva.
// En la fila del almacen: no pisa lo que guardan opciones, el cierre o el agente de memoria.
export async function registrarEleccion(almacen: Almacen, eleccion: Eleccion, ahora: Date = new Date()): Promise<string[]> {
  if (eleccion.tipo !== 'opcion') return []
  return enFila(almacen, async () => {
    const memoria = await almacen.leerMemoria()
    const mostrada = memoria.conversacion?.mostradas?.find((o) => o.texto === eleccion.texto)
    if (!mostrada || mostrada.hechos.length === 0) return []
    const iso = ahora.toISOString()
    const subidos: string[] = []
    for (const h of memoria.hechos) {
      if (h.estado !== 'activo' || !mostrada.hechos.includes(h.id)) continue
      h.saliencia = Math.min(SALIENCIA_TOPE, salienciaDe(h) + PASO_SALIENCIA)
      h.ultimoUso = iso
      subidos.push(h.id)
    }
    if (subidos.length > 0) await almacen.guardarMemoria(memoria)
    return subidos
  })
}

// Para quien guarda hechos armados a partir de una lectura vieja (el agente de memoria): conserva la
// saliencia y el ultimo uso de las elecciones registradas mientras tanto en la memoria fresca. Solo
// gana lo fresco si tiene un uso mas nuevo: asi un cambio propio del que guarda (un decaimiento) vale.
export function conservarUsosNuevos(hechos: Hecho[], frescos: Hecho[]): Hecho[] {
  const porId = new Map(frescos.map((h) => [h.id, h]))
  return hechos.map((h) => {
    const fresco = porId.get(h.id)
    if (!fresco?.ultimoUso || (h.ultimoUso && Date.parse(h.ultimoUso) >= Date.parse(fresco.ultimoUso))) return h
    return { ...h, saliencia: salienciaDe(fresco), ultimoUso: fresco.ultimoUso }
  })
}
