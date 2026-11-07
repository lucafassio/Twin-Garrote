// Huella aprendida (#38): un bloque corto con lo que el sistema aprendio del usuario (gustos,
// personas y como las llama, forma de hablar, temas a evitar). Se propone en segundo plano al
// cerrar una conversacion que cruza un corte de mes, o con "Consolidar ahora"; la familia la acepta
// o la descarta en "Lo que aprendi de vos". Solo la aceptada entra al prompt de opciones, marcada
// como aprendida, al lado de la huella base (el perfil), que nunca cambia: el almacen no tiene como
// escribirla.
//
// La propuesta sale del bloque de mes mas reciente (o, si no hay, el de semana o el de dia mas
// reciente), los hechos activos de importancia alta y los ejemplos de estilo, mas la aceptada
// anterior y las descartadas para no repetirlas. Una sola llamada, salida estructurada, fuentes
// obligatorias. Con cercania formal no entra si cita algo intimo, derivado de las fuentes.
import type { Cercania } from '@/eventos'
import { dejaronDeValer } from './descartes.ts'
import { estaVencido } from './fechas.ts'
import { enFila } from './fila.ts'
import { citaIntimo, hechosIntimos, nivelesDe, type ProveedorRollup } from './niveles.ts'
import { enArgentina, periodoDe } from './periodos.ts'
import type {
  Almacen,
  Bloque,
  Hecho,
  HuellaAceptada,
  HuellaAprendida,
  Memoria,
  PropuestaHuella,
  Proveedor,
  SalidaProveedor,
} from './tipos.ts'

export const TOPE_HUELLA = 1500
export const IMPORTANCIA_ALTA = 8
// El id con el que la huella cita a los ejemplos de estilo (no tienen id propio).
export const FUENTE_FRASES = 'frases'
const MAX_HECHOS = 25
const MAX_FRASES = 12
const MAX_DESCARTADAS = 20

// Salida estructurada de la propuesta. Tiene que coincidir con interpretar().
export const SALIDA_HUELLA: SalidaProveedor = {
  nombre: 'huella',
  maxTokens: 1000,
  esquema: {
    type: 'object',
    properties: {
      texto: { type: 'string' },
      fuentes: { type: 'array', items: { type: 'string' } },
    },
    required: ['texto', 'fuentes'],
    additionalProperties: false,
  },
}

export class ErrorHuella extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorHuella'
  }
}

export function huellaDe(memoria: Memoria): HuellaAprendida {
  return memoria.huellaAprendida ?? {}
}

// La propuesta que la familia puede decidir: una descartada por invalidar un hecho (#40) no cuenta.
export function propuestaPendiente(h: HuellaAprendida): PropuestaHuella | null {
  return h.propuesta && !h.propuesta.descartado ? h.propuesta : null
}

// La aceptada que vale: una para revisar (citaba un hecho invalidado, #40) no, hasta que la familia
// la vuelva a aceptar.
export function aceptadaVigente(h: HuellaAprendida): HuellaAceptada | null {
  return h.aceptada && !h.aceptada.paraRevisar ? h.aceptada : null
}

// La aceptada que entra al prompt de opciones, o null. Con cercania formal, ninguna que cite algo intimo.
export function huellaParaPrompt(memoria: Memoria, cercania: Cercania | undefined): HuellaAceptada | null {
  const aceptada = aceptadaVigente(huellaDe(memoria))
  if (!aceptada || aceptada.texto.trim() === '') return null
  if (cercania === 'formal' && citaIntimo(aceptada, memoria)) return null
  return aceptada
}

// Una fuente en palabras, para "Lo que aprendi de vos".
export type FuenteDescrita = { id: string; texto: string }

const hechosPorId = (memoria: Memoria) => new Map(memoria.hechos.map((h) => [h.id, h]))

function bloquesPorId(memoria: Memoria): Map<string, Bloque> {
  const niveles = nivelesDe(memoria)
  return new Map([...niveles.dia, ...niveles.semana, ...niveles.mes].map((b) => [b.id, b]))
}

export function describirFuentes(fuentes: string[], memoria: Memoria): FuenteDescrita[] {
  const hechos = hechosPorId(memoria)
  const bloques = bloquesPorId(memoria)
  return fuentes.map((id) => {
    if (id === FUENTE_FRASES) return { id, texto: 'Frases que dijo' }
    const h = hechos.get(id)
    // Una huella para revisar (#40) muestra cual de sus fuentes se invalido.
    if (h) return { id, texto: h.estado === 'invalidado' ? `${h.texto} (ya no vale)` : h.texto }
    const b = bloques.get(id)
    if (b) return { id, texto: `Resumen ${nombreBloque(b)}` }
    return { id, texto: id }
  })
}

