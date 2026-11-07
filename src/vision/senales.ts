export type Punto = { x: number; y: number }
export type Mirada = { valida: true; x: number; y: number } | { valida: false }

export const puntosCalibracion: Punto[] = [
  { x: 0.5, y: 0.5 },
  { x: 0.12, y: 0.12 }, { x: 0.5, y: 0.12 }, { x: 0.88, y: 0.12 },
  { x: 0.88, y: 0.5 }, { x: 0.88, y: 0.88 }, { x: 0.5, y: 0.88 },
  { x: 0.12, y: 0.88 }, { x: 0.12, y: 0.5 },
]

export function crearDetector() {
  let muestras: number[] = []
  let inicio: number | null = null
  let rearmado = false
  let ultimaEmision = -Infinity

  return {
    leer(valor: number | null, ahora: number, umbral: number, duracion: number) {
      if (valor === null) {
        muestras = []
        inicio = null
        rearmado = false
        return { cerrados: false, progreso: 0, confirmar: false }
      }
      muestras.push(valor)
      if (muestras.length > 3) muestras.shift()
      const cerrados = muestras.reduce((total, muestra) => total + muestra, 0) / muestras.length >= umbral
      if (!cerrados) {
        inicio = null
        rearmado = ahora - ultimaEmision >= 1000
        return { cerrados, progreso: 0, confirmar: false }
      }
      if (!rearmado) return { cerrados, progreso: inicio === null ? 0 : 1, confirmar: false }
      inicio ??= ahora
      const progreso = Math.min(1, (ahora - inicio) / duracion)
      const confirmar = progreso === 1
      if (confirmar) {
        ultimaEmision = ahora
        rearmado = false
      }
      return { cerrados, progreso, confirmar }
    },
  }
}

export function sugerirDuracion(naturales: number[], deliberados: number[]) {
  if (deliberados.length < 5) return null
  const mayorNatural = Math.max(0, ...naturales)
  const menorDeliberado = Math.min(...deliberados)
  return [400, 500, 650].find(ms => mayorNatural < ms && ms <= menorDeliberado) ?? null
}

// Ajuste cuadrático regularizado para la curvatura entre iris y pantalla.
export function ajustarMirada(muestras: Punto[], objetivos: Punto[]) {
  if (muestras.length < 6 || muestras.length !== objetivos.length) return null
  const filas = Array.from({ length: 6 }, () => Array<number>(8).fill(0))
  muestras.forEach(({ x, y }, indice) => {
    const base = [1, x, y, x * x, x * y, y * y]
    const valores = [...base, objetivos[indice].x, objetivos[indice].y]
    filas.forEach((fila, i) => valores.forEach((valor, j) => { fila[j] += base[i] * valor }))
  })
  for (let i = 1; i < 6; i++) filas[i][i] += 0.00001
  for (let i = 0; i < 6; i++) {
    let pivote = i
    for (let j = i + 1; j < 6; j++) {
      if (Math.abs(filas[j][i]) > Math.abs(filas[pivote][i])) pivote = j
    }
    if (Math.abs(filas[pivote][i]) < 1e-8) return null
    ;[filas[i], filas[pivote]] = [filas[pivote], filas[i]]
    const divisor = filas[i][i]
    filas[i] = filas[i].map(valor => valor / divisor)
    filas.forEach((fila, j) => {
      if (j === i) return
      const factor = fila[i]
      filas[j] = fila.map((valor, k) => valor - factor * filas[i][k])
    })
  }
  return ({ x, y }: Punto): Mirada => {
    const base = [1, x, y, x * x, x * y, y * y]
    const px = base.reduce((total, valor, i) => total + valor * filas[i][6], 0)
    const py = base.reduce((total, valor, i) => total + valor * filas[i][7], 0)
    if (!Number.isFinite(px) || !Number.isFinite(py) || px < 0 || px > 1 || py < 0 || py > 1) return { valida: false }
    return { valida: true, x: px, y: py }
  }
}

