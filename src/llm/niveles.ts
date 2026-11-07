// Niveles de memoria: resumenes por periodo cerrado (dia, semana, mes), armados en segundo plano.
// Corren despues del agente de memoria, al cerrar una conversacion, y nunca dentro de un turno.
// Los cortes de periodo los calcula el codigo (periodos.ts). Cada rollup es una sola llamada con
// salida estructurada y fuentes obligatorias; si falla, no se guarda nada y se reintenta en el
// proximo cierre. Se arman de abajo hacia arriba: si falla un dia, la semana espera.
//
// Dia: los resumenes de las conversaciones que terminaron ese dia, mas los hechos activos de
// importancia 6 o mas agregados ese dia.
// Semana: los bloques de dia de la semana, mas los hechos activos de importancia 6 o mas del periodo.
// Mes: los bloques de semana que tocan el mes, mas los hechos activos de importancia 6 o mas del mes.
import type { Cercania } from '@/eventos'
import { describirDia } from './fechas.ts'
import { enFila } from './fila.ts'
import { enArgentina, periodoAnterior, periodoDe, type Corte, type Periodo } from './periodos.ts'
import type {
  Almacen,
  Bloque,
  Hecho,
  Memoria,
  Niveles,
  NivelRollup,
  Proveedor,
  ResumenConversacion,
  SalidaProveedor,
} from './tipos.ts'

export const IMPORTANCIA_MINIMA_NIVEL = 6
const MAX_BLOQUES_GUARDADOS = 60
// Al cerrar, se arman a lo sumo los periodos de este largo que quedaron sin bloque (la ultima semana
// de dias, el ultimo mes de semanas, los dos ultimos meses).
const MAX_PENDIENTES: Record<Corte, number> = { dia: 7, semana: 4, mes: 2 }
// De que nivel sale cada uno, y el orden en que se arman.
const DEBAJO: Record<Corte, Corte | null> = { dia: null, semana: 'dia', mes: 'semana' }
const CORTES: Corte[] = ['dia', 'semana', 'mes']

// Salida estructurada de un rollup. Tiene que coincidir con interpretar().
export const SALIDA_NIVEL: SalidaProveedor = {
  nombre: 'nivel',
  maxTokens: 800,
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

export class ErrorNivel extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = 'ErrorNivel'
  }
}

// El proveedor de cada rollup, con el modelo que le toca por configuracion (ver proveedores.ts).
export type ProveedorRollup = (nivel: NivelRollup) => Proveedor

// Una memoria vieja no tiene niveles: se leen vacios.
export function nivelesDe(memoria: Memoria): Niveles {
  return { dia: [], semana: [], mes: [], ...memoria.niveles }
}

// El id con el que un bloque cita a un resumen. Uno viejo sin id usa el derivado de su fin.
export function idResumen(r: ResumenConversacion): string {
  return r.id ?? `r-${Date.parse(r.fin).toString(36)}`
}

// Los hechos intimos que un bloque cita, directo o a traves de bloques (de cualquier nivel) que los citan.
// Sirve para todo lo que cita fuentes (tambien la huella aprendida, #38).
export function hechosIntimos(bloque: Pick<Bloque, 'fuentes'>, memoria: Memoria): string[] {
  const hechos = new Map(memoria.hechos.map((h) => [h.id, h]))
  const niveles = nivelesDe(memoria)
  const bloques = new Map([...niveles.dia, ...niveles.semana, ...niveles.mes].map((b) => [b.id, b]))
  const vistos = new Set<string>()
  const intimos = new Set<string>()
  const recorrer = (b: Pick<Bloque, 'fuentes'>) => {
    for (const id of b.fuentes) {
      if (hechos.get(id)?.intimo) intimos.add(id)
      const abajo = bloques.get(id)
      if (!abajo || vistos.has(id)) continue
      vistos.add(id)
      recorrer(abajo)
    }
  }
  recorrer(bloque)
  return [...intimos]
}

// Generico para todos los niveles: un bloque cita algo intimo si alguna fuente es un hecho intimo
// o un bloque que a su vez cita algo intimo. Sale de las fuentes, no del modelo.
export function citaIntimo(bloque: Pick<Bloque, 'fuentes'>, memoria: Memoria): boolean {
  return hechosIntimos(bloque, memoria).length > 0
}

