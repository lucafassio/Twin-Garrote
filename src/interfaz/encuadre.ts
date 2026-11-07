// Chequeo del encuadre de la cara antes de calibrar: que se vea siempre, que este
// centrada y a buena distancia. Las muestras son el ultimo segundo de cuadros
// (null = no se vio la cara). x, y: centro de los ojos (0..1 del video); ancho: distancia
// entre los rabillos externos (0..1 del ancho del video).

export type Encuadre = { x: number; y: number; ancho: number }
export type Distancia = 'bien' | 'cerca' | 'lejos'
export type Evaluacion = {
  listo: boolean
  cara: boolean
  centrada: boolean
  distancia: Distancia
  consejo: string
  promedio?: Encuadre // donde esta la cara en promedio (para guardar con la calibracion)
}

const VISTA_MINIMA = 0.8 // fraccion de cuadros con la cara vista
const ANCHO_MINIMO = 0.08 // menos: muy lejos (el iris queda chico)
const ANCHO_MAXIMO = 0.22 // mas: muy cerca (al mirar los bordes se sale de cuadro)
const MARGEN_X = 0.15
const CENTRO_Y = 0.45
const MARGEN_Y = 0.18

export function evaluarEncuadre(muestras: (Encuadre | null)[]): Evaluacion {
  const vistas = muestras.filter((m): m is Encuadre => m !== null)
  if (!vistas.length) {
    return { listo: false, cara: false, centrada: false, distancia: 'bien', consejo: 'No vemos tu cara: ponete frente a la cámara.' }
  }
  const promedio = (f: (m: Encuadre) => number) => vistas.reduce((s, m) => s + f(m), 0) / vistas.length
  const x = promedio((m) => m.x)
  const y = promedio((m) => m.y)
  const ancho = promedio((m) => m.ancho)

  const cara = vistas.length / muestras.length >= VISTA_MINIMA
  const centrada = Math.abs(x - 0.5) <= MARGEN_X && Math.abs(y - CENTRO_Y) <= MARGEN_Y
  const distancia: Distancia = ancho < ANCHO_MINIMO ? 'lejos' : ancho > ANCHO_MAXIMO ? 'cerca' : 'bien'

  const consejo = !cara
    ? 'Tu cara se pierde por momentos: quedate quieto frente a la cámara y revisá que haya luz de frente.'
    : distancia === 'lejos'
      ? 'Acercate un poco a la pantalla.'
      : distancia === 'cerca'
        ? 'Alejate un poco de la pantalla.'
        : !centrada
          ? 'Centrá la cara en el recuadro.'
          : 'Perfecto, quedate así.'

  return { listo: cara && centrada && distancia === 'bien', cara, centrada, distancia, consejo, promedio: { x, y, ancho } }
}
