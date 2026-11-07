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

// Corta en el acto los tonos ya programados (alarma a mitad de sirena).
export function cortarSonidos() {
  activos.forEach((osc) => osc.stop())
  activos.clear()
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Ding-dong corto, como el de una cancha antes de un anuncio.
export async function sonarAviso(): Promise<void> {
  tono(988, 0, 0.35, 0.35)
  tono(784, 0.28, 0.5, 0.35)
  await esperar(750)
}

// Sirena de ~1,2 s, alternando dos tonos.
export async function sonarAlarma(): Promise<void> {
  for (let i = 0; i < 4; i++) tono(i % 2 ? 660 : 880, i * 0.3, 0.28, 0.5, 'square')
  await esperar(1250)
}
