// Agente de memoria: corre en segundo plano al cerrarse una conversacion, nunca dentro del turno.
// Recibe la transcripcion cruda y la memoria actual, y devuelve la memoria actualizada:
//   1. extrae hechos de la conversacion cruda (no de un resumen), con fecha;
//   2. los reconcilia con los hechos activos: agregar, actualizar, invalidar o nada (patron Mem0);
//      lo invalidado no se borra: conserva su fecha y gana una fecha de invalidacion;
//   3. escribe un resumen de 2 o 3 lineas para la memoria corta;
//   4. pasa las frases del usuario a los ejemplos de estilo, lo deletreado por encima de lo elegido.
// Todo en una sola llamada al proveedor. Nunca toca el perfil: el almacen no tiene como escribirlo.
import type { LineaHistorial } from '@/eventos'
import { enFila } from './fila.ts'
import { crearNiveles, idResumen, type ProveedorRollup } from './niveles.ts'
import { crearCierre, crearOpciones } from './opciones.ts'
import { conservarUsosNuevos } from './saliencia.ts'
import { DIAS_SEMANA, describirDia, describirFecha, estaVencido, finDelDia, resolverFecha } from './fechas.ts'
import type { TiempoEstructurado } from './fechas.ts'
import type {
  Almacen,
  ConversacionCerrada,
  EjemploEstilo,
  Hecho,
  Memoria,
  TipoHecho,
  OrigenHecho,
  PerfilHuella,
  Proveedor,
  ResumenConversacion,
  SalidaProveedor,
} from './tipos.ts'

const MAX_EJEMPLOS_GUARDADOS = 40
const MAX_RESUMENES_GUARDADOS = 50

// Salida estructurada del agente para los proveedores reales. Tiene que coincidir con interpretar().
export const SALIDA_MEMORIA: SalidaProveedor = {
  nombre: 'memoria',
  maxTokens: 2000,
  esquema: {
    type: 'object',
    properties: {
      hechos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            accion: { type: 'string', enum: ['agregar', 'actualizar', 'invalidar', 'nada'] },
            id: { type: 'string' }, // '' si es nuevo
            texto: { type: 'string' },
            linea: { type: 'integer' }, // 0 si no sale de una linea
            interlocutor: { type: 'string' }, // '' si no se sabe
            importancia: { type: 'integer' },
            intimo: { type: 'boolean' },
            tipo: { type: 'string', enum: ['estable', 'estado', 'evento'] },
            // La expresion temporal tal como se dijo y su forma estructurada; la fecha la calcula el codigo.
            // Plano y con todo requerido (vacios en 0 o ''): lo aceptan los dos proveedores.
            tiempo: {
              type: 'object',
              properties: {
                expresion: { type: 'string' }, // '' si el hecho no menciona un momento
                forma: { type: 'string', enum: ['ninguna', 'diaSemana', 'relativo', 'calendario'] },
                diaSemana: { type: 'string', enum: ['', ...DIAS_SEMANA] },
                dias: { type: 'integer' }, // relativo: mañana 1, ayer -1
                dia: { type: 'integer' }, // calendario
                mes: { type: 'integer' },
                anio: { type: 'integer' }, // 0 si no se dijo
                hasta: { type: 'boolean' }, // "hasta el domingo": el fin de un estado
              },
              required: ['expresion', 'forma', 'diaSemana', 'dias', 'dia', 'mes', 'anio', 'hasta'],
              additionalProperties: false,
            },
          },
          required: ['accion', 'id', 'texto', 'linea', 'interlocutor', 'importancia', 'intimo', 'tipo', 'tiempo'],
          additionalProperties: false,
        },
      },
      resumen: { type: 'string' },
    },
    required: ['hechos', 'resumen'],
    additionalProperties: false,
  },
}

