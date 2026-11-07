// Modulo de opciones: la costura principal del path llm.
// Dado un PedidoOpciones y la hora, devuelve 4 opciones en la voz del usuario,
// la mas probable primero, mas el registro y si empezo una conversacion nueva.
import type { Cercania, Intencion, LineaHistorial, Opcion, PedidoOpciones } from '@/eventos'
import type {
  Almacen,
  ConversacionActual,
  ConversacionCerrada,
  Hecho,
  Memoria,
  PerfilHuella,
  Proveedor,
  Registro,
  ResultadoOpciones,
} from './tipos.ts'

const MINUTO = 60_000
export const MISMA_CONVERSACION_MS = 3 * MINUTO // menos que esto: misma conversacion
export const NUEVA_CONVERSACION_MS = 15 * MINUTO // mas que esto: conversacion nueva
export const VENTANA_RESUMENES_MS = 12 * 60 * MINUTO // memoria corta: ~12 h
const MAX_HECHOS = 12
const MAX_EJEMPLOS = 8

export class ErrorOpciones extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorOpciones'
  }
}

export type DependenciasOpciones = {
  proveedor: Proveedor
  almacen: Almacen
  // Se llama (sin esperar) cuando se detecta que la conversacion anterior se cerro.
  // Ahi se engancha el agente de memoria: nunca corre dentro del turno.
  alCerrarConversacion?: (conversacion: ConversacionCerrada) => void
}

export type GenerarOpciones = (pedido: PedidoOpciones, ahora?: Date) => Promise<ResultadoOpciones>

export function crearOpciones(deps: DependenciasOpciones): GenerarOpciones {
  return async function generarOpciones(pedido, ahora = new Date()) {
    const [perfil, memoria] = await Promise.all([deps.almacen.leerPerfil(), deps.almacen.leerMemoria()])

    const deteccion = detectarConversacion(memoria.conversacion, pedido.historial, ahora)
    const sistema = promptSistema()
    const usuario = promptUsuario({ pedido, perfil, memoria, deteccion, ahora })

    const respuesta = await pedirConReintento(deps.proveedor, sistema, usuario)

    const nuevaConversacion =
      deteccion.tipo === 'nueva' ? true : deteccion.tipo === 'misma' ? false : respuesta.nuevaConversacion

    await actualizarConversacion(deps, memoria, pedido, ahora, nuevaConversacion)

    return { opciones: respuesta.opciones, registro: respuesta.registro, nuevaConversacion }
  }
}

// --- Deteccion de conversacion -----------------------------------------------

type Deteccion =
  | { tipo: 'nueva' } // primera vez o mas de 15 min
  | { tipo: 'misma'; lineas: LineaHistorial[] } // menos de 3 min
  | { tipo: 'dudosa'; minutos: number; lineas: LineaHistorial[] } // entre medio: decide el modelo

function lineasDeConversacion(conversacion: ConversacionActual, historial: LineaHistorial[]) {
  // Si el historial se achico (el nucleo arranco de cero), la conversacion es todo lo que hay.
  const desde = conversacion.desdeLinea <= historial.length ? conversacion.desdeLinea : 0
  return historial.slice(desde)
}

function detectarConversacion(
  conversacion: ConversacionActual | null,
  historial: LineaHistorial[],
  ahora: Date,
): Deteccion {
  if (!conversacion) return { tipo: 'nueva' }
  const silencio = ahora.getTime() - Date.parse(conversacion.ultimaActividad)
  if (silencio > NUEVA_CONVERSACION_MS) return { tipo: 'nueva' }
  const lineas = lineasDeConversacion(conversacion, historial)
  if (silencio < MISMA_CONVERSACION_MS) return { tipo: 'misma', lineas }
  return { tipo: 'dudosa', minutos: Math.round(silencio / MINUTO), lineas }
}

