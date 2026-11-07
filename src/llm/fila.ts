// Fila por almacen: los "leer la memoria, cambiarla y guardarla" van de a uno.
// Sin esto, un cierre por tiempo y un pedido de opciones podian leer la misma conversacion,
// cerrarla uno y resucitarla el otro (y cerrarla dos veces), o pisarse las lineas.
// Es por instancia de almacen: en el servidor hay una sola (ver servidor.ts). Las filas viven en
// globalThis por si Next evalua este modulo mas de una vez: tiene que haber una sola fila por almacen.
import type { Almacen } from './tipos.ts'

const conFilas = globalThis as typeof globalThis & { __parpadeoFilas?: WeakMap<Almacen, Promise<unknown>> }
const filas = (conFilas.__parpadeoFilas ??= new WeakMap())

export function enFila<T>(almacen: Almacen, trabajo: () => Promise<T>): Promise<T> {
  const anterior = filas.get(almacen) ?? Promise.resolve()
  const este = anterior.catch(() => {}).then(trabajo)
  filas.set(almacen, este)
  return este
}