export class ErrorMemoria extends Error {
  // Lo que se pudo hacer sin el modelo (los ejemplos de estilo), para guardarlo igual.
  memoriaParcial: Memoria | null
  constructor(mensaje: string, memoriaParcial: Memoria | null = null) {
    super(mensaje)
    this.memoriaParcial = memoriaParcial
    this.name = 'ErrorMemoria'
  }
}

export type DependenciasMemoria = {
  proveedor: Proveedor
}

export type ActualizarMemoria = (
  conversacion: ConversacionCerrada,
  memoria: Memoria,
  perfil: PerfilHuella,
) => Promise<Memoria>

// La funcion del agente. Pura respecto del almacen: no lee ni guarda nada.
// Si el modelo falla dos veces, igual pasa los ejemplos de estilo y tira ErrorMemoria
// con la memoria parcial en `memoriaParcial`, para que quien la llamo decida si guardarla.
export function crearAgenteMemoria(deps: DependenciasMemoria): ActualizarMemoria {
  return async function actualizarMemoria(conversacion, memoriaActual, perfil) {
    const memoria = structuredClone(memoriaActual)
    memoria.ejemplosEstilo = sumarEjemplos(memoria.ejemplosEstilo, conversacion)

    // Los vencidos siguen activos: el agente los ve, marcados, para registrar lo que paso despues.
    const activos = memoria.hechos.filter((h) => h.estado === 'activo')
    const nombre = nombreUsuario(perfil)
    const sistema = promptSistema(nombre)
    const usuario = promptUsuario(conversacion, activos, perfil)
    const respuesta = await pedirConReintento(deps.proveedor, sistema, usuario)
    if (!respuesta) {
      throw new ErrorMemoria(`El proveedor ${deps.proveedor.nombre} devolvio JSON invalido dos veces`, memoria)
    }
    // El nombre del usuario nunca es el interlocutor: el interlocutor suele nombrarlo al hablarle.
    for (const c of respuesta.hechos) {
      if (nombre && c.interlocutor && normalizar(c.interlocutor) === normalizar(nombre)) c.interlocutor = null
      // Si la interfaz aclaro quien hablaba, eso vale para lo que salio de sus lineas.
      const linea = c.linea !== null ? conversacion.lineas[c.linea - 1] : undefined
      if (!c.interlocutor && conversacion.interlocutor && linea?.quien === 'interlocutor') c.interlocutor = conversacion.interlocutor
    }

    memoria.hechos = reconciliar(memoria.hechos, respuesta.hechos, conversacion)
    if (respuesta.resumen) {
      const resumen: ResumenConversacion = { inicio: conversacion.inicio, fin: conversacion.fin, resumen: respuesta.resumen }
      resumen.id = idResumen(resumen) // para citarlo como fuente de los bloques de dia
      // La cola de una conversacion cerrada por tiempo trae el resumen de toda la conversacion: reemplaza al de antes.
      const otros = memoria.resumenes.filter((r) => r.inicio !== conversacion.inicio)
      memoria.resumenes = [...otros, resumen].slice(-MAX_RESUMENES_GUARDADOS)
    }
    return memoria
  }
}

