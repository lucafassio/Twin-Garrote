// Motor "groq": detector de voz por volumen en el navegador + Whisper en Groq por frase.
// El fin de turno lo marca el detector en tiempo real (no depende de las tandas de Chrome).
// No hay texto en vivo: mientras hablan se muestra "...", y la frase llega ~1 s despues de que terminan.
// El microfono va por getUserMedia con cancelacion de eco y supresion de ruido.

import type { Escucha } from './escuchar'

export type OpcionesGroq = {
  silencioMs: () => number // silencio que cierra la frase
  sensibilidad: () => number // cuantas veces por encima del ruido de fondo cuenta como habla
  alParcial: (texto: string) => void
  alTurno: (texto: string) => void
  alEstado: (activo: boolean) => void
  alFallar: (motivo: string) => void // sin clave, sin microfono o red caida: el que llama pasa a Google
  alSegmento?: (info: { texto: string; audioMs: number; respuestaMs: number }) => void
  alNivel?: (info: { nivel: number; piso: number; hablando: boolean }) => void
}

const FRECUENCIA_SALIDA = 16000
const BLOQUE = 1024 // muestras por bloque del worklet (~21 ms a 48 kHz)
const PREVIO_MS = 300 // audio de antes de detectar la voz, para no comerse la primera silaba
const MINIMO_HABLA_MS = 400
const MAXIMO_FRASE_MS = 25000
const BLOQUES_PARA_ARRANCAR = 3
const PISO_MINIMO = 0.002
const ERRORES_PARA_FALLAR = 3

// Worklet minimo: junta muestras en bloques y las manda al hilo principal.
const CODIGO_WORKLET = `
class Captura extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(${BLOQUE}); this.n = 0 }
  process(inputs) {
    const canal = inputs[0][0]
    if (canal) for (let i = 0; i < canal.length; i++) {
      this.buf[this.n++] = canal[i]
      if (this.n === ${BLOQUE}) { this.port.postMessage(this.buf.slice()); this.n = 0 }
    }
    return true
  }
}
registerProcessor('captura-parpadeo', Captura)
`

export async function groqDisponible(): Promise<boolean> {
  try {
    const r = await fetch('/api/transcribir')
    return Boolean((await r.json()).disponible)
  } catch {
    return false
  }
}

