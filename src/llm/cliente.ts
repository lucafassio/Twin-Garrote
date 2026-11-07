import type { Opcion, PedidoOpciones } from '@/eventos'
import type { PedidoEleccion, ResumenElecciones } from './elecciones.ts'

// Opcional: llamar al elegir, sin esperar para avanzar el turno. Nunca rechaza.
export async function registrarEleccion(pedido: PedidoEleccion): Promise<ResumenElecciones | null> {
  try {
    const respuesta = await fetch('/api/elecciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
      signal: AbortSignal.timeout(5000),
    })
    if (!respuesta.ok) return null
    return await respuesta.json() as ResumenElecciones
  } catch {
    return null
  }
}

// Cliente del navegador del path llm. Las firmas de pedirOpciones y completarFrase no cambian:
// los usan nucleo-interfaz y deletrear.
//
// Corte de pedidos viejos (#23): cada funcion cancela su pedido anterior en vuelo cuando arranca uno
// nuevo. Una respuesta vieja nunca se entrega. Hay un solo pedido vigente de cada tipo por pagina:
// si dos partes de la misma pagina llaman a pedirOpciones, se cancelan entre si. Hoy solo la llama el nucleo.

// Lo que rechaza pedirOpciones cuando un pedido mas nuevo lo cancelo. No es una falla: el nucleo
// no tiene que quedar "sin conexion" por esto. Distinguirlo con esPedidoCancelado.
export class PedidoCancelado extends Error {
  constructor() {
    super('Pedido de opciones cancelado por uno mas nuevo')
    this.name = 'PedidoCancelado'
  }
}

export function esPedidoCancelado(error: unknown): boolean {
  return error instanceof Error && error.name === 'PedidoCancelado'
}

const esAbortado = (error: unknown) => error instanceof Error && error.name === 'AbortError'

let opcionesEnVuelo: AbortController | null = null

// Pide las opciones a /api/opciones. Si falla, tira error y el nucleo queda "sin conexion" con las
// opciones fijas. Si lo cancela un pedido mas nuevo, tira PedidoCancelado.
export async function pedirOpciones(pedido: PedidoOpciones): Promise<Opcion[]> {
  opcionesEnVuelo?.abort()
  const control = new AbortController()
  opcionesEnVuelo = control
  try {
    const respuesta = await fetch('/api/opciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedido),
      signal: control.signal,
    })
    const datos = await respuesta.json().catch(() => null)
    if (control.signal.aborted) throw new PedidoCancelado()
    if (!respuesta.ok || !datos || !Array.isArray(datos.opciones)) {
      throw new Error(datos?.error ?? `Fallo /api/opciones (${respuesta.status})`)
    }
    return datos.opciones as Opcion[]
  } catch (error) {
    if (control.signal.aborted || esAbortado(error)) throw new PedidoCancelado()
    throw error
  } finally {
    if (opcionesEnVuelo === control) opcionesEnVuelo = null
  }
}

let completadoVigente: { control: AbortController; frase: Promise<string> } | null = null

// Completado para deletrear (avisado en #6): una frase entera a partir de lo que lleva deletreado.
// Nunca tira: si falla el fetch o la ruta, devuelve el prefijo tal cual.
// Un completado cancelado por uno mas nuevo devuelve la frase del vigente, nunca la suya vieja: puede no
// empezar con el prefijo que mando el que llamo, y resuelve recien cuando termina el vigente.
export function completarFrase(prefijo: string, pedido: PedidoOpciones): Promise<string> {
  completadoVigente?.control.abort()
  const control = new AbortController()
  const propia = pedirCompletado(prefijo, pedido, control.signal)
  const frase: Promise<string> = propia.then((resultado) => {
    if (!control.signal.aborted) return resultado
    // Lo cancelo uno mas nuevo: entrega lo que entregue el vigente (que a su vez puede cancelarse).
    return completadoVigente ? completadoVigente.frase : prefijo
  })
  completadoVigente = { control, frase }
  return frase
}

async function pedirCompletado(prefijo: string, pedido: PedidoOpciones, signal: AbortSignal): Promise<string> {
  try {
    const respuesta = await fetch('/api/completar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefijo, pedido }),
      signal,
    })
    const datos = await respuesta.json().catch(() => null)
    if (!respuesta.ok || !datos || typeof datos.frase !== 'string' || datos.frase.trim() === '') return prefijo
    return datos.frase
  } catch {
    return prefijo
  }
}
