// Agente de memoria: corre en segundo plano al cerrarse una conversacion, nunca dentro del turno.
// Recibe la transcripcion cruda y la memoria actual, y devuelve la memoria actualizada:
//   1. extrae hechos de la conversacion cruda (no de un resumen), con fecha;
//   2. los reconcilia con los hechos activos: agregar, actualizar, invalidar o nada (patron Mem0);
//      lo invalidado no se borra: conserva su fecha y gana una fecha de invalidacion;
//   3. escribe un resumen de 2 o 3 lineas para la memoria corta;
//   4. pasa las frases del usuario a los ejemplos de estilo, lo deletreado por encima de lo elegido.
// Todo en una sola llamada al proveedor. Nunca toca el perfil: el almacen no tiene como escribirlo.
import type { LineaHistorial } from '@/eventos'
import { crearOpciones } from './opciones.ts'
import type {
  Almacen,
  ConversacionCerrada,
  EjemploEstilo,
  Hecho,
  Memoria,
  OrigenHecho,
  PerfilHuella,
  Proveedor,
  ResumenConversacion,
} from './tipos.ts'

const MAX_EJEMPLOS_GUARDADOS = 40
const MAX_RESUMENES_GUARDADOS = 50

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

    const activos = memoria.hechos.filter((h) => h.estado === 'activo')
    const sistema = promptSistema()
    const usuario = promptUsuario(conversacion, activos, perfil)
    const respuesta = await pedirConReintento(deps.proveedor, sistema, usuario)
    if (!respuesta) {
      throw new ErrorMemoria(`El proveedor ${deps.proveedor.nombre} devolvio JSON invalido dos veces`, memoria)
    }

    memoria.hechos = reconciliar(memoria.hechos, respuesta.hechos, conversacion)
    if (respuesta.resumen) {
      const resumen: ResumenConversacion = { inicio: conversacion.inicio, fin: conversacion.fin, resumen: respuesta.resumen }
      memoria.resumenes = [...memoria.resumenes, resumen].slice(-MAX_RESUMENES_GUARDADOS)
    }
    return memoria
  }
}

// Disparador en segundo plano: lo que se le pasa a crearOpciones como alCerrarConversacion.
// Devuelve void al instante; el trabajo corre aparte y los errores se loguean, nunca rompen un turno.
// `listo` permite esperar a que terminen los trabajos pendientes (tests, cierre del server).
export function crearDisparadorMemoria(deps: {
  proveedor: Proveedor
  almacen: Almacen
  alTerminar?: (memoria: Memoria) => void
  alFallar?: (error: unknown) => void
}) {
  const agente = crearAgenteMemoria({ proveedor: deps.proveedor })
  let cola: Promise<void> = Promise.resolve()
  const alFallar = deps.alFallar ?? ((e) => console.error('[agente de memoria]', e))

  async function correr(conversacion: ConversacionCerrada) {
    const [perfil, memoria] = await Promise.all([deps.almacen.leerPerfil(), deps.almacen.leerMemoria()])
    let nueva: Memoria
    try {
      nueva = await agente(conversacion, memoria, perfil)
    } catch (e) {
      alFallar(e)
      const parcial = e instanceof ErrorMemoria ? e.memoriaParcial : null
      if (!parcial) return
      nueva = parcial
    }
    // Releer antes de guardar: mientras el modelo pensaba, opciones pudo mover la conversacion actual.
    const fresca = await deps.almacen.leerMemoria()
    const guardar: Memoria = { ...fresca, hechos: nueva.hechos, resumenes: nueva.resumenes, ejemplosEstilo: nueva.ejemplosEstilo }
    await deps.almacen.guardarMemoria(guardar)
    deps.alTerminar?.(guardar)
  }

  function disparar(conversacion: ConversacionCerrada): void {
    // En fila: dos cierres seguidos no se pisan la memoria.
    cola = cola.then(() => correr(conversacion)).catch(alFallar)
  }

  return { disparar, listo: () => cola }
}

// --- Ejemplos de estilo -------------------------------------------------------

