// Escucha continua con el reconocimiento de Chrome (Web Speech API, es-AR, por red).
// Chrome corta la sesion cada tanto (no-speech a 8 s, 15 s de silencio): se relanza sola.
// Ojo: abre el microfono por su cuenta, sin cancelacion de eco (ver ADR 0002).

type Alternativa = { transcript: string }
type Resultado = { isFinal: boolean; 0: Alternativa }
type EventoResultado = { resultIndex: number; results: ArrayLike<Resultado> }
type Reconocedor = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  abort(): void
  onstart: (() => void) | null
  onend: (() => void) | null
  onresult: ((e: EventoResultado) => void) | null
  onerror: ((e: { error: string }) => void) | null
}

function constructor(): (new () => Reconocedor) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Reconocedor) | null
}

export const escuchaDisponible = () => constructor() !== null

export type Escucha = {
  abrir(): void
  cerrar(): void // corta y descarta lo que se estaba diciendo
  cerrarTurno(): void // cierra a mano el turno en curso
  destruir?(): void // suelta el microfono para siempre (al desmontar la voz)
}

// Para /prueba/voz: cada resultado de Chrome con el tiempo desde el anterior, para ajustar el fin de turno.
// Tambien el motor activo y, con Groq, cada frase transcripta y el nivel del microfono.
export const depuracionEscucha: {
  alResultado: ((r: { texto: string; final: boolean; desdeAnteriorMs: number }) => void) | null
  alMotor?: ((motor: string) => void) | null
  alSegmento?: ((s: { texto: string; audioMs: number; respuestaMs: number }) => void) | null
  alNivel?: ((n: { nivel: number; piso: number; hablando: boolean }) => void) | null
} = { alResultado: null }

type OpcionesEscucha = {
  esperaMs: (texto: string, final: boolean) => number // silencio que cierra el turno en curso
  alParcial: (texto: string) => void
  alTurno: (texto: string) => void
  alEstado: (activo: boolean) => void
}

const RELANZAR_MS = 250
const ERRORES_FATALES = ['not-allowed', 'service-not-allowed', 'audio-capture']

export function crearEscucha({ esperaMs, alParcial, alTurno, alEstado }: OpcionesEscucha): Escucha {
  const Ctor = constructor()
  if (!Ctor) {
    console.warn('voz: este navegador no tiene reconocimiento de voz; queda solo CampoTurno')
    return { abrir() {}, cerrar() {}, cerrarTurno() {} }
  }
  const rec = new Ctor()
  rec.lang = 'es-AR'
  rec.continuous = true
  rec.interimResults = true

  let quiere = false
  let corriendo = false
  let bloqueado = false
  let ignorarHasta = 0 // resultados de la sesion que ya se mandaron como turno
  let largo = 0
  let pendiente = ''
  let silencio: ReturnType<typeof setTimeout> | null = null
  let ultimoResultado = performance.now()

  function cerrarTurno() {
    if (silencio) clearTimeout(silencio)
    silencio = null
    const texto = pendiente
    pendiente = ''
    ignorarHasta = largo
    if (!texto) return
    alTurno(texto)
    alParcial('')
  }

  function descartar() {
    if (silencio) clearTimeout(silencio)
    silencio = null
    ignorarHasta = largo
    if (pendiente) alParcial('')
    pendiente = ''
  }

  function arrancar() {
    if (!quiere || corriendo || bloqueado) return
    try {
      rec.start()
      corriendo = true
    } catch {
      // ya estaba arrancando: onend lo relanza
    }
  }

  rec.onstart = () => {
    ignorarHasta = 0
    largo = 0
    alEstado(true)
  }

  rec.onresult = (e) => {
    largo = e.results.length
    const partes: string[] = []
    for (let i = ignorarHasta; i < largo; i++) partes.push(e.results[i][0].transcript)
    const texto = partes.join(' ').replace(/\s+/g, ' ').trim()
    if (!texto || !quiere) return
    const final = e.results[largo - 1].isFinal
    const ahora = performance.now()
    depuracionEscucha.alResultado?.({ texto, final, desdeAnteriorMs: Math.round(ahora - ultimoResultado) })
    ultimoResultado = ahora
    pendiente = texto
    alParcial(texto)
    if (silencio) clearTimeout(silencio)
    silencio = setTimeout(cerrarTurno, esperaMs(texto, final))
  }

  rec.onerror = (e) => {
    if (!ERRORES_FATALES.includes(e.error)) return // no-speech, network, aborted: onend relanza
    bloqueado = true
    console.warn(`voz: el reconocimiento no puede usar el microfono (${e.error})`)
  }

  rec.onend = () => {
    corriendo = false
    // La sesion murio con una frase a medias: se manda como turno.
    if (pendiente) cerrarTurno()
    if (quiere && !bloqueado) setTimeout(arrancar, RELANZAR_MS)
    else alEstado(false)
  }

  return {
    abrir() {
      quiere = true
      arrancar()
    },
    cerrar() {
      quiere = false
      descartar()
      if (corriendo) rec.abort()
      alEstado(false)
    },
    cerrarTurno,
    destruir() {
      quiere = false
      descartar()
      if (corriendo) rec.abort()
    },
  }
}
