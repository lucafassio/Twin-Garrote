// Controles de la memoria para la ruta /api/memoria y la demo de "Lo que aprendi de vos".
// Listar hechos, invalidar uno a mano y forzar el cierre de la conversacion actual.
// Un hecho invalidado nunca se borra: queda con su fecha de invalidacion.
import type { Cercania, LineaHistorial } from '@/eventos'
import type { Almacen, ConversacionCerrada, Hecho } from './tipos.ts'

export type HechosListados = { activos: Hecho[]; invalidados: Hecho[] }

// Los mas nuevos primero.
export async function listarHechos(almacen: Almacen): Promise<HechosListados> {
  const { hechos } = await almacen.leerMemoria()
  const porFecha = (a: Hecho, b: Hecho) => Date.parse(b.fecha) - Date.parse(a.fecha)
  return {
    activos: hechos.filter((h) => h.estado === 'activo').sort(porFecha),
    invalidados: hechos
      .filter((h) => h.estado === 'invalidado')
      .sort((a, b) => Date.parse(b.fechaInvalidacion ?? b.fecha) - Date.parse(a.fechaInvalidacion ?? a.fecha)),
  }
}

// Devuelve el hecho invalidado, o null si no hay un hecho activo con ese id.
export async function invalidarHecho(almacen: Almacen, id: string, ahora: Date = new Date()): Promise<Hecho | null> {
  const memoria = await almacen.leerMemoria()
  const hecho = memoria.hechos.find((h) => h.id === id && h.estado === 'activo')
  if (!hecho) return null
  hecho.estado = 'invalidado'
  hecho.fechaInvalidacion = ahora.toISOString()
  await almacen.guardarMemoria(memoria)
  return hecho
}

// Cierra la conversacion actual como si hubiera pasado el silencio largo: arma la
// ConversacionCerrada con las lineas del historial desde que empezo, y deja la memoria sin
// conversacion actual, asi el proximo pedido de opciones arranca una nueva (sin volver a cerrar).
// El historial lo manda el cliente: el servidor solo guarda desde que linea empezo.
// Devuelve null si no habia conversacion o no tenia lineas (no hay nada que aprender).
export async function cerrarConversacion(
  almacen: Almacen,
  historial: LineaHistorial[],
  cercania: Cercania | null = null,
  ahora: Date = new Date(),
): Promise<ConversacionCerrada | null> {
  const memoria = await almacen.leerMemoria()
  const actual = memoria.conversacion
  if (!actual && historial.length === 0) return null
  const desde = actual && actual.desdeLinea <= historial.length ? actual.desdeLinea : 0
  const lineas = historial.slice(desde)
  await almacen.guardarMemoria({ ...memoria, conversacion: null })
  if (lineas.length === 0) return null
  return {
    inicio: actual?.inicio ?? ahora.toISOString(),
    fin: actual?.ultimaActividad ?? ahora.toISOString(),
    lineas,
    cercania,
  }
}
