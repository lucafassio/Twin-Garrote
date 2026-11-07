import type { LineaHistorial } from '@/eventos'
import type { LecturaTurno, TipoTurno } from './tipos'

// Pedido y respuesta para un modelo de decision (Jev, Mammoth, Decider...) por la
// API "System One" del AI Gateway de Vercel: POST /typesafe/v1/systemone.
// Funciones puras: el fetch lo hace la ruta del servidor (la key no va al navegador).

export const URL_GATEWAY_DECISION = 'https://ai-gateway.vercel.sh/typesafe/v1/systemone'
// Elegido por la medicion de evalLectura (94% de decisiones correctas, p95 ~400 ms).
// Se cambia con LECTURA_MODELO (por ejemplo liquid/d1-ultra).
export const MODELO_LECTURA_POR_DEFECTO = 'baseten/mammoth-1'
const LINEAS_CONTEXTO = 4

const TIPOS: Record<TipoTurno, string> = {
  siNo: 'Pregunta que se contesta con si o no ("¿Querés…?", "¿Tenés…?", "¿Le duele…?")',
  abierta: 'Pregunta abierta (qué, cómo, cuándo, dónde, quién, cuánto)',
  comentario: 'Comentario, noticia o respuesta a lo que dijo el usuario; no es una pregunta',
  saludo: 'Saludo o despedida',
  pedido: 'Pedido o invitación a que el usuario cuente o haga algo ("contame", "mirá")',
  otro: 'Otra cosa, ruido o no se entiende',
}

export type PedidoLectura = {
  model: string
  state: string
  questions: {
    para_usuario: { type: 'noul'; instructions: string }
    completo: { type: 'noul'; instructions: string }
    tipo: { type: 'choice'; instructions: string; criteria: Record<string, string> }
  }
}

export function armarPedidoLectura(p: {
  modelo: string
  nombreUsuario: string
  texto: string
  historial: LineaHistorial[]
}): PedidoLectura {
  const n = p.nombreUsuario
  const lineas = p.historial
    .slice(-LINEAS_CONTEXTO)
    .map((l) => `- ${l.quien === 'usuario' ? n : 'Interlocutor'}: ${l.texto}`)
  const state = [
    `Usuario: ${n}, persona con ELA que no puede hablar ni moverse; responde eligiendo frases en una pantalla.`,
    'En la sala puede haber otras personas hablando entre ellas.',
    `Conversación reciente con ${n}:`,
    lineas.length ? lineas.join('\n') : '(todavía no hay)',
    `Recién escuchado (transcripción automática, sin puntuación, puede tener errores): "${p.texto}"`,
  ].join('\n')

  return {
    model: p.modelo,
    state,
    questions: {
      para_usuario: {
        type: 'noul',
        instructions: `¿Lo recién escuchado le habla a ${n} (lo tratan de vos o de usted, lo nombran, o siguen la charla con él) y él podría responder? No si es charla entre otras personas, si hablan de ${n} en tercera persona, si le hablan a otra persona, o si es ruido o palabras sueltas.`,
      },
      completo: {
        type: 'noul',
        instructions: `¿Lo recién escuchado es una frase terminada? No si se cortó a la mitad, si termina en una palabra que pide continuación (que, de, con, el, la, y) o si es solo un nombre o vocativo como "${n}…".`,
      },
      tipo: { type: 'choice', instructions: '¿Qué tipo de turno es lo recién escuchado?', criteria: TIPOS },
    },
  }
}

// Llama al modelo de decision por el Gateway. Solo en el servidor (usa la key).
export async function leerTurnoConGateway(p: {
  texto: string
  historial: LineaHistorial[]
  nombreUsuario: string
  modelo: string
  key: string | undefined
  fetch?: typeof fetch
  signal?: AbortSignal
}): Promise<LecturaTurno> {
  if (!p.key) throw new Error('falta AI_GATEWAY_API_KEY')
  const f = p.fetch ?? fetch
  const r = await f(URL_GATEWAY_DECISION, {
    method: 'POST',
    headers: { Authorization: `Bearer ${p.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(
      armarPedidoLectura({ modelo: p.modelo, nombreUsuario: p.nombreUsuario, texto: p.texto, historial: p.historial }),
    ),
    signal: p.signal,
  })
  const json = (await r.json().catch(() => ({}))) as Respuesta & { error?: { message?: string } }
  if (!r.ok) throw new Error(`Gateway ${r.status}: ${json.error?.message ?? 'sin detalle'}`)
  return interpretarLectura(json)
}

type Respuesta = {
  answers?: Record<
    string,
    { type?: string; noul?: number; choice?: string; probabilities?: Record<string, number> } | undefined
  >
  error?: unknown
}

export function interpretarLectura(r: Respuesta): LecturaTurno {
  const para = r.answers?.para_usuario?.noul
  const completo = r.answers?.completo?.noul
  const choice = r.answers?.tipo?.choice
  if (typeof para !== 'number' || typeof completo !== 'number') {
    throw new Error('respuesta del modelo de decision incompleta')
  }
  const tipo = choice && choice in TIPOS ? (choice as TipoTurno) : 'otro'
  return { paraUsuario: para, completo, tipo }
}
