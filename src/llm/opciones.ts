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
  OpcionMostrada,
  PerfilHuella,
  Proveedor,
  Registro,
  ResultadoOpciones,
  ResumenConversacion,
} from './tipos.ts'
import { hechosVigentes, seccionMomento, textoConFecha } from './fechas.ts'
import {
  abrirConversacion,
  armarCerrada,
  completarCerrada,
  lineasDeConversacion,
  seguirConversacion,
  sumarLineas,
} from './conversacion.ts'
import { enFila } from './fila.ts'
import { bloqueDe, describirPeriodo } from './niveles.ts'
import { decaerSaliencia, MAX_MOSTRADAS, pesoDe } from './saliencia.ts'
// Re-exportada: el completado (#22) arma la conversacion actual con la misma regla.
export { lineasDeConversacion } from './conversacion.ts'

const MINUTO = 60_000
export const MISMA_CONVERSACION_MS = 3 * MINUTO // menos que esto: misma conversacion
export const NUEVA_CONVERSACION_MS = 15 * MINUTO // mas que esto: conversacion nueva
export const VENTANA_RESUMENES_MS = 12 * 60 * MINUTO // memoria corta: ~12 h
export const RESUMEN_COMPLETO_MS = 5 * 60 * MINUTO // menos que esto: el resumen entra entero
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
    const perfil = await deps.almacen.leerPerfil()
    const memoria = await guardarLineasDelPedido(deps, pedido)

    const deteccion = detectarConversacion(memoria.conversacion, pedido.historial, ahora)
    const hechos = hechosParaPrompt(memoria.hechos, pedido.cercania, pedido.ultimoTurno, ahora)
    const sistema = promptSistema(pedido.tipoTurno)
    const usuario = promptUsuario({ pedido, perfil, memoria, hechos, deteccion, ahora })

    // El modelo ve cada hecho con un id corto (h1, h2...): devuelve esos y se traducen a los reales.
    const idsPorAlias = new Map(hechos.map((h, i) => [aliasHecho(i), h.id]))
    const respuesta = await pedirConReintento(deps.proveedor, sistema, usuario, idsPorAlias)

    const nuevaConversacion =
      deteccion.tipo === 'nueva' ? true : deteccion.tipo === 'misma' ? false : respuesta.nuevaConversacion

    const mostradas = respuesta.opciones.map((o) => ({ texto: o.texto, hechos: o.hechos }))
    await actualizarConversacion(deps, memoria, pedido, ahora, nuevaConversacion, mostradas)

    const opciones = respuesta.opciones.map((o) => ({ intencion: o.intencion, texto: o.texto }))
    return { opciones, registro: respuesta.registro, nuevaConversacion }
  }
}

// --- Deteccion de conversacion -----------------------------------------------

type Deteccion =
  | { tipo: 'nueva' } // primera vez o mas de 15 min
  | { tipo: 'misma'; lineas: LineaHistorial[] } // menos de 3 min
  | { tipo: 'dudosa'; minutos: number; lineas: LineaHistorial[] } // entre medio: decide el modelo

// Mas de 15 min sin pedidos de opciones: la conversacion termino.
function silencioLargo(conversacion: ConversacionActual, ahora: Date): boolean {
  return ahora.getTime() - Date.parse(conversacion.ultimaActividad) > NUEVA_CONVERSACION_MS
}

function detectarConversacion(
  conversacion: ConversacionActual | null,
  historial: LineaHistorial[],
  ahora: Date,
): Deteccion {
  if (!conversacion || silencioLargo(conversacion, ahora)) return { tipo: 'nueva' }
  const silencio = ahora.getTime() - Date.parse(conversacion.ultimaActividad)
  const lineas = lineasDeConversacion(conversacion, historial)
  if (silencio < MISMA_CONVERSACION_MS) return { tipo: 'misma', lineas }
  return { tipo: 'dudosa', minutos: Math.round(silencio / MINUTO), lineas }
}

