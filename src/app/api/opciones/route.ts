// Ruta de opciones del path llm: capa fina sobre el modulo de opciones.
// POST con PedidoOpciones -> { opciones, registro, nuevaConversacion, proveedor, ms }.
import { esPedido } from '@/llm/pedido'
import { crearAlmacenEnArchivos, crearOpcionesConMemoria, ErrorOpciones } from '@/llm'
import { elegirProveedor } from '@/llm/proveedores'

// Una instancia por proceso. La huella y la memoria viven en .data/ (fuera de git).
// Al cerrarse una conversacion, el agente de memoria (#11) aprende en segundo plano.
const proveedor = elegirProveedor()
const { generarOpciones } = crearOpcionesConMemoria({ proveedor, almacen: crearAlmacenEnArchivos() })

export async function POST(request: Request) {
  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return Response.json({ error: 'El cuerpo no es JSON' }, { status: 400 })
  }
  if (!esPedido(cuerpo)) return Response.json({ error: 'No es un PedidoOpciones' }, { status: 400 })

  const inicio = performance.now()
  try {
    const resultado = await generarOpciones(cuerpo)
    const ms = Math.round(performance.now() - inicio)
    return Response.json({ ...resultado, proveedor: proveedor.nombre, ms })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    console.error('[api/opciones]', mensaje)
    const status = error instanceof ErrorOpciones ? 502 : 500
    return Response.json({ error: mensaje, proveedor: proveedor.nombre }, { status })
  }
}
