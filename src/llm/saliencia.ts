// Saliencia (#36, SPICA): los hechos usados en las opciones que el usuario elige ganan peso y aparecen
// antes en el prompt de opciones. "Otra" y las opciones fijas no tocan nada.
// Al cerrar una conversacion (#39), los hechos no usados en ella decaen hacia 1 (decaerSaliencia).
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

// Decaimiento (#39): al cerrar una conversacion, la saliencia de cada hecho no usado en ella pierde
// esta fraccion de lo que tiene por encima de 1. Desde el tope, 7 conversaciones sin uso la dejan
// por debajo de lo que suma una eleccion.
const DECAIMIENTO = 0.2
// Con un exceso sobre 1 menor a esto, la saliencia vuelve justo a 1.
const EXCESO_MINIMO = 0.01

// Al cerrar la conversacion que empezo en inicio (ISO): los hechos usados en opciones elegidas en
// ella (ultimoUso >= inicio) quedan como estan; el resto decae hacia 1, nunca por debajo. "Otra" y
// las fijas no anotan uso, asi que no salvan a nadie. Lo llama quien cierra, dentro de la fila.
export function decaerSaliencia(hechos: Hecho[], inicio: string): Hecho[] {
  const desde = Date.parse(inicio)
  return hechos.map((h) => {
    const s = salienciaDe(h)
    if (s <= SALIENCIA_INICIAL) return h
    if (h.ultimoUso && Date.parse(h.ultimoUso) >= desde) return h
    const exceso = (s - SALIENCIA_INICIAL) * (1 - DECAIMIENTO)
    return { ...h, saliencia: exceso < EXCESO_MINIMO ? SALIENCIA_INICIAL : SALIENCIA_INICIAL + exceso }
  })
}

// Para quien guarda hechos armados a partir de una lectura vieja (el agente de memoria): la saliencia
// y el ultimo uso salen siempre de la memoria fresca, porque solo los cambian las elecciones y los
// cierres, que pudieron caer mientras tanto. Un hecho que no esta en la fresca queda como vino.
export function conservarUsosNuevos(hechos: Hecho[], frescos: Hecho[]): Hecho[] {
  const porId = new Map(frescos.map((h) => [h.id, h]))
  return hechos.map((h) => {
    const fresco = porId.get(h.id)
    if (!fresco) return h
    const sinUso = { ...h }
    delete sinUso.saliencia
    delete sinUso.ultimoUso
    return {
      ...sinUso,
      ...(fresco.saliencia !== undefined ? { saliencia: fresco.saliencia } : {}),
      ...(fresco.ultimoUso !== undefined ? { ultimoUso: fresco.ultimoUso } : {}),
    }
  })
}
