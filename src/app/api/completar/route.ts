// Ruta de completado del path llm: capa fina sobre el modulo de completado.
// POST con { prefijo, pedido: PedidoOpciones } -> { frase, proveedor, ms }.
// Si el modelo falla, la frase es el prefijo tal cual (nunca 5xx por el modelo).
import type { PedidoOpciones } from '@/eventos'
import { crearAlmacenEnArchivos, crearCompletado } from '@/llm'
import { elegirProveedor } from '@/llm/proveedores'

// Una instancia por proceso. Lee la misma huella y memoria que /api/opciones, sin escribirlas.
const proveedor = elegirProveedor()
const completar = crearCompletado({ proveedor, almacen: crearAlmacenEnArchivos() })

function esPedido(x: unknown): x is PedidoOpciones {
  if (typeof x !== 'object' || x === null) return false
  const p = x as Record<string, unknown>
  return (
    Array.isArray(p.historial) &&
    (p.ultimoTurno === null || typeof p.ultimoTurno === 'string') &&
    Array.isArray(p.yaMostradas) &&
    (p.cercania === undefined || ['familia', 'conocido', 'formal'].includes(p.cercania as string))
  )
}

export async function POST(request: Request) {
  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return Response.json({ error: 'El cuerpo no es JSON' }, { status: 400 })
  }
  const c = (cuerpo ?? {}) as Record<string, unknown>
  if (typeof c.prefijo !== 'string') return Response.json({ error: 'Falta prefijo' }, { status: 400 })
  if (!esPedido(c.pedido)) return Response.json({ error: 'No es un PedidoOpciones' }, { status: 400 })

  const inicio = performance.now()
  const frase = await completar(c.prefijo, c.pedido)
  const ms = Math.round(performance.now() - inicio)
  return Response.json({ frase, proveedor: proveedor.nombre, ms })
}
