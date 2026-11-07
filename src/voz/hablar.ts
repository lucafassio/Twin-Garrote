// Dice texto en voz alta con speechSynthesis. Voz de Google (red) si hay,
// si no una local de Windows. La urgencia pide siempre voz local.

let voces: SpeechSynthesisVoice[] = []

export function cargarVoces(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolver) => {
    voces = speechSynthesis.getVoices()
    if (voces.length) return resolver(voces)
    // getVoices llega vacio la primera vez en Chrome: esperar voiceschanged.
    const listo = () => {
      voces = speechSynthesis.getVoices()
      resolver(voces)
    }
    speechSynthesis.addEventListener('voiceschanged', listo, { once: true })
    setTimeout(listo, 1500)
  })
}

const PREFERIDAS_RED = ['es-US', 'es-ES']
const PREFERIDAS_LOCAL = ['es-MX', 'es-AR', 'es-US', 'es-ES']

export function elegirVoz(soloLocal: boolean): SpeechSynthesisVoice | null {
  const es = voces.filter((v) => v.lang.toLowerCase().startsWith('es'))
  const buscar = (lista: SpeechSynthesisVoice[], langs: string[]) =>
    langs.map((l) => lista.find((v) => v.lang === l)).find(Boolean) ?? lista[0] ?? null
  const locales = es.filter((v) => v.localService)
  if (soloLocal) return buscar(locales, PREFERIDAS_LOCAL) ?? buscar(es, PREFERIDAS_LOCAL)
  const google = es.filter((v) => !v.localService && v.name.includes('Google'))
  return buscar(google, PREFERIDAS_RED) ?? buscar(locales, PREFERIDAS_LOCAL)
}

let utterance: SpeechSynthesisUtterance | null = null // referencia viva: si se pierde, Chrome no dispara onend

// Resuelve al terminar, al cancelarse o por timeout (onend a veces no llega).
export function hablar(texto: string, { soloLocal = false } = {}): Promise<void> {
  return new Promise((resolver) => {
    const voz = elegirVoz(soloLocal)
    const u = new SpeechSynthesisUtterance(texto)
    u.lang = voz?.lang ?? 'es-AR'
    if (voz) u.voice = voz
    u.volume = 1
    utterance = u

    let terminado = false
    const maximo = 4000 + texto.length * 120
    const fin = () => {
      if (terminado) return
      terminado = true
      clearTimeout(seguridad)
      clearInterval(despertador)
      if (utterance === u) utterance = null
      resolver()
    }
    const seguridad = setTimeout(fin, maximo)
    // Las voces de red de Chrome se cortan a ~15 s: pause/resume las mantiene vivas.
    const despertador = setInterval(() => {
      if (voz && !voz.localService && speechSynthesis.speaking) {
        speechSynthesis.pause()
        speechSynthesis.resume()
      }
    }, 10000)
    u.onend = fin
    u.onerror = fin
    speechSynthesis.speak(u)
  })
}

export function callar() {
  speechSynthesis.cancel()
}
