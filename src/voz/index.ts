// Path voz: todo lo que entra y sale por sonido. Ver issue PATH: VOZ y ADR 0002.
// Escucha al interlocutor y emite transcripcionParcial / turno / escuchando.
// Dice en voz alta cada decir (con aviso antes), repite la ultima respuesta y maneja la urgencia.

import { bus } from '@/eventos'
import { anotarEnCurso, anotarLinea, contextoCharla } from './charla'
import { crearEscucha, depuracionEscucha, type Escucha } from './escuchar'
import { crearEscuchaGroq, groqDisponible } from './escucharGroq'
import { callar, cargarVoces, hablar } from './hablar'
import { cortarSonidos, sonarAlarma, sonarAviso } from './sonidos'
import { registrarCierre } from './turnoManual'

export { default as CampoTurno } from './CampoTurno'
export { escuchaDisponible } from './escuchar'
export { cerrarTurno } from './turnoManual'

// Motor para escuchar. "groq" cae solo a "google" si falta la clave, el microfono o la red.
export type Motor = 'google' | 'groq'

// Ajustables en vivo desde /prueba/voz.
export const ajustesVoz = {
  motor: 'google' as Motor,
  silencioVadMs: 900, // groq: silencio que cierra la frase (el detector no tiene el atraso de Chrome)
  sensibilidadVad: 3, // groq: veces por encima del ruido de fondo que cuenta como habla
  silencioMs: 1500, // silencio que cierra el turno cuando Chrome ya marco la frase como final
  extraSinFinalMs: 1000, // espera de mas si Chrome todavia no la cerro: sus resultados llegan en tandas
  palabrasFraseCorta: 2, // "Roberto..." o "Che..." esperan el doble: casi seguro sigue algo
  nombre: 'Roberto', // como se nombra al usuario en los mensajes al contacto
}

// Fin de turno adaptativo: con silencio fijo, las tandas de Chrome y las pausas
// despues de un vocativo partian una frase en dos turnos.
function esperaFinDeTurno(texto: string, final: boolean): number {
  let ms = ajustesVoz.silencioMs
  if (!final) ms += ajustesVoz.extraSinFinalMs
  if (texto.split(' ').length <= ajustesVoz.palabrasFraseCorta) ms *= 2
  return ms
}

const REABRIR_MS = 500 // espera despues de hablar antes de volver a escuchar
const PAUSA_URGENCIA_MS = 1500

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function iniciarVoz(): () => void {
  let generacion = 0 // cada decir o urgencia nueva invalida lo que estaba sonando
  let enUrgencia = false
  let ultimaRespuesta: string | null = null
  let reabrir: ReturnType<typeof setTimeout> | null = null

  const escucha = crearEscuchaConMotor()
  const soltarCierre = registrarCierre(escucha.cerrarTurno)
  void cargarVoces()
  escucha.abrir()

  // Half-duplex: sin escucha desde el aviso hasta REABRIR_MS despues de hablar.
  function empezarHabla(): number {
    if (reabrir) clearTimeout(reabrir)
    escucha.cerrar()
    callar()
    cortarSonidos()
    bus.emit('hablando', { activo: true })
    return ++generacion
  }

  function terminarHabla() {
    bus.emit('hablando', { activo: false })
    reabrir = setTimeout(() => escucha.abrir(), REABRIR_MS)
  }

  async function decir(texto: string) {
    const g = empezarHabla()
    await sonarAviso()
    if (g !== generacion) return
    await hablar(texto)
    if (g !== generacion) return
    terminarHabla()
  }

  async function urgencia(texto: string) {
    const mensaje = mensajeUrgencia(ajustesVoz.nombre) // antes de cortar la escucha, que descarta la frase en curso
    const g = empezarHabla()
    enUrgencia = true
    avisarContacto(mensaje)
    while (g === generacion) {
      await sonarAlarma()
      if (g !== generacion) return
      await hablar(texto, { soloLocal: true }) // voz local: suena aunque se caiga la red
      if (g !== generacion) return
      await esperar(PAUSA_URGENCIA_MS)
    }
  }

  const offs = [
    bus.on('turno', ({ texto }) => anotarLinea({ quien: 'interlocutor', texto })),
    bus.on('transcripcionParcial', ({ texto }) => anotarEnCurso(texto)),
    bus.on('decir', ({ texto, urgencia: esUrgencia }) => {
      if (esUrgencia) {
        if (!enUrgencia) void urgencia(texto)
        return
      }
      if (enUrgencia) return // la urgencia no la corta una respuesta comun
      ultimaRespuesta = texto
      anotarLinea({ quien: 'usuario', texto })
      void decir(texto)
    }),
    bus.on('repetir', () => {
      if (ultimaRespuesta && !enUrgencia) void decir(ultimaRespuesta)
    }),
    bus.on('detenerUrgencia', ({ falsaAlarma }) => {
      if (!enUrgencia) return
      enUrgencia = false
      generacion++
      callar()
      cortarSonidos()
      avisarContacto(
        falsaAlarma
          ? `Fue sin querer, ${ajustesVoz.nombre} esta bien.`
          : `Alguien ya esta con ${ajustesVoz.nombre}.`,
      )
      terminarHabla()
    }),
  ]

  return () => {
    offs.forEach((off) => off())
    generacion++
    if (reabrir) clearTimeout(reabrir)
    escucha.cerrar()
    escucha.destruir?.()
    callar()
    cortarSonidos()
    soltarCierre()
  }
}

