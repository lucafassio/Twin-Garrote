// Fechas de los hechos: el modelo dice la expresion ("el jueves") y el codigo hace la cuenta.
// Los LLM se equivocan con las cuentas de fechas (TReMu: de 29,8 a 77,7 al pasarlas al codigo).
// Todo dia es un dia de Argentina: UTC-3 fijo (sin horario de verano desde 2009).
import type { Hecho } from './tipos.ts'

const DIA_MS = 86_400_000
const OFFSET_ARGENTINA_MS = -3 * 60 * 60_000
// Una fecha a mas de esto de la referencia se descarta: es mas probable un error que un plan.
const MAX_DISTANCIA_DIAS = 366

export const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const
export type DiaSemana = (typeof DIAS_SEMANA)[number]
const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

// La forma estructurada de una expresion temporal, como la devuelve el agente de memoria.
export type TiempoEstructurado =
  | { forma: 'ninguna' }
  | { forma: 'diaSemana'; diaSemana: string } // "el jueves": la proxima ocurrencia, incluido hoy
  | { forma: 'relativo'; dias: number } // "mañana" = 1, "ayer" = -1, "en 3 dias" = 3
  | { forma: 'calendario'; dia: number; mes: number; anio: number | null } // "el 20 de noviembre"

// Un dia del calendario, sin hora. Internamente: dias desde 1970-01-01.
type Dia = number

function diaEnArgentina(instante: Date): Dia {
  return Math.floor((instante.getTime() + OFFSET_ARGENTINA_MS) / DIA_MS)
}

function diaDeCalendario(anio: number, mes: number, dia: number): Dia | null {
  if (![anio, mes, dia].every(Number.isInteger) || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null
  const ms = Date.UTC(anio, mes - 1, dia)
  const d = new Date(ms)
  // 31/2 se corre al 3/3: si cambio el mes, la fecha no existe.
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null
  return ms / DIA_MS
}

function partes(d: Dia) {
  const f = new Date(d * DIA_MS)
  return { anio: f.getUTCFullYear(), mes: f.getUTCMonth() + 1, dia: f.getUTCDate(), diaSemana: f.getUTCDay() }
}

function aTexto(d: Dia): string {
  return new Date(d * DIA_MS).toISOString().slice(0, 10)
}

function deTexto(fecha: string): Dia | null {
  const m = fecha.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? diaDeCalendario(Number(m[1]), Number(m[2]), Number(m[3])) : null
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()

// Resuelve la expresion contra la referencia (el fin de la conversacion) y la valida.
// Devuelve el dia como YYYY-MM-DD, o null si no hay fecha, es imposible o esta a mas de un año.
export function resolverFecha(tiempo: TiempoEstructurado, referencia: Date): string | null {
  const hoy = diaEnArgentina(referencia)
  let dia: Dia | null = null
  if (tiempo.forma === 'diaSemana') {
    const objetivo = DIAS_SEMANA.indexOf(sinTildes(tiempo.diaSemana) as DiaSemana)
    if (objetivo >= 0) dia = hoy + ((objetivo - partes(hoy).diaSemana + 7) % 7)
  } else if (tiempo.forma === 'relativo') {
    if (Number.isInteger(tiempo.dias)) dia = hoy + tiempo.dias
  } else if (tiempo.forma === 'calendario') {
    if (tiempo.anio) {
      dia = diaDeCalendario(tiempo.anio, tiempo.mes, tiempo.dia)
    } else {
      // Sin año: el año en curso, o el siguiente si ese dia ya paso.
      const { anio } = partes(hoy)
      // (Un 29/2 en un año que no es bisiesto tambien prueba el siguiente.)
      dia = diaDeCalendario(anio, tiempo.mes, tiempo.dia)
      if (dia === null || dia < hoy) dia = diaDeCalendario(anio + 1, tiempo.mes, tiempo.dia)
    }
  }
  if (dia === null || Math.abs(dia - hoy) > MAX_DISTANCIA_DIAS) return null
  return aTexto(dia)
}

// El final del dia en Argentina (23:59:59.999 -03:00), como ISO.
export function finDelDia(fecha: string): string | null {
  const dia = deTexto(fecha)
  if (dia === null) return null
  return new Date((dia + 1) * DIA_MS - OFFSET_ARGENTINA_MS - 1).toISOString()
}

// Vencido = paso su validoHasta. No es un estado guardado: depende de la hora.
export function estaVencido(hecho: Hecho, ahora: Date): boolean {
  if (!hecho.validoHasta || (hecho.tipo ?? 'estable') === 'estable') return false
  const hasta = Date.parse(hecho.validoHasta)
  return Number.isFinite(hasta) && ahora.getTime() > hasta
}

// Los hechos que pueden entrar a un prompt a esta hora: activos y no vencidos.
// El unico filtro de vencimiento: lo usan opciones y completado. El agente de memoria no: ve los vencidos.
export function hechosVigentes(hechos: Hecho[], ahora: Date): Hecho[] {
  return hechos.filter((h) => h.estado === 'activo' && !estaVencido(h, ahora))
}

// "el jueves 12/11, en 2 dias": la fecha absoluta y la distancia, para que el modelo no haga cuentas.
export function describirFecha(fecha: string, ahora: Date): string | null {
  const dia = deTexto(fecha)
  if (dia === null) return null
  const p = partes(dia)
  const absoluta = `el ${NOMBRES_DIA[p.diaSemana]} ${p.dia}/${p.mes}`
  const n = dia - diaEnArgentina(ahora)
  const distancia =
    n === 0 ? 'hoy' : n === 1 ? 'mañana' : n === -1 ? 'ayer' : n > 0 ? `en ${n} dias` : `hace ${-n} dias`
  return `${absoluta}, ${distancia}`
}

// "martes 10/11/2026": la fecha de referencia para el prompt del agente de memoria.
export function describirDia(instante: Date): string {
  const p = partes(diaEnArgentina(instante))
  return `${NOMBRES_DIA[p.diaSemana]} ${p.dia}/${p.mes}/${p.anio}`
}

// El texto del hecho con su fecha, tal como entra a los prompts: "Laura se opera (el jueves 12/11, en 2 dias)".
export function textoConFecha(hecho: Hecho, ahora: Date): string {
  const fecha = hecho.fechaEvento ? describirFecha(hecho.fechaEvento, ahora) : null
  return fecha ? `${hecho.texto} (${fecha})` : hecho.texto
}
