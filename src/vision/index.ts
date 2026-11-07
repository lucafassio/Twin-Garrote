import type { FaceLandmarker, NormalizedLandmark } from '@mediapipe/tasks-vision'
import { bus } from '../eventos'
import { ajustarCompensacion } from './compensacion'
import { ajustarMirada, crearDetector, puntosCalibracion, type Mirada, type Punto } from './senales'

export type LecturaVision = {
  posturaFuera?: boolean
  izquierdo: number | null
  derecho: number | null
  cerrados: boolean
  progreso: number
  mirada: Mirada
}

let lectura: LecturaVision = { izquierdo: null, derecho: null, cerrados: false, progreso: 0, mirada: { valida: false } }
let muestraMirada: Punto | null = null
type Postura = [number, number, number, number]
let posturaActual: Postura | null = null
let posturaCalibrada: Postura | null = null
let compensar: ReturnType<typeof ajustarCompensacion> = null
let umbral = 0.5
let duracion = 500
let lineaBase = 0
let ajuste: ReturnType<typeof ajustarMirada> = null
let detenerActivo: (() => void) | null = null
let iniciando = false
let sesion = 0
let enPrueba = false
const observadores = new Set<(lectura: LecturaVision) => void>()

export function observarVision(observar: (lectura: LecturaVision) => void) {
  observadores.add(observar)
  observar(lectura)
  return () => { observadores.delete(observar) }
}

export function setUmbral(valor: number) {
  if (Number.isFinite(valor)) umbral = Math.max(0.05, Math.min(1, valor))
}

export function setDuracion(valor: number) {
  if (Number.isFinite(valor)) duracion = Math.max(100, Math.min(2000, valor))
}

export function setModoPrueba(activo: boolean) {
  enPrueba = activo
}

function medir<T>(ms: number, extraer: () => T | null): Promise<T[]> {
  const actual = sesion
  return new Promise(resolve => {
    const muestras: T[] = []
    const dejar = observarVision(() => {
      const muestra = extraer()
      if (sesion === actual && muestra !== null) muestras.push(muestra)
    })
    window.setTimeout(() => {
      dejar()
      resolve(sesion === actual ? muestras : [])
    }, ms)
  })
}

export async function calibrar(): Promise<void> {
  const muestras = await medir(3000, () => lectura.izquierdo === null || lectura.derecho === null
    ? null : (lectura.izquierdo + lectura.derecho) / 2)
  if (muestras.length < 10) throw new Error('No pudimos ver tus ojos durante la calibración.')
  muestras.sort((a, b) => a - b)
  lineaBase = muestras[Math.floor(muestras.length / 2)]
}

export async function calibrarMirada(mostrarObjetivo: (punto: Punto, paso: number) => void, señal?: AbortSignal) {
  const actual = sesion
  const muestras: Punto[] = []
  ajuste = null
  posturaCalibrada = null
  compensar = null
  const posturas: Postura[] = []
  for (const [indice, punto] of puntosCalibracion.entries()) {
    mostrarObjetivo(punto, indice + 1)
    await new Promise(resolve => window.setTimeout(resolve, 1200))
    if (actual !== sesion || señal?.aborted) return
    const capturas = await medir(1500, () => !lectura.cerrados && muestraMirada && posturaActual
      ? { mirada: muestraMirada, postura: posturaActual } : null)
    const datos = capturas.map(captura => captura.mirada)
    if (actual !== sesion || señal?.aborted) return
    if (datos.length < 15) throw new Error('No pudimos seguir tu mirada. Volvé a calibrar.')
    posturas.push(...capturas.map(captura => captura.postura))
    const xs = datos.map(dato => dato.x).sort((a, b) => a - b)
    const ys = datos.map(dato => dato.y).sort((a, b) => a - b)
    const medio = Math.floor(datos.length / 2)
    const centro = { x: xs[medio], y: ys[medio] }
    const distancias = datos.map(dato => Math.hypot(dato.x - centro.x, dato.y - centro.y)).sort((a, b) => a - b)
    const limite = Math.max(0.002, distancias[medio] * 2.5)
    const estables = datos.filter(dato => Math.hypot(dato.x - centro.x, dato.y - centro.y) <= limite)
    muestras.push({
      x: estables.reduce((total, dato) => total + dato.x, 0) / estables.length,
      y: estables.reduce((total, dato) => total + dato.y, 0) / estables.length,
    })
  }
  ajuste = ajustarMirada(muestras, puntosCalibracion)
  if (!ajuste) throw new Error('La calibración de mirada fue inconclusa. Volvé a intentarlo.')
  posturaCalibrada = [0, 1, 2, 3].map(eje => {
    const valores = posturas.map(postura => postura[eje]).sort((a, b) => a - b)
    return valores[Math.floor(valores.length / 2)]
  }) as Postura
}

