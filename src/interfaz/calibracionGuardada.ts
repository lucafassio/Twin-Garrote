import type { Encuadre } from './encuadre'

// Ultima calibracion (parpadeo + mirada), guardada en el navegador para no recalibrar
// en cada reinicio. Depende de la camara y de como esta sentado el usuario: por eso se
// guarda tambien el encuadre de la cara, para avisar si cambio mucho.

export type CalibracionGuardada = {
  version: 1
  fecha: number
  vision: { lineaBase: number; umbral: number; zonas: Record<string, number[][]> }
  largoRasgos: number // si cambian los rasgos de la mirada, la calibracion vieja no sirve
  encuadre: Encuadre | null
}

const CLAVE = 'parpadeo:calibracion'

export function serializarCalibracion(c: CalibracionGuardada): string {
  return JSON.stringify(c)
}

export function leerCalibracion(texto: string | null, largoRasgos: number): CalibracionGuardada | null {
  if (!texto) return null
  try {
    const c = JSON.parse(texto) as CalibracionGuardada
    if (c?.version !== 1 || c.largoRasgos !== largoRasgos) return null
    const zonas = c.vision?.zonas
    if (!zonas || typeof c.vision.lineaBase !== 'number' || typeof c.vision.umbral !== 'number') return null
    const listas = Object.values(zonas)
    if (!listas.length || !listas.every((l) => Array.isArray(l) && l.every((r) => Array.isArray(r) && r.length === largoRasgos))) {
      return null
    }
    return c
  } catch {
    return null
  }
}

// La cara quedo en otro lugar que al calibrar: corrida, o mas cerca/lejos (ancho de los ojos).
export function difiereEncuadre(guardado: Encuadre, actual: Encuadre): boolean {
  const razon = actual.ancho / guardado.ancho
  return Math.abs(actual.x - guardado.x) > 0.08 || Math.abs(actual.y - guardado.y) > 0.08 || razon < 0.85 || razon > 1.18
}

// Acceso al navegador: puede fallar (modo privado, almacenamiento lleno): nunca tira.
export function cargarCalibracion(largoRasgos: number): CalibracionGuardada | null {
  try {
    return leerCalibracion(localStorage.getItem(CLAVE), largoRasgos)
  } catch {
    return null
  }
}

export function guardarCalibracion(c: CalibracionGuardada) {
  try {
    localStorage.setItem(CLAVE, serializarCalibracion(c))
  } catch {
    // sin almacenamiento: se recalibra la proxima vez
  }
}

export function borrarCalibracion() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {}
}