// Disparador en segundo plano: lo que se le pasa a crearOpciones como alCerrarConversacion.
// Devuelve void al instante; el trabajo corre aparte y los errores se loguean, nunca rompen un turno.
// `listo` permite esperar a que terminen los trabajos pendientes (tests, cierre del server).
// Con proveedorRollup, despues del agente arma los niveles (ver niveles.ts); un rollup que falla
// va a alFallarNivel, no a alFallar: no rompe el cierre y se reintenta en el proximo.
export function crearDisparadorMemoria(deps: {
  proveedor: Proveedor
  almacen: Almacen
  alTerminar?: (memoria: Memoria) => void
  alFallar?: (error: unknown) => void
  proveedorRollup?: ProveedorRollup
  reloj?: () => Date
  alFallarNivel?: (error: unknown) => void
}) {
  const agente = crearAgenteMemoria({ proveedor: deps.proveedor })
  let cola: Promise<void> = Promise.resolve()
  const alFallar = deps.alFallar ?? ((e) => console.error('[agente de memoria]', e))
  const alFallarNivel = deps.alFallarNivel ?? ((e) => console.error('[niveles de memoria]', e))
  const reloj = deps.reloj ?? (() => new Date())
  const niveles = deps.proveedorRollup
    ? crearNiveles({ almacen: deps.almacen, proveedorRollup: deps.proveedorRollup })
    : null

  async function consolidar() {
    if (!niveles) return
    try {
      await niveles.alCerrar(reloj())
    } catch (e) {
      alFallarNivel(e)
    }
  }

  // true si el agente termino bien: solo ahi se arman los niveles, que necesitan su resumen.
  async function correr(conversacion: ConversacionCerrada): Promise<boolean> {
    const [perfil, memoria] = await Promise.all([deps.almacen.leerPerfil(), deps.almacen.leerMemoria()])
    let nueva: Memoria
    let ok = true
    try {
      nueva = await agente(conversacion, memoria, perfil)
    } catch (e) {
      alFallar(e)
      const parcial = e instanceof ErrorMemoria ? e.memoriaParcial : null
      if (!parcial) return false
      nueva = parcial
      ok = false
    }
    // Releer antes de guardar (en fila): mientras el modelo pensaba, opciones o un cierre pudieron
    // mover la conversacion actual. Desde aca solo se escriben hechos, resumenes y ejemplos.
    const guardar = await enFila(deps.almacen, async () => {
      const fresca = await deps.almacen.leerMemoria()
      // Las elecciones registradas mientras tanto (saliencia) no se pierden.
      const hechos = conservarUsosNuevos(nueva.hechos, fresca.hechos)
      const m: Memoria = { ...fresca, hechos, resumenes: nueva.resumenes, ejemplosEstilo: nueva.ejemplosEstilo }
      await deps.almacen.guardarMemoria(m)
      return m
    })
    deps.alTerminar?.(guardar)
    return ok
  }

  function disparar(conversacion: ConversacionCerrada): void {
    // En fila: dos cierres seguidos no se pisan la memoria. Los niveles van despues del agente; si
    // el agente falla, esperan al proximo cierre (si no, el dia se armaria sin esta conversacion).
    cola = cola
      .then(() => correr(conversacion))
      .then((ok) => (ok ? consolidar() : undefined))
      .catch(alFallar)
  }

  // "Consolidar ahora" (demo): en la misma fila, ignorando el corte. El error vuelve a quien llama.
  function consolidarAhora() {
    if (!niveles) return Promise.reject(new Error('Sin proveedorRollup no hay niveles'))
    const trabajo = cola.then(() => niveles.consolidarAhora(reloj()))
    cola = trabajo.then(
      () => {},
      () => {},
    )
    return trabajo
  }

  return { disparar, consolidarAhora, listo: () => cola }
}

// --- Ejemplos de estilo -------------------------------------------------------

// Solo frases del usuario elegidas o deletreadas: las opciones fijas no son su voz.
// Lo deletreado queda primero y es lo ultimo que se recorta.
function sumarEjemplos(actuales: EjemploEstilo[], conversacion: ConversacionCerrada): EjemploEstilo[] {
  // En la cola de una conversacion cerrada por tiempo, las ya aprendidas ya sumaron sus ejemplos.
  const nuevos: EjemploEstilo[] = conversacion.lineas
    .slice(conversacion.yaAprendidas ?? 0)
    .filter((l) => l.quien === 'usuario' && (l.origen === 'deletreo' || l.origen === 'opcion'))
    .map((l) => ({ texto: l.texto.trim(), origen: l.origen as 'deletreo' | 'opcion', fecha: conversacion.fin }))
    .filter((e) => e.texto !== '')

  const porTexto = new Map<string, EjemploEstilo>()
  for (const e of [...actuales, ...nuevos]) {
    const clave = e.texto.toLowerCase()
    const previo = porTexto.get(clave)
    // Si una frase aparece deletreada alguna vez, cuenta como deletreada.
    const origen = previo?.origen === 'deletreo' || e.origen === 'deletreo' ? 'deletreo' : 'opcion'
    porTexto.set(clave, { ...e, origen })
  }
  const peso = (o: EjemploEstilo['origen']) => (o === 'deletreo' ? 2 : 1)
  return [...porTexto.values()]
    .sort((a, b) => peso(b.origen) - peso(a.origen) || Date.parse(b.fecha) - Date.parse(a.fecha))
    .slice(0, MAX_EJEMPLOS_GUARDADOS)
}

