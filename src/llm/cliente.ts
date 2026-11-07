import type { LineaHistorial, Opcion, PedidoOpciones } from '@/eventos'

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

// Cierre explicito de la conversacion (#25): el nucleo lo llama al detenerse, para que lo hablado
// antes de apagar llegue a la memoria. Manda el historial por si trae lineas que el servidor todavia
// no guardo (la ultima respuesta). El agente de memoria corre en el servidor, no se lo espera.
// Nunca tira: devuelve true si habia una conversacion con lineas y se cerro.
// keepalive: el pedido sigue aunque la pagina se este cerrando. El navegador lo limita a 64 KB de
// cuerpo: con un historial mas largo se manda sin keepalive (si no, el fetch fallaria entero).
const LIMITE_KEEPALIVE = 60_000

export async function cerrarConversacion(historial: LineaHistorial[] = []): Promise<boolean> {
  try {
    const cuerpo = JSON.stringify({ accion: 'cerrar', historial, esperar: false })
    const respuesta = await fetch('/api/memoria', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo,
      keepalive: new Blob([cuerpo]).size < LIMITE_KEEPALIVE,
      signal: AbortSignal.timeout(10_000),
    })
    const datos = await respuesta.json().catch(() => null)
    return respuesta.ok && datos?.cerrada === true
  } catch {
    return false
  }
}