// Apenas llega el pedido, antes de esperar al modelo: las lineas nuevas del historial quedan en la
// conversacion actual guardada. Asi un cierre que caiga mientras el modelo piensa no las pierde.
// Si la anterior se cerro por tiempo, este pedido trae su cola (la respuesta al ultimo turno): se
// manda al agente como complemento y la cerrada se borra.
function guardarLineasDelPedido(deps: DependenciasOpciones, pedido: PedidoOpciones): Promise<Memoria> {
  const almacen = deps.almacen
  return enFila(almacen, async () => {
    const memoria = await almacen.leerMemoria()
    if (!memoria.conversacion && memoria.cerradaPorTiempo) {
      const cola = completarCerrada(memoria.cerradaPorTiempo, pedido.historial)
      if (cola) dispararCierre(deps, cola)
      delete memoria.cerradaPorTiempo
      await almacen.guardarMemoria(memoria)
      return memoria
    }
    if (!memoria.conversacion) return memoria
    const conLineas = sumarLineas(memoria.conversacion, pedido.historial)
    const cambio =
      conLineas.desdeLinea !== memoria.conversacion.desdeLinea ||
      conLineas.lineas?.length !== (memoria.conversacion.lineas ?? []).length
    if (!cambio) return memoria
    const guardada = { ...memoria, conversacion: conLineas }
    await almacen.guardarMemoria(guardada)
    return guardada
  })
}

// Despues del modelo, sobre la memoria recien leida (en fila): mientras el modelo pensaba, el agente
// pudo guardar hechos y un cierre pudo cerrar la conversacion que se leyo al principio.
async function actualizarConversacion(
  deps: DependenciasOpciones,
  leida: Memoria,
  pedido: PedidoOpciones,
  ahora: Date,
  nueva: boolean,
  mostradas: OpcionMostrada[],
) {
  await enFila(deps.almacen, async () => {
    const memoria = await deps.almacen.leerMemoria()
    const actual = memoria.conversacion
    // Si ya no es la que se leyo, otro cierre se la llevo (con las lineas de este pedido): no se
    // vuelve a cerrar ni se resucita.
    const sigue = actual !== null && actual.inicio === leida.conversacion?.inicio
    if (nueva) {
      // La cerrada lleva sus lineas guardadas y su contexto, nunca el del pedido que abre la siguiente.
      if (sigue) {
        memoria.hechos = decaerSaliencia(memoria.hechos, actual.inicio)
        const cerrada = armarCerrada(actual, pedido.historial)
        if (cerrada) dispararCierre(deps, cerrada)
      }
      memoria.conversacion = abrirConversacion(pedido, ahora)
    } else {
      memoria.conversacion = sigue ? seguirConversacion(actual, pedido, ahora) : abrirConversacion(pedido, ahora)
    }
    // Las de esta vuelta van primero; las anteriores quedan por si este pedido ya no es el de la
    // pantalla. Una conversacion nueva arranca sin las de la anterior.
    memoria.conversacion.mostradas = [...mostradas, ...(memoria.conversacion.mostradas ?? [])].slice(0, MAX_MOSTRADAS)
    // Si un cierre por tiempo cayo mientras el modelo pensaba, las lineas de este pedido ya estaban
    // guardadas y se aprendieron: no hay cola que esperar.
    delete memoria.cerradaPorTiempo
    await deps.almacen.guardarMemoria(memoria)
  })
}

// Segundo plano: no se espera ni se deja que un error rompa el turno ni el cierre.
function dispararCierre(deps: Pick<DependenciasOpciones, 'alCerrarConversacion'>, cerrada: ConversacionCerrada) {
  if (!deps.alCerrarConversacion) return
  queueMicrotask(() => {
    try {
      deps.alCerrarConversacion!(cerrada)
    } catch {}
  })
}

// --- Cierre ------------------------------------------------------------------

export type DependenciasCierre = Pick<DependenciasOpciones, 'almacen' | 'alCerrarConversacion'>