// --- Prompt ------------------------------------------------------------------

// El nombre del usuario sale del primer titulo de la huella ("# Roberto").
export function nombreUsuario(perfil: PerfilHuella): string | null {
  const m = perfil.markdown.match(/^#\s+(.+?)\s*$/m)
  return m ? m[1] : null
}

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

function promptSistema(nombre: string | null): string {
  const usuario = nombre ? `el usuario, que se llama ${nombre}` : 'el usuario'
  return `Sos el agente de memoria de un sistema de comunicacion aumentativa para una persona con ELA (${usuario}). Al terminar una conversacion, lees la transcripcion cruda y actualizas lo que el sistema sabe de su vida. No hablas con nadie.

Tareas:
1. Extrae hechos nuevos o cambiados sobre la vida del usuario y su entorno: planes con fecha, personas, gustos, novedades. Un hecho por item, corto, en tercera persona y autocontenido (que se entienda sin la conversacion). Si menciona un momento, dejalo como se dijo ("el jueves"): la fecha concreta la calcula el sistema con el campo tiempo, no la escribas vos.
2. Compara cada hecho con los hechos existentes (cada uno con su id) y elegi una accion:
   - "agregar": es nuevo.
   - "actualizar": cambia o completa uno existente (pone el id); el texto nuevo reemplaza al viejo.
   - "invalidar": la conversacion muestra que uno existente ya no es cierto (pone el id) y no hay nada nuevo que guardar.
   - "nada": ya se sabia igual. No hace falta listarlo.
3. Escribi un resumen de 2 o 3 lineas de la conversacion, para recordar de que se hablo. Separa las lineas con salto de linea y pone lo mas importante en la primera: con el paso de las horas solo se recuerda esa.

Reglas:
- Solo lo que la conversacion dice. Nunca inventes ni deduzcas de mas.
- No guardes charla trivial (saludos, el clima) ni datos sensibles que no sirvan para conversar (contrasenas, numeros de cuenta o documento).
- importancia de 1 a 10: 9-10 salud o eventos familiares grandes; 5-7 planes y personas; 1-3 detalles menores.
- intimo es true si es salud, familia, plata o algo privado.
- linea es el numero de la linea de la transcripcion de donde sale el hecho.
- interlocutor es quien le hablaba al usuario, solo si se sabe: porque se presenta ("soy Laura"), porque el usuario lo nombra al responderle, o por su rol ("doctor"). Si no, vacio.
- El nombre del usuario${nombre ? ` (${nombre})` : ''} nunca es el interlocutor. Cuando el interlocutor dice un nombre al hablar ("Che, ${nombre ?? 'Roberto'}..."), casi siempre es el del usuario. Las personas de la huella tampoco son el interlocutor salvo que la conversacion lo muestre.
- La huella la cargo la familia: no repitas hechos que ya esten ahi.
- tipo: "estable" si no cambia con el tiempo (de que equipo es, a quien quiere); "estado" si es cierto por un tiempo (esta de viaje, esta enferma); "evento" si pasa en un momento (se opera el jueves, viene el domingo).
- tiempo: si el hecho menciona un momento, pone en expresion las palabras tal como se dijeron ("el jueves", "mañana", "el 20 de noviembre") y elegi la forma. No hagas cuentas de fechas: las hace el sistema a partir del dia del cierre.
  - "diaSemana": un dia de la semana ("el jueves"). diaSemana sin tildes: domingo, lunes, martes, miercoles, jueves, viernes, sabado.
  - "relativo": dias desde hoy en dias (mañana 1, pasado mañana 2, en una semana 7, ayer -1, hoy 0).
  - "calendario": una fecha del calendario en dia y mes; anio solo si se dijo, si no 0.
  - "ninguna": no menciona un momento, o es vago ("pronto", "algun dia"). expresion vacia.
  - hasta es true si el momento es el fin de algo ("esta de viaje hasta el domingo"): la forma es la del dia en que termina.
  Los campos que no usa la forma van en 0 o vacios.
- Los hechos existentes marcados como vencidos ya pasaron su fecha: siguen siendo historia. Si la conversacion cuenta como salio, agrega o actualiza.

Respondes solo JSON, sin texto alrededor, con esta forma:
{"hechos":[{"accion":"agregar|actualizar|invalidar","id":"el id existente para actualizar o invalidar; vacio si es nuevo","texto":"...","linea":1,"interlocutor":"","importancia":5,"intimo":false,"tipo":"evento","tiempo":{"expresion":"el jueves","forma":"diaSemana","diaSemana":"jueves","dias":0,"dia":0,"mes":0,"anio":0,"hasta":false}}],"resumen":"..."}`
}

function renderLinea(l: LineaHistorial, i: number) {
  const quien = l.quien === 'usuario' ? `Usuario${l.origen === 'deletreo' ? ' (deletreado)' : ''}` : 'Interlocutor'
  return `${i + 1}. ${quien}: ${l.texto}`
}

// "- [id] (2026-11-10) Laura se opera (evento, el jueves 12/11, ayer, vencido)"
function renderHechoExistente(h: Hecho, ahora: Date) {
  const tiempo = [
    h.tipo,
    h.fechaEvento ? describirFecha(h.fechaEvento, ahora) : null,
    estaVencido(h, ahora) ? 'vencido' : null,
  ].filter(Boolean)
  const detalle = tiempo.length > 0 ? ` (${tiempo.join(', ')})` : ''
  return `- [${h.id}] (${h.fecha.slice(0, 10)}) ${h.texto}${detalle}`
}

function promptUsuario(conversacion: ConversacionCerrada, activos: Hecho[], perfil: PerfilHuella): string {
  const cierre = new Date(conversacion.fin)
  const partes: string[] = []
  partes.push(`# Hoy\nLa conversacion cerro el ${describirDia(cierre)} (hora de Argentina).`)
  partes.push(`# Huella (solo lectura)\n\n${perfil.markdown.trim()}`)
  partes.push(
    activos.length > 0
      ? `# Hechos existentes\n${activos.map((h) => renderHechoExistente(h, cierre)).join('\n')}`
      : '# Hechos existentes\nNinguno todavia.',
  )
  partes.push(
    `# Conversacion\nDesde ${conversacion.inicio} hasta ${conversacion.fin}. Cercania: ${conversacion.cercania ?? 'no aclarada'}. Interlocutor: ${conversacion.interlocutor || 'no aclarado'}.\n\n` +
      conversacion.lineas.map(renderLinea).join('\n'),
  )
  const n = conversacion.yaAprendidas ?? 0
  if (n > 0) {
    partes.push(
      `# Ya aprendido\nLas lineas 1 a ${n} ya se aprendieron antes: usalas solo como contexto. Extrae hechos solo de la linea ${n + 1} en adelante. El resumen es de toda la conversacion.`,
    )
  }
  return partes.join('\n\n')
}

// --- Respuesta del modelo ----------------------------------------------------

type Accion = 'agregar' | 'actualizar' | 'invalidar' | 'nada'
type Candidato = {
  accion: Accion
  id: string | null
  texto: string
  linea: number | null
  interlocutor: string | null
  importancia: number
  intimo: boolean
  tipo: TipoHecho | null
  expresion: string | null
  tiempo: TiempoEstructurado
  hasta: boolean
}
type RespuestaModelo = { hechos: Candidato[]; resumen: string }

async function pedirConReintento(proveedor: Proveedor, sistema: string, usuario: string) {
  const primera = interpretar(await proveedor.generar({ sistema, usuario, salida: SALIDA_MEMORIA }))
  if (primera) return primera
  const aviso = '\n\nTu respuesta anterior no era el JSON pedido. Responde solo el JSON con "hechos" y "resumen".'
  return interpretar(await proveedor.generar({ sistema, usuario: usuario + aviso, salida: SALIDA_MEMORIA }))
}

const ACCIONES: Accion[] = ['agregar', 'actualizar', 'invalidar', 'nada']
const TIPOS: TipoHecho[] = ['estable', 'estado', 'evento']

// Tolerante: una respuesta sin tiempo (o con algo raro) queda sin fecha, nunca rompe el hecho.
function interpretarTiempo(valor: unknown): { expresion: string | null; tiempo: TiempoEstructurado; hasta: boolean } {
  if (typeof valor !== 'object' || valor === null) return { expresion: null, tiempo: { forma: 'ninguna' }, hasta: false }
  const t = valor as Record<string, unknown>
  const expresion = typeof t.expresion === 'string' && t.expresion.trim() !== '' ? t.expresion.trim() : null
  const entero = (v: unknown) => (Number.isInteger(v) ? (v as number) : NaN)
  let tiempo: TiempoEstructurado = { forma: 'ninguna' }
  if (t.forma === 'diaSemana' && typeof t.diaSemana === 'string') tiempo = { forma: 'diaSemana', diaSemana: t.diaSemana }
  else if (t.forma === 'relativo') tiempo = { forma: 'relativo', dias: entero(t.dias) }
  else if (t.forma === 'calendario') {
    tiempo = { forma: 'calendario', dia: entero(t.dia), mes: entero(t.mes), anio: entero(t.anio) || null }
  }
  return { expresion, tiempo, hasta: t.hasta === true }
}

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
  if (!Array.isArray(d.hechos) || typeof d.resumen !== 'string') return null
  const hechos: Candidato[] = []
  for (const h of d.hechos) {
    if (typeof h !== 'object' || h === null) continue
    const c = h as Record<string, unknown>
    if (!ACCIONES.includes(c.accion as Accion)) continue
    const importancia = Math.round(Number(c.importancia))
    hechos.push({
      accion: c.accion as Accion,
      id: typeof c.id === 'string' && c.id !== '' ? c.id : null,
      texto: typeof c.texto === 'string' ? c.texto.trim() : '',
      linea: Number.isInteger(c.linea) && (c.linea as number) > 0 ? (c.linea as number) : null,
      interlocutor: typeof c.interlocutor === 'string' && c.interlocutor.trim() !== '' ? c.interlocutor.trim() : null,
      importancia: Number.isFinite(importancia) ? Math.min(10, Math.max(1, importancia)) : 5,
      intimo: c.intimo === true,
      tipo: TIPOS.includes(c.tipo as TipoHecho) ? (c.tipo as TipoHecho) : null,
      ...interpretarTiempo(c.tiempo),
    })
  }
  return { hechos, resumen: d.resumen.trim() }
}