// "del mes del 2026-10-01": el nivel sale del id del bloque ('mes-2026-10-01').
function nombreBloque(b: Bloque): string {
  const nivel = b.id.split('-')[0]
  return `${nivel === 'semana' ? 'de la semana' : `del ${nivel}`} del ${enArgentina(new Date(b.desde)).slice(0, 10)}`
}

// --- Propuesta -------------------------------------------------------------------

type Material = {
  bloque: Bloque | null
  hechos: Hecho[]
  frases: string[]
  aceptada: HuellaAceptada | null
  descartadas: string[]
}

const masNuevo = (bloques: Bloque[]) =>
  bloques.filter((b) => !b.descartado).sort((a, b) => Date.parse(b.desde) - Date.parse(a.desde))[0] ?? null

function materialDe(memoria: Memoria, ahora: Date): Material {
  const niveles = nivelesDe(memoria)
  const huella = huellaDe(memoria)
  const frases = [...memoria.ejemplosEstilo]
    .sort((a, b) => Number(b.origen === 'deletreo') - Number(a.origen === 'deletreo') || Date.parse(b.fecha) - Date.parse(a.fecha))
    .slice(0, MAX_FRASES)
    .map((e) => e.texto)
  return {
    bloque: masNuevo(niveles.mes) ?? masNuevo(niveles.semana) ?? masNuevo(niveles.dia),
    hechos: memoria.hechos
      .filter((h) => h.estado === 'activo' && h.importancia >= IMPORTANCIA_ALTA && !estaVencido(h, ahora))
      .sort((a, b) => b.importancia - a.importancia || Date.parse(b.fecha) - Date.parse(a.fecha))
      .slice(0, MAX_HECHOS),
    frases,
    // Una aceptada para revisar cuenta algo invalidado: la propuesta no parte de ella.
    aceptada: aceptadaVigente(huella),
    descartadas: huella.descartadas ?? [],
  }
}

function promptSistema(): string {
  return `Sos el agente de memoria de un sistema de comunicacion aumentativa para una persona con ELA (el usuario). Propones un bloque corto con lo que aprendiste de el en sus conversaciones, para sumar al lado de la huella que cargo la familia. La familia lo va a leer y decidir si lo acepta. No hablas con nadie.

Reglas:
- Hasta ${TOPE_HUELLA} caracteres, en tercera persona, en lineas cortas que empiecen con "- ". Solo lo que sirve para hablar por el: gustos, personas y como las llama, forma de hablar (muletillas, voseo, humor), temas a evitar.
- Solo lo que dicen las fuentes. Nunca inventes ni deduzcas de mas. Nada de sintomas ni de cosas que van a pasar en una fecha: eso no es como es el.
- Si hay una huella aprendida anterior, parti de ella: conserva lo que sigue valiendo y suma lo nuevo. El texto reemplaza al anterior.
- Nunca propongas de nuevo algo que la familia descarto.
- Si no hay nada nuevo que valga la pena, responde texto vacio.
- fuentes: los ids (entre corchetes) de todo lo que uses. Al menos uno si hay texto.

Respondes solo JSON, sin texto alrededor, con esta forma:
{"texto":"...","fuentes":["id", ...]}`
}

function promptUsuario(material: Material): string {
  const m = material
  const partes: string[] = []
  partes.push(m.bloque ? `# Resumen mas reciente\n[${m.bloque.id}] ${m.bloque.texto}` : '# Resumen mas reciente\nNinguno.')
  partes.push(
    m.hechos.length > 0
      ? `# Hechos importantes\n${m.hechos.map((h) => `- [${h.id}] ${h.texto}`).join('\n')}`
      : '# Hechos importantes\nNinguno.',
  )
  if (m.frases.length > 0) partes.push(`# Frases que dijo [${FUENTE_FRASES}]\n${m.frases.map((f) => `- "${f}"`).join('\n')}`)
  if (m.aceptada) partes.push(`# Huella aprendida anterior (aceptada por la familia)\n${m.aceptada.texto}`)
  if (m.descartadas.length > 0) {
    partes.push(`# Descartadas por la familia (no las repitas)\n${m.descartadas.map((d) => `- ${d.replace(/\s*\n\s*/g, ' / ')}`).join('\n')}`)
  }
  return partes.join('\n\n')
}

// Corta en el ultimo fin de linea u oracion antes del tope.
function recortar(texto: string): string {
  if (texto.length <= TOPE_HUELLA) return texto
  const corte = texto.slice(0, TOPE_HUELLA)
  const fin = Math.max(corte.lastIndexOf('\n'), corte.lastIndexOf('. ') + 1)
  return (fin > TOPE_HUELLA / 2 ? corte.slice(0, fin) : corte).trim()
}

