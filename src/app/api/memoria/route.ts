// Ruta de memoria del path llm: capa fina sobre el path llm del servidor (servidor.ts), para la demo
// y para el nucleo.
//   GET                                                  -> { activos, vencidos, invalidados }
//   POST { accion: 'invalidar', id }                     -> { hecho, activos, vencidos, invalidados }
//   POST { accion: 'cerrar', historial?, esperar? }      -> { cerrada, lineas, activos, vencidos, invalidados }
// Cada hecho trae su fechaEvento (si tiene) y `vencido`, calculado a la hora del pedido. Los vencidos
// siguen activos en la memoria; solo van en su propio grupo, aparte de los activos y de los invalidados.
// 'cerrar' cierra la conversacion actual y dispara el agente de memoria, igual que el cierre por
// tiempo. La cerrada lleva las lineas guardadas en el servidor mas las nuevas del historial, si lo
// manda, y la cercania y el interlocutor de la propia conversacion. Por defecto espera a que el agente
// termine, para mostrar lo aprendido (la demo); con esperar: false responde al toque y el agente sigue
// en segundo plano (el nucleo al apagarse). Una cercania en el cuerpo se ignora.
//   POST { accion: 'elegir', eleccion }                  -> { subidos }
// 'elegir' registra lo que eligio el usuario (#36): si es una opcion del LLM, sus hechos suben de
// saliencia. "Otra" y las fijas no tocan nada. El registro de elecciones de #19 extiende esta accion.
import { connection } from 'next/server'
import type { LineaHistorial } from '@/eventos'
import { esEleccion, invalidarHecho, listarHechos, registrarEleccion } from '@/llm'
import { servidorLlm } from '@/llm/servidor'

function esLinea(x: unknown): x is LineaHistorial {
  if (typeof x !== 'object' || x === null) return false
  const l = x as Record<string, unknown>
  return (l.quien === 'usuario' || l.quien === 'interlocutor') && typeof l.texto === 'string'
}

export async function GET() {
  await connection() // siempre al momento: la memoria cambia en segundo plano
  return Response.json(await listarHechos(servidorLlm().almacen))
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
  const { almacen, cierre, memoria, estado, proveedor } = servidorLlm()

  if (cuerpo.accion === 'invalidar') {
    if (typeof cuerpo.id !== 'string') return Response.json({ error: 'Falta el id del hecho' }, { status: 400 })
    const hecho = await invalidarHecho(almacen, cuerpo.id)
    if (!hecho) return Response.json({ error: 'No hay un hecho activo con ese id' }, { status: 404 })
    return Response.json({ hecho, ...(await listarHechos(almacen)) })
  }

  if (cuerpo.accion === 'cerrar') {
    const historial = cuerpo.historial ?? []
    if (!Array.isArray(historial) || !historial.every(esLinea)) {
      return Response.json({ error: 'historial tiene que ser una lista de LineaHistorial' }, { status: 400 })
    }
    estado.ultimoErrorMemoria = null
    const cerrada = await cierre.cerrar(historial)
    if (cerrada && cuerpo.esperar !== false) {
      await new Promise((r) => setImmediate(r)) // el cierre dispara al agente en segundo plano
      await memoria.listo()
      if (estado.ultimoErrorMemoria) {
        return Response.json(
          { error: `El agente de memoria fallo: ${estado.ultimoErrorMemoria}`, proveedor: proveedor.nombre },
          { status: 502 },
        )
      }
    }
    return Response.json({
      cerrada: cerrada !== null,
      lineas: cerrada?.lineas.length ?? 0,
      proveedor: proveedor.nombre,
      ...(await listarHechos(almacen)),
    })
  }

  if (cuerpo.accion === 'elegir') {
    if (!esEleccion(cuerpo.eleccion)) return Response.json({ error: 'eleccion no es una Eleccion' }, { status: 400 })
    return Response.json({ subidos: await registrarEleccion(almacen, cuerpo.eleccion) })
  }

  return Response.json({ error: "accion tiene que ser 'invalidar', 'cerrar' o 'elegir'" }, { status: 400 })
}
