// Niveles de memoria: resumenes por periodo cerrado (dia, semana, mes), armados en segundo plano.
// Corren despues del agente de memoria, al cerrar una conversacion, y nunca dentro de un turno.
// Los cortes de periodo los calcula el codigo (periodos.ts). Cada rollup es una sola llamada con
// salida estructurada y fuentes obligatorias; si falla, no se guarda nada y se reintenta en el
// proximo cierre. Por ahora se arma solo el dia; semana y mes usan la misma forma de bloque.
//
// Dia: los resumenes de las conversaciones que terminaron ese dia, mas los hechos activos de
// importancia 6 o mas agregados ese dia.
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
// Al cerrar, se arman a lo sumo los dias de la ultima semana que quedaron sin bloque.
const MAX_DIAS_PENDIENTES = 7

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

// Generico para todos los niveles: un bloque cita algo intimo si alguna fuente es un hecho intimo
// o un bloque (de cualquier nivel) que a su vez cita algo intimo. Sale de las fuentes, no del modelo.
export function citaIntimo(bloque: Bloque, memoria: Memoria): boolean {
  const hechos = new Map(memoria.hechos.map((h) => [h.id, h]))
  const niveles = nivelesDe(memoria)
  const bloques = new Map([...niveles.dia, ...niveles.semana, ...niveles.mes].map((b) => [b.id, b]))
  const vistos = new Set<string>()
  const cita = (b: Bloque): boolean =>
    b.fuentes.some((id) => {
      if (hechos.get(id)?.intimo) return true
      const abajo = bloques.get(id)
      if (!abajo || vistos.has(id)) return false
      vistos.add(id)
      return cita(abajo)
    })
  return cita(bloque)
}

// El bloque de dia que entra al prompt de opciones: el de ayer, vigente. Sin ese, el de hoy si se
// consolido ahora (demo). Con cercania formal, ninguno que cite algo intimo.
export function bloqueDelDia(memoria: Memoria, cercania: Cercania | undefined, ahora: Date): Bloque | null {
  const usables = nivelesDe(memoria).dia.filter(
    (b) => !b.descartado && !(cercania === 'formal' && citaIntimo(b, memoria)),
  )
  const de = (p: Periodo) => usables.find((b) => Date.parse(b.desde) === p.desde.getTime()) ?? null
  return de(periodoAnterior('dia', ahora)) ?? de(periodoDe('dia', ahora))
}

// --- Dia -----------------------------------------------------------------------

type Material = { resumenes: ResumenConversacion[]; hechos: Hecho[] }

const dentro = (iso: string, p: Periodo) => {
  const t = Date.parse(iso)
  return t >= p.desde.getTime() && t < p.hasta.getTime()
}

function materialDelDia(memoria: Memoria, periodo: Periodo): Material {
  return {
    resumenes: memoria.resumenes.filter((r) => !r.descartado && dentro(r.fin, periodo)),
    hechos: memoria.hechos.filter(
      (h) => h.estado === 'activo' && h.importancia >= IMPORTANCIA_MINIMA_NIVEL && dentro(h.fecha, periodo),
    ),
  }
}

// Los dias cerrados sin bloque desde el ultimo que tiene, del mas viejo al mas nuevo (a lo sumo una semana).
function diasPendientes(bloques: Bloque[], ahora: Date): Periodo[] {
  const pendientes: Periodo[] = []
  let dia = periodoAnterior('dia', ahora)
  while (pendientes.length < MAX_DIAS_PENDIENTES && !tieneBloque(bloques, dia)) {
    pendientes.unshift(dia)
    dia = periodoAnterior('dia', dia.desde)
  }
  return pendientes
}

// Un dia tiene bloque si hay uno vigente que lo cubre entero. Uno de "Consolidar ahora" cubre solo
// hasta la hora en que se armo: al cruzar la medianoche se rehace con el dia completo.
function tieneBloque(bloques: Bloque[], periodo: Periodo): boolean {
  return bloques.some(
    (b) =>
      !b.descartado &&
      Date.parse(b.desde) === periodo.desde.getTime() &&
      Date.parse(b.hasta) >= periodo.hasta.getTime(),
  )
}

const idBloque = (corte: Corte, periodo: Periodo) => `${corte}-${enArgentina(periodo.desde).slice(0, 10)}`

function promptSistema(): string {
  return `Sos el agente de memoria de un sistema de comunicacion aumentativa para una persona con ELA (el usuario). Resumis un dia de su vida a partir de los resumenes de sus conversaciones y los hechos importantes de ese dia. No hablas con nadie.

Reglas:
- Escribi 2 a 4 lineas en tercera persona. Conserva nombres, fechas y planes concretos: "Laura se opera el jueves 12/11", nunca "hubo novedades familiares".
- Solo lo que dicen las fuentes. Nunca inventes ni deduzcas de mas.
- fuentes: los ids (entre corchetes) de todo resumen o hecho del que uses algo. Al menos uno.

Respondes solo JSON, sin texto alrededor, con esta forma:
{"texto":"...","fuentes":["id", ...]}`
}