export type CierreConversacion = {
  // Cierra la conversacion actual: si tiene lineas (las guardadas mas las nuevas del historial),
  // dispara el agente de memoria en segundo plano y la devuelve. Deja la conversacion actual vacia.
  // Sin conversacion actual no hace nada y devuelve null.
  cerrar(historial?: LineaHistorial[]): Promise<ConversacionCerrada | null>
  // El cierre por tiempo: igual que cerrar, solo si pasaron mas de 15 min desde la ultima actividad.
  // Lo llama el servidor periodicamente; el reloj se inyecta para los tests.
  cerrarSiInactiva(ahora?: Date): Promise<ConversacionCerrada | null>
}

export function crearCierre(deps: DependenciasCierre): CierreConversacion {
  // porTiempo: sin historial del cliente, la cola llega con el pedido siguiente (ver cerradaPorTiempo).
  function cerrarSi(debeCerrar: (actual: ConversacionActual) => boolean, historial: LineaHistorial[], porTiempo: boolean) {
    return enFila(deps.almacen, async () => {
      const memoria = await deps.almacen.leerMemoria()
      const actual = memoria.conversacion
      if (!actual || !debeCerrar(actual)) return null
      const cerrada = armarCerrada(actual, historial)
      memoria.conversacion = null
      memoria.hechos = decaerSaliencia(memoria.hechos, actual.inicio)
      if (porTiempo && cerrada) memoria.cerradaPorTiempo = { ...actual, lineas: cerrada.lineas }
      else delete memoria.cerradaPorTiempo
      await deps.almacen.guardarMemoria(memoria)
      if (cerrada) dispararCierre(deps, cerrada)
      return cerrada
    })
  }
  return {
    cerrar: (historial = []) => cerrarSi(() => true, historial, false),
    cerrarSiInactiva: (ahora = new Date()) => cerrarSi((actual) => silencioLargo(actual, ahora), [], true),
  }
}

// --- Prompt ------------------------------------------------------------------

// Reglas fijas en codigo: el aprendizaje automatico nunca las toca.
function promptSistema(tipoTurno: PedidoOpciones['tipoTurno']): string {
  return `Sos el usuario de un sistema de comunicacion aumentativa: una persona con ELA que solo puede elegir una respuesta entre 4 con un parpadeo. Escribis las 4 opciones que el usuario podria decir, en primera persona, como el. Nunca hablas como asistente.

Reglas:
1. Primera persona, con la voz del usuario segun su huella. Nunca como asistente ni en tercera persona.
2. Las 4 opciones tienen intenciones distintas: aceptar, rechazar o matizar, preguntar, otra cosa.
3. Ordenalas de la mas probable a la menos probable. Una opcion neutra (una pregunta o "Dejame pensarlo") va primera solo si el turno es ambiguo.
4. Cada opcion tiene como maximo 12 palabras.
5. ${tipoTurno === 'siNo'
    ? 'El turno es una pregunta de si o no. Ninguna opcion puede ser un si o un no sueltos: ya estan en las opciones fijas. Propone matices, condiciones o preguntas, por ejemplo "Si, pero mas tarde" o "No, gracias, ya comi", sin inventar hechos.'
    : 'Si el turno es una pregunta de si o no, una opcion es un si y otra es un no.'}
6. Tono: segun la cercania si esta aclarada; si no, segun el registro que infieras del turno (formal, casual o intimo). Si hay cercania, gana la cercania.
   Con cercania o registro formal: trata de usted al interlocutor, sin muletillas ("che", "no te hagas drama") y responde directo a lo que pregunta. Las muletillas son para familia y conocidos.
7. Solo usas hechos que esten en la huella. Nunca inventes sintomas, planes, opiniones fuertes ni datos de su vida. Las frases reales son ejemplos de como habla, no hechos ni frases para copiar: no saques datos de ellas (si una dice "¿como te fue en el laburo?", no sabes como le va a nadie).
8. Con cercania formal no usas hechos intimos (salud, familia, plata).
9. Espanol rioplatense con voseo.
10. Nunca repitas una opcion ya mostrada para este turno.
11. Si no hay turno (SIN_TURNO), propone 4 arranques de charla basados en la huella y los temas recientes.
12. Si te dicen los minutos de silencio desde el ultimo turno, decidi si es una conversacion nueva (nuevaConversacion).
13. Quien habla: si la seccion Interlocutor lo dice, podes nombrarlo y adaptar el tono a esa persona. Si no lo dice, no sabes quien es: no lo nombres ni asumas que es alguien de la huella. Las personas de la huella son de quienes se habla, no quien habla.
14. En cada opcion, hechos lista los ids (h1, h2...) de los hechos que usaste para escribirla, como mucho 3. Si no usaste ninguno, va vacia.

Respondes solo JSON, sin texto alrededor, con esta forma:
{"opciones":[{"intencion":"aceptar|rechazar|preguntar|otra","texto":"...","hechos":["h1"]}, ... 4 en total],"registro":"formal|casual|intimo","nuevaConversacion":true|false}`
}