// --- Reconciliacion ----------------------------------------------------------

function origenDe(conversacion: ConversacionCerrada, linea: number | null): OrigenHecho {
  const l = linea !== null ? conversacion.lineas[linea - 1] : undefined
  if (!l || l.quien === 'interlocutor') return 'interlocutor'
  return l.origen ?? 'opcion'
}

let secuencia = 0
function nuevoId(fecha: string) {
  return `h-${Date.parse(fecha).toString(36)}-${(secuencia++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

// Los campos de tiempo de un hecho nuevo. La fecha se calcula contra el fin de la conversacion;
// si no se puede (imposible, a mas de un año), el hecho se guarda igual, sin fecha ni vencimiento.
function camposDeTiempo(c: Candidato, referencia: Date): Partial<Hecho> {
  const campos: Partial<Hecho> = {}
  if (c.tipo) campos.tipo = c.tipo
  if (c.expresion) campos.expresionOriginal = c.expresion
  // Solo vencen un evento y lo que tiene un "hasta". Un estable nunca. Un estado sin "hasta" tampoco:
  // el momento no es su fin, sigue hasta que una conversacion lo contradiga o la familia lo invalide.
  const vence = c.tipo === 'evento' || (c.tipo === 'estado' && c.hasta)
  if (!vence) return campos
  const fecha = resolverFecha(c.tiempo, referencia)
  const fin = fecha ? finDelDia(fecha) : null
  if (!fecha || !fin) return campos
  // Un "hasta" marca el fin de algo: vence ese dia, pero no es el dia de un evento. Si el agente lo llamo
  // evento ("esta de viaje hasta el domingo"), queda como evento sin fechaEvento, con validoHasta.
  if (!c.hasta) campos.fechaEvento = fecha
  campos.validoHasta = fin
  return campos
}

function reconciliar(hechos: Hecho[], candidatos: Candidato[], conversacion: ConversacionCerrada): Hecho[] {
  const resultado = hechos.map((h) => ({ ...h }))
  const fecha = conversacion.fin
  const activo = (id: string | null) => resultado.find((h) => h.id === id && h.estado === 'activo')
  const invalidar = (h: Hecho) => {
    h.estado = 'invalidado'
    h.fechaInvalidacion = fecha
  }
  const crear = (c: Candidato, reemplazaA?: string): Hecho => ({
    ...camposDeTiempo(c, new Date(fecha)),
    id: nuevoId(fecha),
    texto: c.texto,
    origen: origenDe(conversacion, c.linea),
    interlocutor: c.interlocutor,
    importancia: c.importancia,
    fecha,
    estado: 'activo',
    fechaInvalidacion: null,
    intimo: c.intimo,
    ...(reemplazaA ? { reemplazaA } : {}),
  })

  for (const c of candidatos) {
    if (c.accion === 'nada') continue
    if (c.accion === 'invalidar') {
      const viejo = activo(c.id)
      if (viejo) invalidar(viejo)
      continue
    }
    if (c.texto === '') continue
    if (c.accion === 'actualizar') {
      const viejo = activo(c.id)
      if (viejo) {
        invalidar(viejo)
        resultado.push(crear(c, viejo.id))
        continue
      }
      // Si el id no existe, lo tratamos como nuevo.
    }
    // agregar: no duplicar un hecho activo con el mismo texto.
    const repetido = resultado.some((h) => h.estado === 'activo' && h.texto.toLowerCase() === c.texto.toLowerCase())
    if (!repetido) resultado.push(crear(c))
  }
  return resultado
}

// --- Cableado ------------------------------------------------------------------

// crearOpciones y el cierre con el agente de memoria enganchado: cuando opciones detecta que la
// conversacion anterior cerro, o se la cierra por tiempo o a mano, el agente corre en segundo plano.
// Con proveedorRollup, despues del agente se arman los niveles (dia, semana y mes; #34, #37).
// Es lo que usa el servidor (servidor.ts).
export function crearOpcionesConMemoria(deps: {
  proveedor: Proveedor
  almacen: Almacen
  alFallar?: (error: unknown) => void
  proveedorRollup?: ProveedorRollup
}) {
  const memoria = crearDisparadorMemoria(deps)
  const generarOpciones = crearOpciones({ proveedor: deps.proveedor, almacen: deps.almacen, alCerrarConversacion: memoria.disparar })
  const cierre = crearCierre({ almacen: deps.almacen, alCerrarConversacion: memoria.disparar })
  return { generarOpciones, cierre, memoria }
}