const hora = (iso: string) => enArgentina(new Date(iso)).slice(11)

function promptUsuario(periodo: Periodo, material: Material): string {
  const partes = [`# Dia\n${describirDia(periodo.desde)}`]
  partes.push(
    material.resumenes.length > 0
      ? `# Conversaciones del dia\n${material.resumenes.map((r) => `- [${idResumen(r)}] (${hora(r.fin)}) ${r.resumen.replace(/\s*\n\s*/g, ' ')}`).join('\n')}`
      : '# Conversaciones del dia\nNinguna.',
  )
  partes.push(
    material.hechos.length > 0
      ? `# Hechos importantes del dia\n${material.hechos.map((h) => `- [${h.id}] ${h.texto}`).join('\n')}`
      : '# Hechos importantes del dia\nNinguno.',
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

// Arma el bloque de un dia. null si no hay material o el modelo no tuvo nada que decir.
// Tira ErrorNivel si el modelo devuelve algo invalido dos veces.
async function armarDia(memoria: Memoria, periodo: Periodo, proveedor: Proveedor): Promise<Bloque | null> {
  const material = materialDelDia(memoria, periodo)
  if (material.resumenes.length === 0 && material.hechos.length === 0) return null
  const validas = new Set([...material.resumenes.map(idResumen), ...material.hechos.map((h) => h.id)])
  const sistema = promptSistema()
  const usuario = promptUsuario(periodo, material)
  let respuesta = interpretar(await proveedor.generar({ sistema, usuario, salida: SALIDA_NIVEL }), validas)
  if (!respuesta) {
    const aviso = '\n\nTu respuesta anterior no era el JSON pedido. Responde solo el JSON con "texto" y "fuentes" (ids de la lista).'
    respuesta = interpretar(await proveedor.generar({ sistema, usuario: usuario + aviso, salida: SALIDA_NIVEL }), validas)
  }
  if (!respuesta) throw new ErrorNivel(`El proveedor ${proveedor.nombre} devolvio un bloque invalido dos veces`)
  if (respuesta.texto === '') return null
  // Los hechos intimos del material quedan en las fuentes aunque el modelo no los cite: la regla
  // de privacidad sale de lo que vio el modelo, no de lo que dice haber usado.
  const intimos = material.hechos.filter((h) => h.intimo).map((h) => h.id)
  return {
    id: idBloque('dia', periodo),
    desde: periodo.desde.toISOString(),
    hasta: periodo.hasta.toISOString(),
    texto: respuesta.texto,
    fuentes: [...new Set([...respuesta.fuentes, ...intimos])],
  }
}

// --- Cableado ------------------------------------------------------------------

export function crearNiveles(deps: { almacen: Almacen; proveedorRollup: ProveedorRollup }) {
  // Releer antes de guardar (en fila): mientras el modelo pensaba, opciones o el agente pudieron
  // guardar. Desde aca solo se escriben los niveles. Un bloque del mismo periodo reemplaza al anterior.
  function guardarDia(bloque: Bloque) {
    return enFila(deps.almacen, async () => {
      const fresca = await deps.almacen.leerMemoria()
      const niveles = nivelesDe(fresca)
      const dia = [...niveles.dia.filter((b) => b.desde !== bloque.desde), bloque]
        .sort((a, b) => Date.parse(a.desde) - Date.parse(b.desde))
        .slice(-MAX_BLOQUES_GUARDADOS)
      await deps.almacen.guardarMemoria({ ...fresca, niveles: { ...niveles, dia } })
    })
  }

  // Al cerrar una conversacion: arma cada dia que se cerro sin bloque desde el ultimo que tiene.
  // Un dia sin nada no llama al modelo. Si uno falla, los que siguen esperan al proximo cierre.
  async function alCerrar(ahora: Date): Promise<Bloque[]> {
    const memoria = await deps.almacen.leerMemoria()
    const armados: Bloque[] = []
    for (const dia of diasPendientes(nivelesDe(memoria).dia, ahora)) {
      const bloque = await armarDia(memoria, dia, deps.proveedorRollup('dia'))
      if (!bloque) continue
      await guardarDia(bloque)
      armados.push(bloque)
    }
    return armados
  }

  // "Consolidar ahora" (demo): arma el dia de hoy con lo que haya, sin esperar el corte.
  // El bloque cubre hasta ahora; al cruzar la medianoche se rehace con el dia completo.
  async function consolidarAhora(ahora: Date): Promise<Bloque | null> {
    const memoria = await deps.almacen.leerMemoria()
    const hoy = { desde: periodoDe('dia', ahora).desde, hasta: new Date(ahora.getTime() + 1) }
    const bloque = await armarDia(memoria, hoy, deps.proveedorRollup('dia'))
    if (bloque) await guardarDia(bloque)
    return bloque
  }

  return { alCerrar, consolidarAhora }
}