// El bloque de un nivel que entra al prompt de opciones: el del periodo anterior (ayer, la semana o el
// mes pasado), vigente. Sin ese, el del periodo actual si se consolido ahora (demo). Con cercania
// formal, ninguno que cite algo intimo.
export function bloqueDe(corte: Corte, memoria: Memoria, cercania: Cercania | undefined, ahora: Date): Bloque | null {
  const usables = nivelesDe(memoria)[corte].filter(
    (b) => !b.descartado && !(cercania === 'formal' && citaIntimo(b, memoria)),
  )
  const de = (p: Periodo) => usables.find((b) => Date.parse(b.desde) === p.desde.getTime()) ?? null
  return de(periodoAnterior(corte, ahora)) ?? de(periodoDe(corte, ahora))
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// "viernes 6/11/2026", "la semana del lunes 2/11/2026 al domingo 8/11/2026", "noviembre de 2026".
export function describirPeriodo(corte: Corte, desde: Date): string {
  if (corte === 'dia') return describirDia(desde)
  const p = periodoDe(corte, desde)
  if (corte === 'semana') return `la semana del ${describirDia(p.desde)} al ${describirDia(new Date(p.hasta.getTime() - 1))}`
  const [anio, mes] = enArgentina(p.desde).split('-')
  return `${MESES[Number(mes) - 1]} de ${anio}`
}

// --- Armado ----------------------------------------------------------------------

type Material = { resumenes: ResumenConversacion[]; bloques: Bloque[]; hechos: Hecho[] }

const dentro = (iso: string, p: Periodo) => {
  const t = Date.parse(iso)
  return t >= p.desde.getTime() && t < p.hasta.getTime()
}

// Un bloque de abajo entra si toca el periodo: una semana que cruza el fin de mes entra en los dos.
const toca = (b: Bloque, p: Periodo) => Date.parse(b.desde) < p.hasta.getTime() && Date.parse(b.hasta) > p.desde.getTime()

function materialDe(corte: Corte, memoria: Memoria, periodo: Periodo): Material {
  const debajo = DEBAJO[corte]
  return {
    resumenes: corte === 'dia' ? memoria.resumenes.filter((r) => !r.descartado && dentro(r.fin, periodo)) : [],
    bloques: debajo ? nivelesDe(memoria)[debajo].filter((b) => !b.descartado && toca(b, periodo)) : [],
    hechos: memoria.hechos.filter(
      (h) => h.estado === 'activo' && h.importancia >= IMPORTANCIA_MINIMA_NIVEL && dentro(h.fecha, periodo),
    ),
  }
}

// Los periodos cerrados sin bloque desde el ultimo que tiene, del mas viejo al mas nuevo, que ya se
// pueden armar.
function pendientes(corte: Corte, bloques: Bloque[], ahora: Date): Periodo[] {
  const lista: Periodo[] = []
  let periodo = periodoAnterior(corte, ahora)
  while (lista.length < MAX_PENDIENTES[corte] && !tieneBloque(bloques, periodo)) {
    lista.unshift(periodo)
    periodo = periodoAnterior(corte, periodo.desde)
  }
  return lista.filter((p) => maduro(corte, p, ahora))
}

// Un mes se arma recien cuando cerro la semana de su ultimo dia: si no, los dias del final del mes
// (que todavia no tienen bloque de semana) quedarian afuera, y el mes ya armado no se rehace.
function maduro(corte: Corte, periodo: Periodo, ahora: Date): boolean {
  if (corte !== 'mes') return true
  return periodoDe('semana', new Date(periodo.hasta.getTime() - 1)).hasta.getTime() <= ahora.getTime()
}

// Un periodo tiene bloque si hay uno vigente que lo cubre entero. Uno de "Consolidar ahora" cubre solo
// hasta la hora en que se armo: al cruzar el corte se rehace con el periodo completo.
function tieneBloque(bloques: Bloque[], periodo: Periodo): boolean {
  return bloques.some(
    (b) =>
      !b.descartado &&
      Date.parse(b.desde) === periodo.desde.getTime() &&
      Date.parse(b.hasta) >= periodo.hasta.getTime(),
  )
}

const idBloque = (corte: Corte, periodo: Periodo) => `${corte}-${enArgentina(periodo.desde).slice(0, 10)}`

const QUE_RESUME: Record<Corte, { periodo: string; fuentes: string; lineas: string }> = {
  dia: { periodo: 'un dia', fuentes: 'los resumenes de sus conversaciones', lineas: '2 a 4' },
  semana: { periodo: 'una semana', fuentes: 'los resumenes de cada dia', lineas: '3 a 5' },
  mes: { periodo: 'un mes', fuentes: 'los resumenes de cada semana', lineas: '4 a 6' },
}

function promptSistema(corte: Corte): string {
  const que = QUE_RESUME[corte]
  return `Sos el agente de memoria de un sistema de comunicacion aumentativa para una persona con ELA (el usuario). Resumis ${que.periodo} de su vida a partir de ${que.fuentes} y los hechos importantes de ese periodo. No hablas con nadie.

Reglas:
- Escribi ${que.lineas} lineas en tercera persona. Conserva nombres, fechas y planes concretos: "Laura se opera el jueves 12/11", nunca "hubo novedades familiares".${corte === 'dia' ? '' : '\n- Primero lo que mas pesa (una internacion, un nacimiento, un cambio en la rutina); lo menor, solo si entra.'}
- Solo lo que dicen las fuentes. Nunca inventes ni deduzcas de mas.
- fuentes: los ids (entre corchetes) de todo resumen, bloque o hecho del que uses algo. Al menos uno.

Respondes solo JSON, sin texto alrededor, con esta forma:
{"texto":"...","fuentes":["id", ...]}`
}

const hora = (iso: string) => enArgentina(new Date(iso)).slice(11)
const enUnaLinea = (texto: string) => texto.replace(/\s*\n\s*/g, ' ')
const TITULO: Record<Corte, string> = { dia: 'Dia', semana: 'Semana', mes: 'Mes' }

function promptUsuario(corte: Corte, periodo: Periodo, material: Material): string {
  const partes = [`# ${TITULO[corte]}\n${describirPeriodo(corte, periodo.desde)}`]
  const lista = (titulo: string, lineas: string[], vacio: string) =>
    partes.push(`# ${titulo}\n${lineas.length > 0 ? lineas.join('\n') : vacio}`)
  if (corte === 'dia') {
    lista(
      'Conversaciones del dia',
      material.resumenes.map((r) => `- [${idResumen(r)}] (${hora(r.fin)}) ${enUnaLinea(r.resumen)}`),
      'Ninguna.',
    )
  } else {
    const debajo = DEBAJO[corte]!
    lista(
      corte === 'semana' ? 'Dias de la semana' : 'Semanas del mes',
      material.bloques.map((b) => `- [${b.id}] (${describirPeriodo(debajo, new Date(b.desde))}) ${enUnaLinea(b.texto)}`),
      'Ninguno.',
    )
  }
  // En el dia todos los hechos son de ese dia; en semana y mes la fecha ayuda a no perderla.
  lista(
    `Hechos importantes del ${corte}`,
    material.hechos.map((h) => `- [${h.id}] ${corte === 'dia' ? '' : `(${describirDia(new Date(h.fecha))}) `}${h.texto}`),
    'Ninguno.',
  )
  return partes.join('\n\n')
}

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
  const limpioTexto = d.texto.trim()
  // Texto vacio es "no hay nada que resumir" (el proveedor falso). Con texto, las fuentes son obligatorias.
  if (limpioTexto !== '' && fuentes.length === 0) return null
  return { texto: limpioTexto, fuentes }
}

