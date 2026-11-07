// Cierre a mano del turno que se esta escuchando (Enter vacio en CampoTurno).
// Aparte de index.ts para que CampoTurno no lo importe en circulo.

let cierre: (() => void) | null = null

export function registrarCierre(fn: () => void): () => void {
  cierre = fn
  return () => {
    if (cierre === fn) cierre = null
  }
}

export function cerrarTurno() {
  cierre?.()
}
