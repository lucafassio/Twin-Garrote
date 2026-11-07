// Cortes de periodo de los niveles de memoria (dia, semana, mes), en hora de Argentina.
// Los calcula el codigo, nunca el modelo. Argentina no tiene horario de verano desde 2009:
// alcanza con un desfase fijo de -3 h. La semana va de lunes a lunes.

export type Corte = 'dia' | 'semana' | 'mes'

// [desde, hasta): desde incluido, hasta excluido.
export type Periodo = { desde: Date; hasta: Date }

const HORA = 3_600_000
const DESFASE_ARGENTINA = -3 * HORA

// Medianoche de Argentina de una fecha de calendario (anio, mes, dia) argentina.
const medianoche = (anio: number, mes: number, dia: number) => new Date(Date.UTC(anio, mes, dia) - DESFASE_ARGENTINA)

export function periodoDe(corte: Corte, fecha: Date): Periodo {
  // La fecha corrida a hora argentina: sus getters UTC dan el calendario de Argentina.
  const local = new Date(fecha.getTime() + DESFASE_ARGENTINA)
  const anio = local.getUTCFullYear()
  const mes = local.getUTCMonth()
  const dia = local.getUTCDate()
  if (corte === 'mes') return { desde: medianoche(anio, mes, 1), hasta: medianoche(anio, mes + 1, 1) }
  if (corte === 'semana') {
    const lunes = dia - ((local.getUTCDay() + 6) % 7)
    return { desde: medianoche(anio, mes, lunes), hasta: medianoche(anio, mes, lunes + 7) }
  }
  return { desde: medianoche(anio, mes, dia), hasta: medianoche(anio, mes, dia + 1) }
}

// "2026-11-06T22:00": la fecha y hora de Argentina, sin zona. Para ids y prompts.
export function enArgentina(fecha: Date): string {
  return new Date(fecha.getTime() + DESFASE_ARGENTINA).toISOString().slice(0, 16)
}

// El periodo cerrado justo antes del que contiene a la fecha (ayer, la semana o el mes pasado).
export function periodoAnterior(corte: Corte, fecha: Date): Periodo {
  return periodoDe(corte, new Date(periodoDe(corte, fecha).desde.getTime() - 1))
}
