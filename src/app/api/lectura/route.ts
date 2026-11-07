// Lectura del turno con un modelo de decision (path nucleo-interfaz, issue #5).
// POST { texto, historial, nombreUsuario? } -> { paraUsuario, completo, tipo, modelo, ms }.
// La key del AI Gateway queda en el servidor. Si falla, el nucleo decide con su heuristica local.
import type { LineaHistorial } from '@/eventos'
import { leerTurnoConGateway, MODELO_LECTURA_POR_DEFECTO } from '@/nucleo/lecturaModelo'

const TIEMPO_MAXIMO_MS = 2000 // el nucleo espera menos (800 ms); esto solo corta llamadas colgadas

function esLinea(x: unknown): x is LineaHistorial {
  if (typeof x !== 'object' || x === null) return false
  const l = x as Record<string, unknown>
  return (l.quien === 'usuario' || l.quien === 'interlocutor') && typeof l.texto === 'string'
}

export async function POST(request: Request) {
  let cuerpo: Record<string, unknown>
  try {
    cuerpo = await request.json()
  } catch {
    return Response.json({ error: 'El cuerpo no es JSON' }, { status: 400 })
  }
  const { texto, historial, nombreUsuario } = cuerpo
  if (typeof texto !== 'string' || !Array.isArray(historial) || !historial.every(esLinea)) {
    return Response.json({ error: 'Se espera { texto, historial }' }, { status: 400 })
  }

  const modelo = process.env.LECTURA_MODELO || MODELO_LECTURA_POR_DEFECTO
  const inicio = performance.now()
  try {
    const lectura = await leerTurnoConGateway({
      texto,
      historial,
      nombreUsuario: typeof nombreUsuario === 'string' ? nombreUsuario : 'Roberto',
      modelo,
      key: process.env.AI_GATEWAY_API_KEY,
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    })
    return Response.json({ ...lectura, modelo, ms: Math.round(performance.now() - inicio) })
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error)
    console.error('[api/lectura]', mensaje)
    return Response.json({ error: mensaje, modelo }, { status: 502 })
  }
}