// Fuera los invalidados y los vencidos a la hora del pedido (vencido no es invalidado: sigue en la memoria).
const aliasHecho = (i: number) => `h${i + 1}`

// Orden: importancia por saliencia, mas la coincidencia con el turno; con el mismo tope de cantidad.
function hechosParaPrompt(hechos: Hecho[], cercania: Cercania | undefined, turno: string | null, ahora: Date): Hecho[] {
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
  return hechosVigentes(hechos, ahora)
    .filter((h) => !(cercania === 'formal' && h.intimo))
    .map((h) => ({ h, puntaje: pesoDe(h) + 3 * coincidencias(h) }))
    .sort((a, b) => b.puntaje - a.puntaje || Date.parse(b.h.fecha) - Date.parse(a.h.fecha))
    .slice(0, MAX_HECHOS)
    .map((x) => x.h)
}

// Memoria corta para el prompt: sin descartados y con fin dentro de las ultimas 12 h. Los de menos
// de 5 h entran enteros; los mas viejos, solo con su primera linea. El recorte es de codigo, sin el modelo.
export function seccionMemoriaCorta(resumenes: ResumenConversacion[], ahora: Date): string | null {
  const hace = (r: ResumenConversacion) => ahora.getTime() - Date.parse(r.fin)
  const textos = resumenes
    .filter((r) => !r.descartado && hace(r) <= VENTANA_RESUMENES_MS)
    .map((r) => (hace(r) < RESUMEN_COMPLETO_MS ? r.resumen.split('\n').map((l) => l.trim()).filter(Boolean).join(' ') : primeraLinea(r.resumen)))
    .filter(Boolean)
  return textos.length > 0 ? `# Conversaciones de hoy\n${textos.map((t) => `- ${t}`).join('\n')}` : null
}

// Un resumen escrito en un solo renglon se corta en su primera oracion.
function primeraLinea(resumen: string): string {
  const lineas = resumen.trim().split('\n')
  if (lineas.length > 1) return lineas[0].trim()
  return lineas[0].match(/^.*?[.!?](?=\s|$)/)?.[0] ?? lineas[0]
}

function renderLinea(l: LineaHistorial) {
  return `- ${l.quien === 'usuario' ? 'Usuario' : 'Interlocutor'}: ${l.texto}`
}

