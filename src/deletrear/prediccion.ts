// Cliente del navegador de deletrear: diccionario local y pedidos a /api/deletrear.
import type { PedidoOpciones } from '@/eventos'
import { PERFIL_ROBERTO } from '@/llm/perfil-roberto'
import { crearDiccionario, palabrasDe, type Diccionario } from './diccionario.ts'
import type { TipoPrediccion } from './llm.ts'

// La lista se baja una vez por pagina. Si falla, queda el diccionario solo con las extras.
let cargando: Promise<Diccionario> | null = null
export function cargarDiccionario(): Promise<Diccionario> {
  cargando ??= fetch('/palabras-es.txt')
    .then((r) => (r.ok ? r.text() : ''))
    .catch(() => '')
    .then((lista) => crearDiccionario(lista))
  return cargando
}

// Palabras cercanas: las de la charla actual (lo mas reciente primero) y las del perfil.
export function palabrasCercanas(pedido: PedidoOpciones): string[] {
  const charla = [pedido.ultimoTurno ?? '', ...pedido.historial.map((l) => l.texto).reverse()]
  return [...charla.flatMap(palabrasDe), ...palabrasDe(PERFIL_ROBERTO.markdown)]
}

// Nunca tira: si falla o se cancela, devuelve [].
export async function pedirPrediccion(
  tipo: TipoPrediccion,
  escrito: string,
  pedido: PedidoOpciones,
  signal?: AbortSignal,
): Promise<string[]> {
  try {
    const respuesta = await fetch('/api/deletrear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, escrito, pedido }),
      signal,
    })
    const datos = await respuesta.json().catch(() => null)
    return respuesta.ok && Array.isArray(datos?.lista) ? (datos.lista as string[]) : []
  } catch {
    return []
  }
}