// Arma el bloque de un periodo. null si no hay material o el modelo no tuvo nada que decir.
// Tira ErrorNivel si el modelo devuelve algo invalido dos veces.
async function armar(corte: Corte, memoria: Memoria, periodo: Periodo, proveedor: Proveedor): Promise<Bloque | null> {
  const material = materialDe(corte, memoria, periodo)
  if (material.resumenes.length === 0 && material.bloques.length === 0 && material.hechos.length === 0) return null
  const validas = new Set([
    ...material.resumenes.map(idResumen),
    ...material.bloques.map((b) => b.id),
    ...material.hechos.map((h) => h.id),
  ])
  const sistema = promptSistema(corte)
  const usuario = promptUsuario(corte, periodo, material)
  let respuesta = interpretar(await proveedor.generar({ sistema, usuario, salida: SALIDA_NIVEL }), validas)
  if (!respuesta) {
    const aviso = '\n\nTu respuesta anterior no era el JSON pedido. Responde solo el JSON con "texto" y "fuentes" (ids de la lista).'
    respuesta = interpretar(await proveedor.generar({ sistema, usuario: usuario + aviso, salida: SALIDA_NIVEL }), validas)
  }
  if (!respuesta) throw new ErrorNivel(`El proveedor ${proveedor.nombre} devolvio un bloque invalido dos veces`)
  if (respuesta.texto === '') return null
  // Los hechos intimos del material (sueltos o citados por sus bloques) quedan en las fuentes aunque
  // el modelo no los cite: la regla de privacidad sale de lo que vio el modelo, no de lo que dice haber
  // usado. Van los hechos y no los bloques: un bloque de abajo puede podarse y la traza no se pierde.
  const intimos = [
    ...material.hechos.filter((h) => h.intimo).map((h) => h.id),
    ...material.bloques.flatMap((b) => hechosIntimos(b, memoria)),
  ]
  return {
    id: idBloque(corte, periodo),
    desde: periodo.desde.toISOString(),
    hasta: periodo.hasta.toISOString(),
    texto: respuesta.texto,
    fuentes: [...new Set([...respuesta.fuentes, ...intimos])],
  }
}