function promptUsuario(p: {
  pedido: PedidoOpciones
  perfil: PerfilHuella
  memoria: Memoria
  hechos: Hecho[] // los que entran, ya ordenados
  deteccion: Deteccion
  ahora: Date
}): string {
  const { pedido, perfil, memoria, hechos, deteccion, ahora } = p
  const partes: string[] = []

  partes.push(`# Huella\n\n${perfil.markdown.trim()}`)

  if (hechos.length > 0) {
    const lineas = hechos.map((h, i) => `- [${aliasHecho(i)}] ${textoConFecha(h, ahora)}`)
    partes.push(`## Hechos que sabes\n${lineas.join('\n')}`)
  }

  const ejemplos = [...memoria.ejemplosEstilo]
    .sort((a, b) => peso(b.origen) - peso(a.origen) || Date.parse(b.fecha) - Date.parse(a.fecha))
    .slice(0, MAX_EJEMPLOS)
  if (ejemplos.length > 0) {
    partes.push(`## Frases que dijo hace poco\n${ejemplos.map((e) => `- "${e.texto}"`).join('\n')}`)
  }
  // Los bloques del mes, la semana y el dia anteriores (#34, #37), de lo mas viejo a lo mas nuevo:
  // despues de la huella, para no colgar sus subsecciones de ella.
  for (const corte of ['mes', 'semana', 'dia'] as const) {
    const b = bloqueDe(corte, memoria, pedido.cercania, ahora)
    if (b) partes.push(`# Resumen ${corte === 'dia' ? 'del' : 'de'} ${describirPeriodo(corte, new Date(b.desde))}\n${b.texto}`)
  }

  const memoriaCorta = seccionMemoriaCorta(memoria.resumenes, ahora)
  if (memoriaCorta) partes.push(memoriaCorta)

  partes.push(seccionMomento(ahora))
  partes.push(`# Cercania\n${pedido.cercania ?? 'no aclarada: inferi el registro del turno'}`)
  partes.push(`# Interlocutor\n${pedido.interlocutor?.trim() || 'no aclarado: no sabes quien habla, no lo nombres'}`)

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
    partes.push(`# Opciones rechazadas al pedir Otra\n${pedido.yaMostradas.map((t) => `- ${t}`).join('\n')}\n\nPropone 4 opciones nuevas que cambien de intencion, largo o registro respecto de todas las rechazadas: no parafrasees ni repitas su idea. Mantene 4 intenciones distintas dentro de las nuevas opciones y respeta la huella, la cercania y el limite de palabras. Las rechazadas no son frases dichas por el usuario ni ejemplos de estilo: no las uses como senal de aprendizaje ni infieras cambios en su forma de hablar.`)
  }

  return partes.join('\n\n')
}

const peso = (origen: 'deletreo' | 'opcion') => (origen === 'deletreo' ? 2 : 1)

// --- Respuesta del modelo ----------------------------------------------------

type OpcionConHechos = Opcion & { hechos: string[] } // ids reales de los hechos que uso
type RespuestaModelo = { opciones: OpcionConHechos[]; registro: Registro; nuevaConversacion: boolean }

const MAX_HECHOS_POR_OPCION = 3

async function pedirConReintento(
  proveedor: Proveedor,
  sistema: string,
  usuario: string,
  idsPorAlias: Map<string, string>,
): Promise<RespuestaModelo> {
  const interpretar = (texto: string) => interpretarRespuesta(texto, idsPorAlias)
  const primera = interpretar(await proveedor.generar({ sistema, usuario }))
  if (primera) return primera
  const aviso = '\n\nTu respuesta anterior no era el JSON pedido. Responde solo el JSON, con exactamente 4 opciones.'
  const segunda = interpretar(await proveedor.generar({ sistema, usuario: usuario + aviso }))
  if (segunda) return segunda
  throw new ErrorOpciones(`El proveedor ${proveedor.nombre} devolvio JSON invalido dos veces`)
}

const INTENCIONES: Intencion[] = ['aceptar', 'rechazar', 'preguntar', 'otra']
const REGISTROS: Registro[] = ['formal', 'casual', 'intimo']

// Los ids de hechos que no estaban entre los mandados al modelo se ignoran; sin la lista, ninguno.
function interpretarHechos(valor: unknown, idsPorAlias: Map<string, string>): string[] {
  if (!Array.isArray(valor)) return []
  const ids = valor
    .filter((v): v is string => typeof v === 'string')
    .map((v) => idsPorAlias.get(v.trim().replace(/^\[|\]$/g, '')))
    .filter((id): id is string => id !== undefined)
  return [...new Set(ids)].slice(0, MAX_HECHOS_POR_OPCION)
}

function interpretarRespuesta(texto: string, idsPorAlias: Map<string, string>): RespuestaModelo | null {
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
    opciones: opciones.slice(0, 4).map((o) => ({
      intencion: o.intencion,
      texto: o.texto.trim(),
      hechos: interpretarHechos((o as { hechos?: unknown }).hechos, idsPorAlias),
    })),
    registro: REGISTROS.includes(d.registro as Registro) ? (d.registro as Registro) : 'casual',
    nuevaConversacion: d.nuevaConversacion === true,
  }
}
