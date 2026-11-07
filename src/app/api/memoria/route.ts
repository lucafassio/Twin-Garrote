// Ruta de memoria del path llm: capa fina sobre el almacen en archivos, para la demo.
//   GET                                              -> { activos, invalidados }
//   POST { accion: 'invalidar', id }                 -> { hecho, activos, invalidados }
//   POST { accion: 'cerrar', historial, cercania? }  -> { cerrada, lineas, activos, invalidados }
// 'cerrar' fuerza el cierre de la conversacion actual y corre el agente de memoria, igual que
// cuando opciones detecta el silencio largo. Aca se espera a que termine, para mostrar lo aprendido.
import { connection } from 'next/server'
import type { Cercania, LineaHistorial } from '@/eventos'
import { cerrarConversacion, crearAlmacenEnArchivos, crearDisparadorMemoria, invalidarHecho, listarHechos } from '@/llm'
import { elegirProveedor } from '@/llm/proveedores'

const proveedor = elegirProveedor()
const almacen = crearAlmacenEnArchivos()
let ultimoError: string | null = null
const memoria = crearDisparadorMemoria({
  proveedor,
  almacen,
  alFallar: (e) => {
    ultimoError = e instanceof Error ? e.message : String(e)
    console.error('[api/memoria] agente de memoria', e)
  },
})

const CERCANIAS: Cercania[] = ['familia', 'conocido', 'formal']

function esLinea(x: unknown): x is LineaHistorial {
  if (typeof x !== 'object' || x === null) return false
  const l = x as Record<string, unknown>
  return (l.quien === 'usuario' || l.quien === 'interlocutor') && typeof l.texto === 'string'
}

export async function GET() {
  await connection() // siempre al momento: la memoria cambia en segundo plano
  return Response.json(await listarHechos(almacen))
}

export async function POST(request: Request) {
  let cuerpo: Record<string, unknown>
  try {
    cuerpo = (await request.json()) as Record<string, unknown>
  } catch {
    return Response.json({ error: 'El cuerpo no es JSON' }, { status: 400 })
  }
  if (typeof cuerpo !== 'object' || cuerpo === null) {
    return Response.json({ error: 'El cuerpo no es un objeto' }, { status: 400 })
  }

  if (cuerpo.accion === 'invalidar') {
    if (typeof cuerpo.id !== 'string') return Response.json({ error: 'Falta el id del hecho' }, { status: 400 })
    const hecho = await invalidarHecho(almacen, cuerpo.id)
    if (!hecho) return Response.json({ error: 'No hay un hecho activo con ese id' }, { status: 404 })
    return Response.json({ hecho, ...(await listarHechos(almacen)) })
  }

  if (cuerpo.accion === 'cerrar') {
    const historial = cuerpo.historial
    if (!Array.isArray(historial) || !historial.every(esLinea)) {
      return Response.json({ error: 'historial tiene que ser una lista de LineaHistorial' }, { status: 400 })
    }
    const cercania = CERCANIAS.includes(cuerpo.cercania as Cercania) ? (cuerpo.cercania as Cercania) : null
    const cerrada = await cerrarConversacion(almacen, historial, cercania)
    ultimoError = null
    if (cerrada) {
      memoria.disparar(cerrada)
      await memoria.listo()
    }
    if (ultimoError) {
      return Response.json({ error: `El agente de memoria fallo: ${ultimoError}`, proveedor: proveedor.nombre }, { status: 502 })
    }
    return Response.json({
      cerrada: cerrada !== null,
      lineas: cerrada?.lineas.length ?? 0,
      proveedor: proveedor.nombre,
      ...(await listarHechos(almacen)),
    })
  }

  return Response.json({ error: "accion tiene que ser 'invalidar' o 'cerrar'" }, { status: 400 })
}