function medirPostura(puntos: NormalizedLandmark[], aspecto: number): Postura | null {
  const [izquierda, derecha, nariz] = [puntos[33], puntos[263], puntos[1]]
  if (!izquierda || !derecha || !nariz) return null
  const dx = (derecha.x - izquierda.x) * aspecto
  const dy = derecha.y - izquierda.y
  const ancho = Math.hypot(dx, dy)
  if (!Number.isFinite(ancho) || ancho < 0.001) return null
  const x = (nariz.x - (izquierda.x + derecha.x) / 2) * aspecto
  const y = nariz.y - (izquierda.y + derecha.y) / 2
  return [(x * dx + y * dy) / ancho ** 2, (y * dx - x * dy) / ancho ** 2,
    Math.atan2(dy, dx), Math.log(ancho)]
}

export async function calibrarCompensacion(señal?: AbortSignal) {
  const actual = sesion
  const referencia = posturaCalibrada
  if (!referencia || !ajuste) throw new Error('Primero calibrá la mirada.')
  compensar = null
  const datos = await medir(10000, () => {
    const mirada = muestraMirada && ajuste ? ajuste(muestraMirada) : null
    return mirada?.valida && posturaActual && !lectura.cerrados && !lectura.posturaFuera
      ? { postura: [...posturaActual], mirada: { x: mirada.x, y: mirada.y } } : null
  })
  if (actual !== sesion || señal?.aborted) return false
  compensar = ajustarCompensacion(datos, referencia)
  return compensar !== null
}

function estimarMirada(puntos: NormalizedLandmark[], aspecto: number): Punto | null {
  const ojos = [[33, 133, 468], [362, 263, 473]].map(([a, b, centro]) => {
    const inicio = puntos[a]
    const fin = puntos[b]
    const iris = puntos[centro]
    if (!inicio || !fin || !iris) return null
    const dx = (fin.x - inicio.x) * aspecto
    const dy = fin.y - inicio.y
    const ancho = dx * dx + dy * dy
    if (ancho < 1e-6) return null
    const x = (iris.x - (inicio.x + fin.x) / 2) * aspecto
    const y = iris.y - (inicio.y + fin.y) / 2
    return { x: (x * dx + y * dy) / ancho, y: (y * dx - x * dy) / ancho }
  })
  const [a, b] = ojos
  return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : null
}

function detectarCuadro(modelo: FaceLandmarker, video: HTMLVideoElement, ahora: number) {
  const registrarError = console.error
  // MediaPipe envía este aviso de inicio a stderr. Next lo muestra como error de desarrollo.
  console.error = (...argumentos: unknown[]) => {
    if (argumentos.length === 1 && typeof argumentos[0] === 'string' &&
      argumentos[0].trim() === 'INFO: Created TensorFlow Lite XNNPACK delegate for CPU.') {
      console.info(argumentos[0])
      return
    }
    registrarError.apply(console, argumentos)
  }
  try {
    return modelo.detectForVideo(video, ahora)
  } finally {
    console.error = registrarError
  }
}

