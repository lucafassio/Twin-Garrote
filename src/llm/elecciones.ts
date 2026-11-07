import type { Cercania, Opcion, TipoTurno } from '@/eventos'

export type Eleccion = 1 | 2 | 3 | 4 | 'si' | 'no' | 'espera' | 'otra'
export type PedidoEleccion = {
  opciones: (Opcion & { idsHechos?: string[] })[]
  eleccion: Eleccion
  turno: string | null
  cercania: Cercania | null
  interlocutor?: string
  tipoTurno?: TipoTurno
}
export type RegistroEleccion = PedidoEleccion & { hora: string }
export type AlmacenElecciones = {
  agregar(registro: RegistroEleccion): Promise<void>
  leer(): Promise<RegistroEleccion[]>
}

export type ResumenElecciones = {
  total: number
  posiciones: [number, number, number, number]
  tasaOtra: number
  tasaFijas: number
  posicionMedia: number | null
}

export async function resumirElecciones(almacen: AlmacenElecciones): Promise<ResumenElecciones> {
  const registros = await almacen.leer()
  const posiciones: ResumenElecciones['posiciones'] = [0, 0, 0, 0]
  let otras = 0
  let fijas = 0
  let suma = 0
  let opciones = 0
  for (const { eleccion } of registros) {
    if (typeof eleccion === 'number') {
      posiciones[eleccion - 1]++
      suma += eleccion
      opciones++
    } else if (eleccion === 'otra') otras++
    else fijas++
  }
  return {
    total: registros.length, posiciones,
    tasaOtra: registros.length ? otras / registros.length : 0,
    tasaFijas: registros.length ? fijas / registros.length : 0,
    posicionMedia: opciones ? suma / opciones : null,
  }
}

export function crearAlmacenEleccionesEnMemoria(): AlmacenElecciones {
  const registros: RegistroEleccion[] = []
  return {
    async agregar(registro) { registros.push(structuredClone(registro)) },
    async leer() { return structuredClone(registros) },
  }
}

export class EleccionInvalida extends Error {
  constructor() { super('Eleccion invalida') }
}

function esPedidoEleccion(valor: unknown): valor is PedidoEleccion {
  if (!valor || typeof valor !== 'object') return false
  const p = valor as Record<string, unknown>
  if (![1, 2, 3, 4, 'si', 'no', 'espera', 'otra'].includes(p.eleccion as Eleccion)) return false
  if (p.turno !== null && typeof p.turno !== 'string') return false
  if (p.cercania !== null && !['familia', 'conocido', 'formal'].includes(p.cercania as string)) return false
  if (p.interlocutor !== undefined && typeof p.interlocutor !== 'string') return false
  if (p.tipoTurno !== undefined && !['siNo', 'abierta', 'comentario', 'saludo', 'pedido', 'otro'].includes(p.tipoTurno as string)) return false
  if (!Array.isArray(p.opciones)) return false
  // Las fijas siguen disponibles si fallo el LLM o todavia no hay opciones.
  if (p.opciones.length !== 4 && !(p.opciones.length === 0 && typeof p.eleccion === 'string')) return false
  return p.opciones.every((o: unknown) => {
    if (!o || typeof o !== 'object') return false
    const opcion = o as Record<string, unknown>
    return typeof opcion.texto === 'string' && ['aceptar', 'rechazar', 'preguntar', 'otra'].includes(opcion.intencion as string)
      && (opcion.idsHechos === undefined || (Array.isArray(opcion.idsHechos) && opcion.idsHechos.every((id) => typeof id === 'string')))
  })
}

export async function registrarEleccion(almacen: AlmacenElecciones, pedido: unknown, ahora = new Date()) {
  if (!esPedidoEleccion(pedido)) throw new EleccionInvalida()
  const { opciones, eleccion, turno, cercania, interlocutor, tipoTurno } = structuredClone(pedido)
  await almacen.agregar({ opciones, eleccion, turno, cercania,
    ...(interlocutor !== undefined ? { interlocutor } : {}),
    ...(tipoTurno !== undefined ? { tipoTurno } : {}), hora: ahora.toISOString(),
  })
  return resumirElecciones(almacen)
}
