import type { Punto } from './senales'

export type MuestraPostura = { postura: number[]; mirada: Punto }

// Regresión regularizada por sesión. La segunda secuencia valida la primera.
export function ajustarCompensacion(datos: MuestraPostura[], referencia: number[]) {
  if (datos.length < 60) return null
  const corte = Math.floor(datos.length / 2)
  const entrenamiento = datos.slice(0, corte)
  const validacion = datos.slice(corte)
  const escalas = [0.1, 0.1, 0.2, 0.22]
  const base = (postura: number[]) => [1, ...postura.map((valor, i) => (valor - referencia[i]) / escalas[i])]
  const matriz = Array.from({ length: 5 }, () => Array<number>(7).fill(0))
  entrenamiento.forEach(muestra => {
    const entrada = base(muestra.postura)
    const salida = [...entrada, muestra.mirada.x, muestra.mirada.y]
    matriz.forEach((fila, i) => salida.forEach((valor, j) => { fila[j] += entrada[i] * valor }))
  })
  for (let i = 1; i < 5; i++) matriz[i][i] += entrenamiento.length * 0.01
  for (let i = 0; i < 5; i++) {
    let pivote = i
    for (let j = i + 1; j < 5; j++) if (Math.abs(matriz[j][i]) > Math.abs(matriz[pivote][i])) pivote = j
    if (Math.abs(matriz[pivote][i]) < 1e-8) return null
    ;[matriz[i], matriz[pivote]] = [matriz[pivote], matriz[i]]
    const divisor = matriz[i][i]
    matriz[i] = matriz[i].map(valor => valor / divisor)
    matriz.forEach((fila, j) => {
      if (i === j) return
      const factor = fila[i]
      matriz[j] = fila.map((valor, k) => valor - factor * matriz[i][k])
    })
  }
  function corregir(mirada: Punto, postura: number[]) {
    const entrada = base(postura)
    return {
      x: mirada.x - entrada.slice(1).reduce((suma, valor, i) => suma + valor * matriz[i + 1][5], 0),
      y: mirada.y - entrada.slice(1).reduce((suma, valor, i) => suma + valor * matriz[i + 1][6], 0),
    }
  }
  const error = (punto: Punto) => (punto.x - 0.5) ** 2 + (punto.y - 0.5) ** 2
  const antes = validacion.reduce((suma, muestra) => suma + error(muestra.mirada), 0)
  const despues = validacion.reduce((suma, muestra) => suma + error(corregir(muestra.mirada, muestra.postura)), 0)
  if (!Number.isFinite(despues) || antes < 1e-6 || despues >= antes * 0.9) return null
  return corregir
}
