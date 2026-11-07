// Aviso y alarma sintetizados con WebAudio: sin archivos de audio.

let contexto: AudioContext | null = null
const activos = new Set<OscillatorNode>()

function ctx(): AudioContext {
  if (!contexto) contexto = new AudioContext()
  // Chrome lo crea suspendido hasta el primer gesto del usuario en la pagina.
  if (contexto.state === 'suspended') void contexto.resume()
  return contexto
}

function tono(frecuencia: number, desde: number, duracion: number, volumen: number, forma: OscillatorType = 'sine') {
  const c = ctx()
  const osc = c.createOscillator()
  const gan = c.createGain()
  osc.type = forma
  osc.frequency.value = frecuencia
  const t = c.currentTime + desde
  gan.gain.setValueAtTime(0, t)
  gan.gain.linearRampToValueAtTime(volumen, t + 0.02)
  gan.gain.exponentialRampToValueAtTime(0.001, t + duracion)
  osc.connect(gan).connect(c.destination)
  osc.start(t)
  osc.stop(t + duracion + 0.05)
  activos.add(osc)
  osc.onended = () => activos.delete(osc)
}

// Salida comprimida para las campanas: varias notas con cola larga se pisan y sin esto saturan.
let compresor: DynamicsCompressorNode | null = null
function salidaCampana(): AudioNode {
  const c = ctx()
  if (!compresor) {
    compresor = c.createDynamicsCompressor()
    compresor.threshold.value = -18
    compresor.ratio.value = 6
    compresor.connect(c.destination)
  }
  return compresor
}

// Golpe de campana: fundamental mas parciales que se apagan antes, como un gong de altoparlante.
const PARCIALES = [
  { ratio: 1, amp: 1, cola: 1 },
  { ratio: 2, amp: 0.45, cola: 0.6 },
  { ratio: 3, amp: 0.2, cola: 0.4 },
  { ratio: 4.2, amp: 0.12, cola: 0.25 },
]
function campana(frecuencia: number, desde: number, duracion: number, volumen: number) {
  const c = ctx()
  const t = c.currentTime + desde
  for (const p of PARCIALES) {
    const osc = c.createOscillator()
    const gan = c.createGain()
    osc.frequency.value = frecuencia * p.ratio
    const fin = t + duracion * p.cola
    gan.gain.setValueAtTime(0, t)
    gan.gain.linearRampToValueAtTime(volumen * p.amp, t + 0.005)
    gan.gain.exponentialRampToValueAtTime(0.001, fin)
    osc.connect(gan).connect(salidaCampana())
    osc.start(t)
    osc.stop(fin + 0.05)
    activos.add(osc)
    osc.onended = () => activos.delete(osc)
  }
}

// Corta en el acto los tonos ya programados (alarma a mitad de sirena).
export function cortarSonidos() {
  activos.forEach((osc) => osc.stop())
  activos.clear()
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Campanita de cancha antes de un anuncio: do-mi-sol que suben.
// Espera a que se apague la cola de la ultima nota: la voz no se pisa con la campanita.
export async function sonarAviso(): Promise<void> {
  ;[523, 659, 784].forEach((f, i) => campana(f, i * 0.5, 2, 0.45))
  await esperar(3050)
}

// Sirena de ~1,2 s, alternando dos tonos.
export async function sonarAlarma(): Promise<void> {
  for (let i = 0; i < 4; i++) tono(i % 2 ? 660 : 880, i * 0.3, 0.28, 0.5, 'square')
  await esperar(1250)
}
