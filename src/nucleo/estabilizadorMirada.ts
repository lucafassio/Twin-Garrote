// Convierte la zona que dice vision cuadro a cuadro en una zona estable para el nucleo:
// - una zona nueva se marca si es confiable (>= umbral) y se sostiene permanenciaMs;
// - la zona marcada se mantiene con confianza media (>= umbralMantener): histeresis;
// - sin zona confiable por perdidaMs, se vuelve a null (barrido normal).
// leer() devuelve la zona nueva cuando cambia, o undefined si no hay cambio.

export type LecturaMirada = { zona: string | null; confianza: number }

export function crearEstabilizadorMirada({
  permanenciaMs = 300,
  permanenciaCambioMs = 800, // de una zona marcada a otra: los ojos siguen al barrido y no hay que saltar
  umbral = 0.6,
  umbralMantener = 0.4,
  perdidaMs = 1000,
}: {
  permanenciaMs?: number
  permanenciaCambioMs?: number
  umbral?: number
  umbralMantener?: number
  perdidaMs?: number
} = {}) {
  let marcada: string | null = null
  let candidata: string | null = null
  let candidataDesde = 0
  let sinZonaDesde: number | null = null

  return {
    leer({ zona, confianza }: LecturaMirada, ahora: number): string | null | undefined {
      const sigueMarcada = zona !== null && zona === marcada && confianza >= umbralMantener
      const confiable = zona !== null && confianza >= umbral

      if (sigueMarcada) {
        sinZonaDesde = null
        candidata = null
        return undefined
      }
      if (confiable) {
        sinZonaDesde = null
        if (zona !== candidata) {
          candidata = zona
          candidataDesde = ahora
        }
        const requerido = marcada !== null ? permanenciaCambioMs : permanenciaMs
        if (ahora - candidataDesde >= requerido && zona !== marcada) {
          marcada = zona
          candidata = null
          return marcada
        }
        return undefined
      }
      candidata = null
      sinZonaDesde ??= ahora
      if (marcada !== null && ahora - sinZonaDesde >= perdidaMs) {
        marcada = null
        return null
      }
      return undefined
    },
  }
}