// Solo frases del usuario elegidas o deletreadas: las opciones fijas no son su voz.
// Lo deletreado queda primero y es lo ultimo que se recorta.
function sumarEjemplos(actuales: EjemploEstilo[], conversacion: ConversacionCerrada): EjemploEstilo[] {
  const nuevos: EjemploEstilo[] = conversacion.lineas
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

function promptSistema(): string {
  return `Sos el agente de memoria de un sistema de comunicacion aumentativa para una persona con ELA (el usuario). Al terminar una conversacion, lees la transcripcion cruda y actualizas lo que el sistema sabe de su vida. No hablas con nadie.

Tareas:
1. Extrae hechos nuevos o cambiados sobre la vida del usuario y su entorno: planes con fecha, personas, gustos, novedades. Un hecho por item, corto, en tercera persona y autocontenido (que se entienda sin la conversacion; con fechas concretas si las hay).
2. Compara cada hecho con los hechos existentes (cada uno con su id) y elegi una accion:
   - "agregar": es nuevo.
   - "actualizar": cambia o completa uno existente (pone el id); el texto nuevo reemplaza al viejo.
   - "invalidar": la conversacion muestra que uno existente ya no es cierto (pone el id) y no hay nada nuevo que guardar.
   - "nada": ya se sabia igual. No hace falta listarlo.
3. Escribi un resumen de 2 o 3 lineas de la conversacion, para recordar de que se hablo.

Reglas:
- Solo lo que la conversacion dice. Nunca inventes ni deduzcas de mas.
- No guardes charla trivial (saludos, el clima) ni datos sensibles que no sirvan para conversar (contrasenas, numeros de cuenta o documento).
- importancia de 1 a 10: 9-10 salud o eventos familiares grandes; 5-7 planes y personas; 1-3 detalles menores.
- intimo es true si es salud, familia, plata o algo privado.
- linea es el numero de la linea de la transcripcion de donde sale el hecho.
- interlocutor es el nombre de quien hablaba con el usuario si aparece en la conversacion; si no, null.
- La huella la cargo la familia: no repitas hechos que ya esten ahi.

Respondes solo JSON, sin texto alrededor, con esta forma:
{"hechos":[{"accion":"agregar|actualizar|invalidar","id":"solo para actualizar o invalidar","texto":"...","linea":1,"interlocutor":null,"importancia":5,"intimo":false}],"resumen":"..."}`
}

function renderLinea(l: LineaHistorial, i: number) {
  const quien = l.quien === 'usuario' ? `Usuario${l.origen === 'deletreo' ? ' (deletreado)' : ''}` : 'Interlocutor'
  return `${i + 1}. ${quien}: ${l.texto}`
}

function promptUsuario(conversacion: ConversacionCerrada, activos: Hecho[], perfil: PerfilHuella): string {
  const partes: string[] = []
  partes.push(`# Huella (solo lectura)\n\n${perfil.markdown.trim()}`)
  partes.push(
    activos.length > 0
      ? `# Hechos existentes\n${activos.map((h) => `- [${h.id}] (${h.fecha.slice(0, 10)}) ${h.texto}`).join('\n')}`
      : '# Hechos existentes\nNinguno todavia.',
  )
  partes.push(
    `# Conversacion\nDesde ${conversacion.inicio} hasta ${conversacion.fin}. Cercania: ${conversacion.cercania ?? 'no aclarada'}.\n\n` +
      conversacion.lineas.map(renderLinea).join('\n'),
  )
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
}
type RespuestaModelo = { hechos: Candidato[]; resumen: string }

async function pedirConReintento(proveedor: Proveedor, sistema: string, usuario: string) {
  const primera = interpretar(await proveedor.generar({ sistema, usuario }))
  if (primera) return primera
  const aviso = '\n\nTu respuesta anterior no era el JSON pedido. Responde solo el JSON con "hechos" y "resumen".'
  return interpretar(await proveedor.generar({ sistema, usuario: usuario + aviso }))
}

const ACCIONES: Accion[] = ['agregar', 'actualizar', 'invalidar', 'nada']

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
      linea: Number.isInteger(c.linea) ? (c.linea as number) : null,
      interlocutor: typeof c.interlocutor === 'string' && c.interlocutor.trim() !== '' ? c.interlocutor.trim() : null,
      importancia: Number.isFinite(importancia) ? Math.min(10, Math.max(1, importancia)) : 5,
      intimo: c.intimo === true,
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

function reconciliar(hechos: Hecho[], candidatos: Candidato[], conversacion: ConversacionCerrada): Hecho[] {
  const resultado = hechos.map((h) => ({ ...h }))
  const fecha = conversacion.fin
  const activo = (id: string | null) => resultado.find((h) => h.id === id && h.estado === 'activo')
  const invalidar = (h: Hecho) => {
    h.estado = 'invalidado'
    h.fechaInvalidacion = fecha
  }
  const crear = (c: Candidato, reemplazaA?: string): Hecho => ({
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

// crearOpciones con el agente de memoria enganchado: cuando opciones detecta que la conversacion
// anterior cerro, el agente corre en segundo plano. Es lo que usan las rutas.
export function crearOpcionesConMemoria(deps: { proveedor: Proveedor; almacen: Almacen }) {
  const memoria = crearDisparadorMemoria(deps)
  const generarOpciones = crearOpciones({ ...deps, alCerrarConversacion: memoria.disparar })
  return { generarOpciones, memoria }
}