export function crearEscuchaGroq(o: OpcionesGroq): Escucha {
  let quiere = false
  let listo: Promise<void> | null = null
  let contexto: AudioContext | null = null
  let stream: MediaStream | null = null
  let frecuencia = 48000

  let piso = 0.01 // ruido de fondo, se adapta mientras no hay habla
  let hablando = false
  let seguidos = 0
  let silencioDesde = 0
  let previo: Float32Array[] = []
  let frase: Float32Array[] = []
  let errores = 0
  let ultimoNivel = 0

  async function preparar() {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
    contexto = new AudioContext()
    frecuencia = contexto.sampleRate
    const url = URL.createObjectURL(new Blob([CODIGO_WORKLET], { type: 'application/javascript' }))
    await contexto.audioWorklet.addModule(url)
    URL.revokeObjectURL(url)
    const nodo = new AudioWorkletNode(contexto, 'captura-parpadeo')
    nodo.port.onmessage = (e: MessageEvent<Float32Array>) => procesar(e.data)
    contexto.createMediaStreamSource(stream).connect(nodo)
  }

  function procesar(bloque: Float32Array) {
    if (!quiere) return
    let suma = 0
    for (let i = 0; i < bloque.length; i++) suma += bloque[i] * bloque[i]
    const nivel = Math.sqrt(suma / bloque.length)
    const ms = (bloque.length / frecuencia) * 1000
    const ahora = performance.now()
    const esVoz = nivel > Math.max(piso, PISO_MINIMO) * o.sensibilidad()

    if (o.alNivel && ahora - ultimoNivel > 100) {
      ultimoNivel = ahora
      o.alNivel({ nivel, piso, hablando })
    }

    if (!hablando) {
      previo.push(bloque)
      while (previo.length * ms > PREVIO_MS) previo.shift()
      if (esVoz) seguidos++
      else {
        seguidos = 0
        piso = piso * 0.95 + nivel * 0.05
      }
      if (seguidos >= BLOQUES_PARA_ARRANCAR) {
        hablando = true
        frase = [...previo]
        previo = []
        silencioDesde = 0
        o.alParcial('...')
      }
      return
    }

    frase.push(bloque)
    if (esVoz) silencioDesde = 0
    else if (!silencioDesde) silencioDesde = ahora
    const duracion = frase.length * ms
    if ((silencioDesde && ahora - silencioDesde >= o.silencioMs()) || duracion >= MAXIMO_FRASE_MS) cerrarFrase()
  }

  function cerrarFrase() {
    const audio = frase
    hablando = false
    seguidos = 0
    silencioDesde = 0
    frase = []
    const audioMs = (audio.length * BLOQUE * 1000) / frecuencia
    if (audioMs < MINIMO_HABLA_MS) {
      o.alParcial('')
      return
    }
    void transcribir(audio, audioMs)
  }

  async function transcribir(audio: Float32Array[], audioMs: number) {
    const inicio = performance.now()
    try {
      const r = await fetch('/api/transcribir', {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: aWav(audio, frecuencia),
      })
      if (r.status === 503) return o.alFallar('falta GROQ_API_KEY')
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const { texto } = (await r.json()) as { texto: string }
      errores = 0
      o.alSegmento?.({ texto, audioMs: Math.round(audioMs), respuestaMs: Math.round(performance.now() - inicio) })
      if (!hablando) o.alParcial('')
      if (texto) o.alTurno(texto)
    } catch (err) {
      console.warn('voz: fallo la transcripcion con Groq', err)
      if (!hablando) o.alParcial('')
      if (++errores >= ERRORES_PARA_FALLAR) o.alFallar('la transcripcion fallo varias veces seguidas')
    }
  }

  // Descarta la frase en curso (aviso del sistema): igual que el motor de Chrome.
  function descartar() {
    if (hablando) o.alParcial('')
    hablando = false
    seguidos = 0
    silencioDesde = 0
    frase = []
    previo = []
  }

  return {
    abrir() {
      quiere = true
      if (!listo)
        listo = preparar().catch((err) => {
          console.warn('voz: no se pudo abrir el microfono para Groq', err)
          o.alFallar('sin microfono')
        })
      void listo.then(() => {
        if (quiere) o.alEstado(true)
      })
    },
    cerrar() {
      quiere = false
      descartar()
      o.alEstado(false)
    },
    cerrarTurno() {
      if (hablando) cerrarFrase()
    },
    destruir() {
      quiere = false
      stream?.getTracks().forEach((t) => t.stop())
      void contexto?.close()
    },
  }
}

// Baja a 16 kHz mono y arma un WAV PCM de 16 bits, que es lo que mejor digiere Whisper.
function aWav(bloques: Float32Array[], frecuencia: number): Blob {
  const total = bloques.reduce((n, b) => n + b.length, 0)
  const entrada = new Float32Array(total)
  let pos = 0
  for (const b of bloques) {
    entrada.set(b, pos)
    pos += b.length
  }
  const paso = frecuencia / FRECUENCIA_SALIDA
  const largo = Math.floor(total / paso)
  const datos = new DataView(new ArrayBuffer(44 + largo * 2))
  const texto = (offset: number, s: string) => [...s].forEach((c, i) => datos.setUint8(offset + i, c.charCodeAt(0)))
  texto(0, 'RIFF')
  datos.setUint32(4, 36 + largo * 2, true)
  texto(8, 'WAVE')
  texto(12, 'fmt ')
  datos.setUint32(16, 16, true)
  datos.setUint16(20, 1, true)
  datos.setUint16(22, 1, true)
  datos.setUint32(24, FRECUENCIA_SALIDA, true)
  datos.setUint32(28, FRECUENCIA_SALIDA * 2, true)
  datos.setUint16(32, 2, true)
  datos.setUint16(34, 16, true)
  texto(36, 'data')
  datos.setUint32(40, largo * 2, true)
  for (let i = 0; i < largo; i++) {
    // Promedio de las muestras que caen en cada muestra de salida: filtro pasa bajos barato.
    const desde = Math.floor(i * paso)
    const hasta = Math.min(Math.floor((i + 1) * paso), total)
    let suma = 0
    for (let j = desde; j < hasta; j++) suma += entrada[j]
    const v = Math.max(-1, Math.min(1, suma / Math.max(1, hasta - desde)))
    datos.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true)
  }
  return new Blob([datos.buffer], { type: 'audio/wav' })
}