async function actualizarConversacion(
  deps: DependenciasOpciones,
  memoria: Memoria,
  pedido: PedidoOpciones,
  ahora: Date,
  nueva: boolean,
) {
  const anterior = memoria.conversacion
  const iso = ahora.toISOString()
  if (nueva) {
    if (anterior) {
      const lineas = lineasDeConversacion(anterior, pedido.historial)
      if (lineas.length > 0 && deps.alCerrarConversacion) {
        const cerrada: ConversacionCerrada = {
          inicio: anterior.inicio,
          fin: anterior.ultimaActividad,
          lineas,
          cercania: pedido.cercania ?? null,
        }
        // Segundo plano: no se espera ni se deja que un error rompa el turno.
        queueMicrotask(() => {
          try {
            deps.alCerrarConversacion!(cerrada)
          } catch {}
        })
      }
    }
    memoria.conversacion = { inicio: iso, ultimaActividad: iso, desdeLinea: pedido.historial.length }
  } else if (anterior) {
    memoria.conversacion = { ...anterior, ultimaActividad: iso }
  }
  // Releer antes de guardar: mientras el modelo pensaba, el agente de memoria pudo guardar hechos.
  // Desde aca solo se escribe la conversacion actual.
  const fresca = await deps.almacen.leerMemoria()
  await deps.almacen.guardarMemoria({ ...fresca, conversacion: memoria.conversacion })
}

// --- Prompt ------------------------------------------------------------------

// Reglas fijas en codigo: el aprendizaje automatico nunca las toca.
function promptSistema(): string {
  return `Sos el usuario de un sistema de comunicacion aumentativa: una persona con ELA que solo puede elegir una respuesta entre 4 con un parpadeo. Escribis las 4 opciones que el usuario podria decir, en primera persona, como el. Nunca hablas como asistente.

Reglas:
1. Primera persona, con la voz del usuario segun su huella. Nunca como asistente ni en tercera persona.
2. Las 4 opciones tienen intenciones distintas: aceptar, rechazar o matizar, preguntar, otra cosa.
3. Ordenalas de la mas probable a la menos probable. Una opcion neutra (una pregunta o "Dejame pensarlo") va primera solo si el turno es ambiguo.
4. Cada opcion tiene como maximo 12 palabras.
5. Si el turno es una pregunta de si o no, una opcion es un si y otra es un no.
6. Tono: segun la cercania si esta aclarada; si no, segun el registro que infieras del turno (formal, casual o intimo). Si hay cercania, gana la cercania.
7. Solo usas hechos que esten en la huella. Nunca inventes sintomas, planes, opiniones fuertes ni datos de su vida.
8. Con cercania formal no usas hechos intimos (salud, familia, plata).
9. Espanol rioplatense con voseo.
10. Nunca repitas una opcion ya mostrada para este turno.
11. Si no hay turno (SIN_TURNO), propone 4 arranques de charla basados en la huella y los temas recientes.
12. Si te dicen los minutos de silencio desde el ultimo turno, decidi si es una conversacion nueva (nuevaConversacion).

Respondes solo JSON, sin texto alrededor, con esta forma:
{"opciones":[{"intencion":"aceptar|rechazar|preguntar|otra","texto":"..."}, ... 4 en total],"registro":"formal|casual|intimo","nuevaConversacion":true|false}`
}

function hechosParaPrompt(hechos: Hecho[], cercania: Cercania | undefined, turno: string | null): Hecho[] {
  const palabras = new Set(
    (turno ?? '')
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((p) => p.length > 3),
  )
  const coincidencias = (h: Hecho) =>
    h.texto
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((p) => palabras.has(p)).length
  return hechos
    .filter((h) => h.estado === 'activo')
    .filter((h) => !(cercania === 'formal' && h.intimo))
    .map((h) => ({ h, puntaje: h.importancia + 3 * coincidencias(h) }))
    .sort((a, b) => b.puntaje - a.puntaje || Date.parse(b.h.fecha) - Date.parse(a.h.fecha))
    .slice(0, MAX_HECHOS)
    .map((x) => x.h)
}

function renderLinea(l: LineaHistorial) {
  return `- ${l.quien === 'usuario' ? 'Usuario' : 'Interlocutor'}: ${l.texto}`
}