// Arma la escucha con el motor elegido. Groq tiene a Google de respaldo: si falla, cambia solo.
function crearEscuchaConMotor(): Escucha {
  const base = {
    alParcial: (texto: string) => bus.emit('transcripcionParcial', { texto }),
    alTurno: (texto: string) => bus.emit('turno', { texto }),
    alEstado: (activo: boolean) => bus.emit('escuchando', { activo }),
  }
  const google = () => {
    depuracionEscucha.alMotor?.('google')
    return crearEscucha({ ...base, esperaMs: esperaFinDeTurno })
  }
  if (ajustesVoz.motor === 'google') return google()

  let abierta = false
  const groq: Escucha = crearEscuchaGroq({
    ...base,
    silencioMs: () => ajustesVoz.silencioVadMs,
    sensibilidad: () => ajustesVoz.sensibilidadVad,
    alFallar: (motivo) => pasarAGoogle(motivo),
    alSegmento: (s) => depuracionEscucha.alSegmento?.(s),
    alNivel: (n) => depuracionEscucha.alNivel?.(n),
  })
  let actual = groq
  depuracionEscucha.alMotor?.('groq')

  function pasarAGoogle(motivo: string) {
    if (actual !== groq) return
    console.warn(`voz: Groq no anda (${motivo}); sigo con el reconocimiento de Chrome`)
    groq.cerrar()
    groq.destruir?.()
    actual = google()
    if (abierta) actual.abrir()
  }
  void groqDisponible().then((hay) => {
    if (!hay) pasarAGoogle('falta GROQ_API_KEY')
  })

  return {
    abrir() {
      abierta = true
      actual.abrir()
    },
    cerrar() {
      abierta = false
      actual.cerrar()
    },
    cerrarTurno() {
      actual.cerrarTurno()
    },
    destruir() {
      actual.destruir?.()
    },
  }
}

export function mensajeUrgencia(nombre: string): string {
  const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  const contexto = contextoCharla(nombre)
  return `${nombre} pidio ayuda a las ${hora}.${contexto ? `\n\nLo ultimo de la charla:\n${contexto}` : ''}`
}

// Manda el mensaje al contacto por /api/urgencia. Un reintento si falla la red.
function avisarContacto(texto: string, intento = 1) {
  fetch('/api/urgencia', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
    })
    .catch((err) => {
      console.warn('voz: no se pudo avisar al contacto', err)
      if (intento < 2) setTimeout(() => avisarContacto(texto, intento + 1), 2000)
    })
}