// --- Cableado ------------------------------------------------------------------

export type BloquesDeHoy = { dia: Bloque | null; semana: Bloque | null }

export function crearNiveles(deps: { almacen: Almacen; proveedorRollup: ProveedorRollup }) {
  // Releer antes de guardar (en fila): mientras el modelo pensaba, opciones o el agente pudieron
  // guardar. Desde aca solo se escriben los niveles. Un bloque del mismo periodo reemplaza al anterior.
  function guardar(corte: Corte, bloque: Bloque) {
    return enFila(deps.almacen, async () => {
      const fresca = await deps.almacen.leerMemoria()
      const niveles = nivelesDe(fresca)
      const lista = [...niveles[corte].filter((b) => b.desde !== bloque.desde), bloque]
        .sort((a, b) => Date.parse(a.desde) - Date.parse(b.desde))
        .slice(-MAX_BLOQUES_GUARDADOS)
      await deps.almacen.guardarMemoria({ ...fresca, niveles: { ...niveles, [corte]: lista } })
    })
  }

  // Arma un periodo con la memoria de ahora (que ya trae los bloques de abajo recien guardados).
  async function armarYGuardar(corte: Corte, periodo: Periodo): Promise<Bloque | null> {
    const memoria = await deps.almacen.leerMemoria()
    const bloque = await armar(corte, memoria, periodo, deps.proveedorRollup(corte))
    if (bloque) await guardar(corte, bloque)
    return bloque
  }

  // Al cerrar una conversacion: dia, semana y mes, en ese orden, arman cada periodo que se cerro sin
  // bloque desde el ultimo que tiene. Un periodo sin nada no llama al modelo. Si uno falla, lo que
  // sigue (y los niveles de arriba) esperan al proximo cierre.
  async function alCerrar(ahora: Date): Promise<Bloque[]> {
    const armados: Bloque[] = []
    for (const corte of CORTES) {
      const bloques = nivelesDe(await deps.almacen.leerMemoria())[corte]
      for (const periodo of pendientes(corte, bloques, ahora)) {
        const bloque = await armarYGuardar(corte, periodo)
        if (bloque) armados.push(bloque)
      }
    }
    return armados
  }

  // "Consolidar ahora" (demo): arma el dia y la semana de hoy con lo que haya, sin esperar el corte.
  // Cada bloque cubre hasta ahora; al cruzar el corte se rehace con el periodo completo.
  async function consolidarAhora(ahora: Date): Promise<BloquesDeHoy> {
    const hastaAhora = (corte: Corte) => ({ desde: periodoDe(corte, ahora).desde, hasta: new Date(ahora.getTime() + 1) })
    const dia = await armarYGuardar('dia', hastaAhora('dia'))
    const semana = await armarYGuardar('semana', hastaAhora('semana'))
    return { dia, semana }
  }

  return { alCerrar, consolidarAhora }
}