function promptUsuario(p: {
  pedido: PedidoOpciones
  perfil: PerfilHuella
  memoria: Memoria
  deteccion: Deteccion
  ahora: Date
}): string {
  const { pedido, perfil, memoria, deteccion, ahora } = p
  const partes: string[] = []

  partes.push(`# Huella\n\n${perfil.markdown.trim()}`)

  const hechos = hechosParaPrompt(memoria.hechos, pedido.cercania, pedido.ultimoTurno)
  if (hechos.length > 0) {
    partes.push(`## Hechos que sabes\n${hechos.map((h) => `- ${h.texto}`).join('\n')}`)
  }

  const ejemplos = [...memoria.ejemplosEstilo]
    .sort((a, b) => peso(b.origen) - peso(a.origen) || Date.parse(b.fecha) - Date.parse(a.fecha))
    .slice(0, MAX_EJEMPLOS)
  if (ejemplos.length > 0) {
    partes.push(`## Frases que dijo hace poco\n${ejemplos.map((e) => `- "${e.texto}"`).join('\n')}`)
  }

  const desde = ahora.getTime() - VENTANA_RESUMENES_MS
  const resumenes = memoria.resumenes.filter((r) => Date.parse(r.fin) >= desde)
  if (resumenes.length > 0) {
    partes.push(`# Conversaciones de hoy\n${resumenes.map((r) => `- ${r.resumen}`).join('\n')}`)
  }

  partes.push(`# Cercania\n${pedido.cercania ?? 'no aclarada: inferi el registro del turno'}`)

  const lineas = deteccion.tipo === 'nueva' ? [] : deteccion.lineas
  if (deteccion.tipo === 'dudosa') {
    partes.push(
      `# Silencio\nPasaron ${deteccion.minutos} minutos desde el ultimo turno. Decidi si esto es una conversacion nueva.`,
    )
  }
  if (lineas.length > 0) {
    partes.push(`# Conversacion actual\n${lineas.map(renderLinea).join('\n')}`)
  }

  partes.push(
    pedido.ultimoTurno === null
      ? '# Ultimo turno\nSIN_TURNO: el usuario quiere iniciar una charla.'
      : `# Ultimo turno\nInterlocutor: ${pedido.ultimoTurno}`,
  )

  if (pedido.yaMostradas.length > 0) {
    partes.push(`# Ya mostradas (no las repitas)\n${pedido.yaMostradas.map((t) => `- ${t}`).join('\n')}`)
  }

  return partes.join('\n\n')
}

const peso = (origen: 'deletreo' | 'opcion') => (origen === 'deletreo' ? 2 : 1)

// --- Respuesta del modelo ----------------------------------------------------

type RespuestaModelo = { opciones: Opcion[]; registro: Registro; nuevaConversacion: boolean }

async function pedirConReintento(proveedor: Proveedor, sistema: string, usuario: string): Promise<RespuestaModelo> {
  const primera = interpretar(await proveedor.generar({ sistema, usuario }))
  if (primera) return primera
  const aviso = '\n\nTu respuesta anterior no era el JSON pedido. Responde solo el JSON, con exactamente 4 opciones.'
  const segunda = interpretar(await proveedor.generar({ sistema, usuario: usuario + aviso }))
  if (segunda) return segunda
  throw new ErrorOpciones(`El proveedor ${proveedor.nombre} devolvio JSON invalido dos veces`)
}

const INTENCIONES: Intencion[] = ['aceptar', 'rechazar', 'preguntar', 'otra']
const REGISTROS: Registro[] = ['formal', 'casual', 'intimo']

function interpretar(texto: string): RespuestaModelo | null {
  const limpio = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  let datos: unknown
  try {
    datos = JSON.parse(limpio)
  } catch {
    return null
  }
  if (typeof datos !== 'object' || datos === null) return null
  const d = datos as Record<string, unknown>
  if (!Array.isArray(d.opciones)) return null
  const opciones = d.opciones.filter(
    (o): o is Opcion =>
      typeof o === 'object' &&
      o !== null &&
      INTENCIONES.includes((o as Opcion).intencion) &&
      typeof (o as Opcion).texto === 'string' &&
      (o as Opcion).texto.trim() !== '',
  )
  if (opciones.length < 4) return null
  return {
    opciones: opciones.slice(0, 4).map((o) => ({ intencion: o.intencion, texto: o.texto.trim() })),
    registro: REGISTROS.includes(d.registro as Registro) ? (d.registro as Registro) : 'casual',
    nuevaConversacion: d.nuevaConversacion === true,
  }
}