const normalizar = (t: string) => t.trim().replace(/\s+/g, ' ').toLowerCase()

// Igual a la aceptada o a una descartada: no se vuelve a proponer.
const repetida = (huella: HuellaAprendida, texto: string) =>
  [huella.aceptada?.texto ?? '', ...(huella.descartadas ?? [])].some((t) => normalizar(t) === normalizar(texto))

// null si el JSON no sirve. Las fuentes que no se mandaron (inventadas) se descartan.
function interpretar(texto: string, validas: Set<string>): { texto: string; fuentes: string[] } | null {
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
  if (typeof d.texto !== 'string' || !Array.isArray(d.fuentes)) return null
  const fuentes = [...new Set(d.fuentes.filter((f): f is string => typeof f === 'string' && validas.has(f)))]
  const t = d.texto.trim()
  if (t !== '' && fuentes.length === 0) return null
  return { texto: recortar(t), fuentes }
}

// Los ids de todo lo que puede citar la propuesta.
function idsDe(material: Material): Set<string> {
  const ids = new Set([...(material.bloque ? [material.bloque.id] : []), ...material.hechos.map((h) => h.id)])
  if (material.frases.length > 0) ids.add(FUENTE_FRASES)
  return ids
}

// Pide la propuesta. null si no hay material o no hay nada nuevo (vacia, igual a la aceptada o a una
// descartada). Tira ErrorHuella si el modelo devuelve algo invalido dos veces.
async function proponer(memoria: Memoria, ahora: Date, proveedor: Proveedor): Promise<PropuestaHuella | null> {
  const material = materialDe(memoria, ahora)
  if (!material.bloque && material.hechos.length === 0) return null
  const validas = idsDe(material)
  const sistema = promptSistema()
  const usuario = promptUsuario(material)
  let respuesta = interpretar(await proveedor.generar({ sistema, usuario, salida: SALIDA_HUELLA }), validas)
  if (!respuesta) {
    const aviso = '\n\nTu respuesta anterior no era el JSON pedido. Responde solo el JSON con "texto" y "fuentes" (ids de la lista).'
    respuesta = interpretar(await proveedor.generar({ sistema, usuario: usuario + aviso, salida: SALIDA_HUELLA }), validas)
  }
  if (!respuesta) throw new ErrorHuella(`El proveedor ${proveedor.nombre} devolvio una huella invalida dos veces`)
  if (respuesta.texto === '' || repetida(huellaDe(memoria), respuesta.texto)) return null
  // Lo intimo que vio el modelo queda en las fuentes aunque no lo cite: la regla de privacidad sale
  // de lo que vio, no de lo que dice haber usado. La aceptada anterior pasa lo suyo. Se guardan como
  // ids de hecho, que nunca se borran: si despues se recorta el bloque, siguen contando.
  const vistas = [...validas, ...(material.aceptada?.fuentes ?? [])]
  const fuentes = [...new Set([...respuesta.fuentes, ...hechosIntimos({ fuentes: vistas }, memoria)])]
  return { texto: respuesta.texto, fuentes, fecha: ahora.toISOString() }
}

// Toca proponer si se cruzo un corte de mes desde la ultima propuesta. Sin propuestas previas, desde
// la conversacion mas vieja que se recuerda: la primera llega al cruzar el primer corte de mes.
// Una propuesta descartada por invalidar un hecho (#40) se rehace en el proximo cierre, sin esperar.
function tocaProponer(memoria: Memoria, ahora: Date): boolean {
  const huella = huellaDe(memoria)
  if (huella.propuesta && !propuestaPendiente(huella)) return true
  const inicios = memoria.resumenes.map((r) => Date.parse(r.inicio)).filter(Number.isFinite)
  const ultima = huellaDe(memoria).ultimaPropuesta
  const desde = ultima ? Date.parse(ultima) : inicios.length > 0 ? Math.min(...inicios) : NaN
  return Number.isFinite(desde) && desde < periodoDe('mes', ahora).desde.getTime()
}

// --- Escritura (en fila: releer antes de guardar) ---------------------------------

function cambiarHuella<T>(
  almacen: Almacen,
  cambio: (h: HuellaAprendida, fresca: Memoria) => { huella: HuellaAprendida; valor: T } | null,
) {
  return enFila(almacen, async () => {
    const fresca = await almacen.leerMemoria()
    const cambiada = cambio(huellaDe(fresca), fresca)
    if (!cambiada) return null
    await almacen.guardarMemoria({ ...fresca, huellaAprendida: cambiada.huella })
    return cambiada.valor
  })
}

