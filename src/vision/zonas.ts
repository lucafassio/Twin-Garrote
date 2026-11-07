// Mirada por zonas: en vez de estimar un punto (x, y) en la pantalla, que con webcam
// tiene 6-11 grados de error, se clasifica cual de unas pocas zonas grandes se mira.
// Funciones puras: los rasgos salen de MediaPipe Face Landmarker y el clasificador
// es k vecinos con rasgos estandarizados. Se entrena con la calibracion por zonas y
// se corrige solo con cada eleccion confirmada.

type PuntoCara = { x: number; y: number; z?: number }
type Forma = { categoryName: string; score: number }

// Por ojo: rabillo interno/externo, centro del iris, parpado superior/inferior.
const OJOS = [
  { a: 33, b: 133, iris: 468, arriba: 159, abajo: 145 },
  { a: 362, b: 263, iris: 473, arriba: 386, abajo: 374 },
]
// Blendshapes de mirada de MediaPipe: aprendidos, y los unicos con buena senal vertical.
const FORMAS_MIRADA = [
  'eyeLookUpLeft', 'eyeLookUpRight', 'eyeLookDownLeft', 'eyeLookDownRight',
  'eyeLookInLeft', 'eyeLookInRight', 'eyeLookOutLeft', 'eyeLookOutRight',
]
const RASGOS_POR_OJO = 3
const RASGOS_POSE = 6
export const LARGO_RASGOS = OJOS.length * RASGOS_POR_OJO + FORMAS_MIRADA.length + RASGOS_POSE

// Vector de rasgos de un cuadro. matriz: facialTransformationMatrixes[0].data (4x4, por columnas).
export function extraerRasgos(
  puntos: PuntoCara[],
  formas: Forma[] | undefined,
  matriz: ArrayLike<number> | undefined,
  aspecto: number,
): number[] | null {
  const rasgos: number[] = []
  for (const o of OJOS) {
    const [a, b, iris, arriba, abajo] = [puntos[o.a], puntos[o.b], puntos[o.iris], puntos[o.arriba], puntos[o.abajo]]
    if (!a || !b || !iris || !arriba || !abajo) return null
    const dx = (b.x - a.x) * aspecto
    const dy = b.y - a.y
    const ancho2 = dx * dx + dy * dy
    if (ancho2 < 1e-8) return null
    const ox = (iris.x - (a.x + b.x) / 2) * aspecto
    const oy = iris.y - (a.y + b.y) / 2
    const alto = abajo.y - arriba.y
    rasgos.push(
      (ox * dx + oy * dy) / ancho2, // iris a lo largo del ojo
      (oy * dx - ox * dy) / ancho2, // iris perpendicular al ojo
      Math.abs(alto) > 1e-6 ? (iris.y - arriba.y) / alto : 0.5, // iris entre los parpados
    )
  }
  for (const nombre of FORMAS_MIRADA) rasgos.push(formas?.find((f) => f.categoryName === nombre)?.score ?? 0)
  if (matriz && matriz.length >= 16) {
    // Direccion hacia donde apunta la cara, giro y posicion de la cabeza.
    rasgos.push(matriz[8], matriz[9], Math.atan2(matriz[1], matriz[0]), matriz[12], matriz[13], matriz[14])
  } else {
    rasgos.push(0, 0, 0, 0, 0, 0)
  }
  return rasgos.every(Number.isFinite) ? rasgos : null
}

export type Clasificacion = { zona: string; confianza: number; probabilidades: Record<string, number> }

export function crearClasificadorZonas({ k = 15, maximoPorZona = 400 }: { k?: number; maximoPorZona?: number } = {}) {
  const porZona = new Map<string, number[][]>()
  let media: number[] = []
  let escala: number[] = []

  function recalcular() {
    const todas = [...porZona.values()].flat()
    if (!todas.length) return
    const n = todas.length
    const d = todas[0].length
    media = Array.from({ length: d }, (_, j) => todas.reduce((s, r) => s + r[j], 0) / n)
    escala = Array.from({ length: d }, (_, j) => {
      const v = todas.reduce((s, r) => s + (r[j] - media[j]) ** 2, 0) / n
      return Math.sqrt(v) || 1 // un rasgo constante no aporta: escala 1
    })
  }

  function sumar(zona: string, rasgos: number[][]) {
    const lista = porZona.get(zona) ?? []
    lista.push(...rasgos)
    if (lista.length > maximoPorZona) lista.splice(0, lista.length - maximoPorZona)
    porZona.set(zona, lista)
  }

  const total = () => [...porZona.values()].reduce((s, l) => s + l.length, 0)

  return {
    listo: () => total() >= k,
    muestras: (zona: string) => porZona.get(zona)?.length ?? 0,
    zonas: () => [...porZona.keys()],

    entrenar(muestras: { zona: string; rasgos: number[] }[]) {
      porZona.clear()
      const agrupadas = new Map<string, number[][]>()
      for (const m of muestras) agrupadas.set(m.zona, [...(agrupadas.get(m.zona) ?? []), m.rasgos])
      for (const [zona, rasgos] of agrupadas) sumar(zona, rasgos)
      recalcular()
    },

    // Muestras por zona (copia), para guardar la calibracion.
    datos(): Record<string, number[][]> {
      return Object.fromEntries([...porZona].map(([zona, lista]) => [zona, lista.map((r) => [...r])]))
    },

    // Carga muestras guardadas (reemplaza las actuales).
    importar(datos: Record<string, number[][]>) {
      porZona.clear()
      for (const [zona, lista] of Object.entries(datos)) if (lista.length) sumar(zona, lista)
      recalcular()
    },

    // Suma muestras etiquetadas (por ejemplo, los cuadros antes de un parpadeo que eligio esa zona).
    agregar(zona: string, rasgos: number[][]) {
      if (!rasgos.length) return
      sumar(zona, rasgos)
      recalcular()
    },

    clasificar(rasgos: number[]): Clasificacion | null {
      if (total() < k) return null
      const z = rasgos.map((v, j) => (v - media[j]) / escala[j])
      const vecinos: { zona: string; d: number }[] = []
      for (const [zona, lista] of porZona) {
        for (const r of lista) {
          let d = 0
          for (let j = 0; j < z.length; j++) d += (z[j] - (r[j] - media[j]) / escala[j]) ** 2
          vecinos.push({ zona, d: Math.sqrt(d) })
        }
      }
      vecinos.sort((a, b) => a.d - b.d)
      const probabilidades: Record<string, number> = Object.fromEntries([...porZona.keys()].map((zona) => [zona, 0]))
      let suma = 0
      for (const v of vecinos.slice(0, k)) {
        const w = 1 / (v.d + 1e-3)
        probabilidades[v.zona] += w
        suma += w
      }
      let zona = ''
      for (const [nombre, p] of Object.entries(probabilidades)) {
        probabilidades[nombre] = p / suma
        if (!zona || probabilidades[nombre] > probabilidades[zona]) zona = nombre
      }
      return { zona, confianza: probabilidades[zona], probabilidades }
    },
  }
}

export type ClasificadorZonas = ReturnType<typeof crearClasificadorZonas>