export async function iniciarVision(video: HTMLVideoElement): Promise<() => void> {
  if (iniciando || detenerActivo) throw new Error('La cámara de Visión ya está en uso.')
  iniciando = true
  sesion++
  const detector = crearDetector()
  let modelo: FaceLandmarker | undefined
  let stream: MediaStream | undefined
  let cuadro = 0
  let ultimoVideo = -1
  let ultimaMuestra = -Infinity
  let activo = true
  let miradaSuavizada: Punto | null = null
  let tiempoFiltro = 0
  let velocidadFiltro = 0
  let posturaFuera = false

  function publicar(izquierdo: number | null, derecho: number | null, ahora: number) {
    const valor = izquierdo === null || derecho === null ? null : (izquierdo + derecho) / 2
    const estado = detector.leer(valor, ahora, lineaBase + umbral * (1 - lineaBase), duracion)
    if (posturaActual && posturaCalibrada) {
      const tolerancias = [0.10, 0.10, 0.20, 0.22]
      const referencia = posturaCalibrada
      const margen = posturaFuera ? 0.75 : 1
      posturaFuera = posturaActual.some((valor, eje) =>
        Math.abs(valor - referencia[eje]) > tolerancias[eje] * margen)
    } else {
      posturaFuera = false
    }
    let estimada = muestraMirada && posturaActual && ajuste && !posturaFuera && !estado.cerrados
      ? ajuste(muestraMirada) : null
    if (estimada?.valida && compensar && posturaActual) {
      const corregida = compensar(estimada, posturaActual)
      estimada = Number.isFinite(corregida.x) && Number.isFinite(corregida.y) &&
        corregida.x >= 0 && corregida.x <= 1 && corregida.y >= 0 && corregida.y <= 1
        ? { valida: true, ...corregida } : null
    }
    if (estimada?.valida) {
      const dt = Math.max(0.001, Math.min(0.1, (ahora - tiempoFiltro) / 1000))
      const velocidad = miradaSuavizada ? Math.hypot(estimada.x - miradaSuavizada.x, estimada.y - miradaSuavizada.y) / dt : 0
      velocidadFiltro += (1 - Math.exp(-2 * Math.PI * dt)) * (velocidad - velocidadFiltro)
      const alpha = 1 - Math.exp(-2 * Math.PI * (0.8 + 0.5 * velocidadFiltro) * dt)
      tiempoFiltro = ahora
      miradaSuavizada = miradaSuavizada ? {
        x: miradaSuavizada.x + (estimada.x - miradaSuavizada.x) * alpha,
        y: miradaSuavizada.y + (estimada.y - miradaSuavizada.y) * alpha,
      } : { x: estimada.x, y: estimada.y }
    } else {
      miradaSuavizada = null
    }
    const mirada: Mirada = miradaSuavizada ? { valida: true, ...miradaSuavizada } : { valida: false }
    const valida = valor !== null
    const cambioOjos = estado.cerrados !== lectura.cerrados || estado.progreso !== lectura.progreso ||
      valida !== (lectura.izquierdo !== null && lectura.derecho !== null)
    lectura = { izquierdo, derecho, cerrados: estado.cerrados, progreso: estado.progreso, mirada, posturaFuera }
    // La pérdida de cámara debe distinguirse de una reapertura real.
    const ojos = { cerrados: estado.cerrados, progreso: estado.progreso, perdido: !valida }
    if (cambioOjos) bus.emit('ojos', ojos)
    if (estado.confirmar && !enPrueba) bus.emit('parpadeoLargo', {})
    observadores.forEach(observar => observar(lectura))
  }

  function perderSeguimiento(ahora: number) {
    muestraMirada = null
    posturaActual = null
    publicar(null, null, ahora)
  }

  function detener() {
    if (!activo) return
    activo = false
    sesion++
    cancelAnimationFrame(cuadro)
    stream?.getTracks().forEach(track => track.stop())
    if (video.srcObject === stream) video.srcObject = null
    modelo?.close()
    detenerActivo = null
    ajuste = null
    posturaCalibrada = null
    compensar = null
    enPrueba = false
    lineaBase = 0
    perderSeguimiento(performance.now())
  }

  function procesar(ahora: number) {
    if (!activo || !modelo) return
    cuadro = requestAnimationFrame(procesar)
    if (ahora - ultimaMuestra > 250 && lectura.izquierdo !== null) perderSeguimiento(ahora)
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.currentTime === ultimoVideo) return
    ultimoVideo = video.currentTime
    ultimaMuestra = ahora
    try {
      const resultado = detectarCuadro(modelo, video, ahora)
      const categorias = resultado.faceBlendshapes[0]?.categories
      const izquierdo = categorias?.find(item => item.categoryName === 'eyeBlinkLeft')?.score
      const derecho = categorias?.find(item => item.categoryName === 'eyeBlinkRight')?.score
      const cara = resultado.faceLandmarks[0]
      if (!cara || izquierdo === undefined || derecho === undefined) {
        perderSeguimiento(ahora)
        return
      }
      const aspecto = video.videoWidth / video.videoHeight
      muestraMirada = estimarMirada(cara, aspecto)
      posturaActual = medirPostura(cara, aspecto)
      publicar(izquierdo, derecho, ahora)
    } catch {
      perderSeguimiento(ahora)
    }
  }

  try {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const archivos = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm')
    modelo = await FaceLandmarker.createFromOptions(archivos, {
      baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task' },
      runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true,
    })
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
    video.muted = true
    video.playsInline = true
    video.srcObject = stream
    await video.play()
    detenerActivo = detener
    cuadro = requestAnimationFrame(procesar)
    return detener
  } catch (error) {
    detener()
    throw error
  } finally {
    iniciando = false
  }
}