function sinPropuesta(h: HuellaAprendida): HuellaAprendida {
  const resto = { ...h }
  delete resto.propuesta
  return resto
}

// Un texto mas en descartadas: no se vuelve a proponer igual.
const conDescartada = (h: HuellaAprendida, texto: string) => [...(h.descartadas ?? []), texto].slice(-MAX_DESCARTADAS)

// La pendiente pasa a aceptada (reemplaza a la anterior). null si no habia pendiente.
export function aceptarHuella(almacen: Almacen, ahora: Date = new Date()): Promise<HuellaAceptada | null> {
  return cambiarHuella(almacen, (h) => {
    const propuesta = propuestaPendiente(h)
    if (!propuesta) return null
    const aceptada = { texto: recortar(propuesta.texto), fuentes: propuesta.fuentes, fechaAceptacion: ahora.toISOString() }
    return { huella: { ...sinPropuesta(h), aceptada }, valor: aceptada }
  })
}

// La pendiente pasa a descartadas: no entra al prompt ni se vuelve a proponer igual. false si no habia.
export async function descartarHuella(almacen: Almacen): Promise<boolean> {
  const r = await cambiarHuella(almacen, (h) => {
    const propuesta = propuestaPendiente(h)
    if (!propuesta) return null
    return { huella: { ...sinPropuesta(h), descartadas: conDescartada(h, propuesta.texto) }, valor: true }
  })
  return r === true
}

// La aceptada para revisar (#40) vuelve a entrar al prompt, con fecha de aceptacion nueva. null si no
// habia una para revisar.
export function reaceptarHuella(almacen: Almacen, ahora: Date = new Date()): Promise<HuellaAceptada | null> {
  return cambiarHuella(almacen, (h) => {
    if (!h.aceptada?.paraRevisar) return null
    const aceptada: HuellaAceptada = { ...h.aceptada, fechaAceptacion: ahora.toISOString() }
    delete aceptada.paraRevisar
    return { huella: { ...h, aceptada }, valor: aceptada }
  })
}

// La aceptada para revisar (#40) se borra y pasa a descartadas: no se vuelve a proponer igual. false
// si no habia una para revisar.
export async function descartarAceptada(almacen: Almacen): Promise<boolean> {
  const r = await cambiarHuella(almacen, (h) => {
    if (!h.aceptada?.paraRevisar) return null
    const resto = { ...h, descartadas: conDescartada(h, h.aceptada.texto) }
    delete resto.aceptada
    return { huella: resto, valor: true }
  })
  return r === true
}

// --- Cableado ----------------------------------------------------------------------

export function crearHuella(deps: { almacen: Almacen; proveedorRollup: ProveedorRollup }) {
  // "Consolidar ahora" (demo) la llama directo: propone sin esperar el corte.
  async function proponerAhora(ahora: Date): Promise<PropuestaHuella | null> {
    const memoria = await deps.almacen.leerMemoria()
    const propuesta = await proponer(memoria, ahora, deps.proveedorRollup('huella'))
    // Una propuesta nueva reemplaza a la pendiente que nadie miro. Mientras el modelo pensaba, la
    // familia pudo aceptar o descartar: se vuelve a mirar si repite algo contra la huella fresca.
    // Una descartada por invalidar un hecho (#40) se va aunque no haya nada nuevo: ya se rehizo. Si
    // mientras tanto se invalido algo que vio el modelo, la nueva se guarda descartada y se rehace en
    // el proximo cierre.
    return cambiarHuella(deps.almacen, (h, fresca) => {
      const nueva = propuesta && !repetida(h, propuesta.texto) ? propuesta : null
      const invalidados = dejaronDeValer(memoria, fresca)
      const vio = [...idsDe(materialDe(memoria, ahora))].some((id) => invalidados.has(id))
      const guardada = nueva && vio ? { ...nueva, descartado: ahora.toISOString() } : nueva
      const base = propuestaPendiente(h) ? h : sinPropuesta(h)
      return {
        huella: { ...base, ...(guardada ? { propuesta: guardada } : {}), ultimaPropuesta: ahora.toISOString() },
        valor: guardada && !guardada.descartado ? guardada : null,
      }
    })
  }

  // Al cerrar una conversacion: una propuesta por corte de mes. Si falla, no se marca y se reintenta.
  async function alCerrar(ahora: Date): Promise<PropuestaHuella | null> {
    const memoria = await deps.almacen.leerMemoria()
    if (!tocaProponer(memoria, ahora)) return null
    return proponerAhora(ahora)
  }

  return { alCerrar, proponerAhora }
}
