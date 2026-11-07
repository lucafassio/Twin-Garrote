// Controles de la memoria para la ruta /api/memoria y la demo de "Lo que aprendi de vos".
// Listar hechos e invalidar uno a mano. El cierre de la conversacion esta en opciones (crearCierre).
// Un hecho invalidado nunca se borra: queda con su fecha de invalidacion.
import type { Almacen, Hecho } from './tipos.ts'
import { estaVencido } from './fechas.ts'
import { enFila } from './fila.ts'

// Cada hecho trae su fecha de evento (si tiene, en el propio hecho) y si esta vencido a la hora del pedido.
export type HechoListado = Hecho & { vencido: boolean }
// Los vencidos van aparte: siguen activos en la memoria, pero ya no entran a las opciones.
export type HechosListados = { activos: HechoListado[]; vencidos: HechoListado[]; invalidados: HechoListado[] }

// Los mas nuevos primero. Vencido = paso su validoHasta a la hora `ahora` (un invalidado nunca cuenta como vencido).
export async function listarHechos(almacen: Almacen, ahora: Date = new Date()): Promise<HechosListados> {
  const { hechos } = await almacen.leerMemoria()
  const porFecha = (a: Hecho, b: Hecho) => Date.parse(b.fecha) - Date.parse(a.fecha)
  const marcados = hechos.map((h): HechoListado => ({ ...h, vencido: h.estado === 'activo' && estaVencido(h, ahora) }))
  return {
    activos: marcados.filter((h) => h.estado === 'activo' && !h.vencido).sort(porFecha),
    vencidos: marcados.filter((h) => h.vencido).sort(porFecha),
    invalidados: marcados
      .filter((h) => h.estado === 'invalidado')
      .sort((a, b) => Date.parse(b.fechaInvalidacion ?? b.fecha) - Date.parse(a.fechaInvalidacion ?? a.fecha)),
  }
}

// Invalidar a mano: el hecho deja de usarse en las opciones, y tambien el resumen de su conversacion.
// Devuelve el hecho invalidado, o null si no hay un hecho activo con ese id.
// En fila: guarda la memoria entera, no tiene que pisar una conversacion que se cerro en el medio.
export function invalidarHecho(almacen: Almacen, id: string, ahora: Date = new Date()): Promise<Hecho | null> {
  return enFila(almacen, () => invalidar(almacen, id, ahora))
}

async function invalidar(almacen: Almacen, id: string, ahora: Date): Promise<Hecho | null> {
  const memoria = await almacen.leerMemoria()
  const hecho = memoria.hechos.find((h) => h.id === id && h.estado === 'activo')
  if (!hecho) return null
  const iso = ahora.toISOString()
  hecho.estado = 'invalidado'
  hecho.fechaInvalidacion = iso
  // El resumen de la conversacion de donde salio el hecho (mismo fin) tambien lo cuenta: se descarta.
  for (const r of memoria.resumenes) {
    if (r.fin === hecho.fecha && !r.descartado) r.descartado = iso
  }
  await almacen.guardarMemoria(memoria)
  return hecho
}
