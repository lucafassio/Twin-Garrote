'use client'

import { useEffect, useState } from 'react'
import { bus } from '@/eventos'
import { ajustesVoz, CampoTurno, escuchaDisponible, iniciarVoz, mensajeUrgencia, type Motor } from '@/voz'
import { depuracionEscucha } from '@/voz/escuchar'
import { cargarVoces, elegirVoz } from '@/voz/hablar'

// Pagina de prueba del path voz. Solo la toca ese path.
// "Empezar" hace falta: Chrome no deja hablar ni sonar audio sin un click previo en la pagina.
export default function Prueba() {
  const [activa, setActiva] = useState(false)
  const [escuchando, setEscuchando] = useState(false)
  const [hablando, setHablando] = useState(false)
  const [parcial, setParcial] = useState('')
  const [turnos, setTurnos] = useState<string[]>([])
  const [log, setLog] = useState<string[]>([])
  const [silencio, setSilencio] = useState(ajustesVoz.silencioMs)
  const [extra, setExtra] = useState(ajustesVoz.extraSinFinalMs)
  const [resultados, setResultados] = useState<string[]>([])
  const [vistaPrevia, setVistaPrevia] = useState('')
  const [frase, setFrase] = useState('Si, dale, me encantaria.')
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([])
  const [hayReconocimiento, setHayReconocimiento] = useState(true)
  const [motor, setMotor] = useState<Motor>(ajustesVoz.motor)
  const [motorActivo, setMotorActivo] = useState('')
  const [nivel, setNivel] = useState({ nivel: 0, piso: 0, hablando: false })
  const [silencioVad, setSilencioVad] = useState(ajustesVoz.silencioVadMs)
  const [sensibilidad, setSensibilidad] = useState(ajustesVoz.sensibilidadVad)

  useEffect(() => {
    void cargarVoces().then(setVoces)
    const anotar = (linea: string) =>
      setLog((l) => [`${new Date().toLocaleTimeString('es-AR')} ${linea}`, ...l].slice(0, 40))
    const offs = [
      bus.on('escuchando', ({ activo }) => setEscuchando(activo)),
      bus.on('hablando', ({ activo }) => {
        setHablando(activo)
        anotar(`hablando ${activo}`)
      }),
      bus.on('transcripcionParcial', ({ texto }) => setParcial(texto)),
      bus.on('turno', ({ texto }) => {
        setTurnos((t) => [texto, ...t].slice(0, 20))
        anotar(`turno: ${texto}`)
      }),
      bus.on('decir', ({ texto, urgencia }) => anotar(`decir${urgencia ? ' (urgencia)' : ''}: ${texto}`)),
      bus.on('detenerUrgencia', ({ falsaAlarma }) => anotar(`detenerUrgencia${falsaAlarma ? ' (falsa alarma)' : ' (atendida)'}`)),
      bus.on('repetir', () => anotar('repetir')),
    ]
    depuracionEscucha.alResultado = ({ texto, final, desdeAnteriorMs }) =>
      setResultados((r) => [`+${desdeAnteriorMs} ms ${final ? 'FINAL' : 'parcial'}: ${texto}`, ...r].slice(0, 60))
    depuracionEscucha.alSegmento = ({ texto, audioMs, respuestaMs }) =>
      setResultados((r) => [`groq: ${audioMs} ms de audio, respondio en ${respuestaMs} ms: ${texto || '(vacio)'}`, ...r].slice(0, 60))
    depuracionEscucha.alMotor = setMotorActivo
    depuracionEscucha.alNivel = setNivel
    return () => {
      offs.forEach((off) => off())
      depuracionEscucha.alResultado = null
      depuracionEscucha.alSegmento = null
      depuracionEscucha.alMotor = null
      depuracionEscucha.alNivel = null
    }
  }, [])

  // Cambiar de motor con la voz prendida la reinicia con el motor nuevo.
  useEffect(() => {
    if (!activa) return
    return iniciarVoz()
  }, [activa, motor])

  const vozRed = voces.length ? elegirVoz(false) : null
  const vozLocal = voces.length ? elegirVoz(true) : null

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <header className="flex items-center gap-4">
        <h1 className="text-4xl font-bold">Prueba: VOZ</h1>
        <button
          className={`rounded px-4 py-2 font-bold ${activa ? 'bg-zinc-700' : 'bg-emerald-600'}`}
          onClick={() => {
            setHayReconocimiento(escuchaDisponible())
            setActiva((a) => !a)
          }}
        >
          {activa ? 'Detener' : 'Empezar'}
        </button>
        <span className={`rounded-full px-3 py-1 text-sm ${escuchando ? 'bg-emerald-600' : 'bg-zinc-700'}`}>
          {escuchando ? 'Escuchando' : 'No escucha'}
        </span>
        {hablando && <span className="rounded-full bg-sky-600 px-3 py-1 text-sm">Hablando</span>}
        {activa && motorActivo && <span className="text-sm text-zinc-400">motor: {motorActivo}</span>}
        <a className="ml-auto text-sm text-sky-400 underline" href="/prueba/voz/conversacion">
          Conversacion completa
        </a>
      </header>

      {!hayReconocimiento && (
        <p className="rounded bg-red-900 p-3">Este navegador no tiene reconocimiento de voz: usar Chrome. Queda el campo de texto.</p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm uppercase text-zinc-400">Motor para escuchar</h2>
        <div className="flex gap-2">
          {(['google', 'groq'] as Motor[]).map((m) => (
            <button
              key={m}
              className={`rounded px-4 py-2 ${motor === m ? 'bg-sky-700 font-bold' : 'bg-zinc-800'}`}
              onClick={() => {
                ajustesVoz.motor = m
                setMotor(m)
              }}
            >
              {m === 'google' ? 'Google (Chrome)' : 'Groq (Whisper)'}
            </button>
          ))}
        </div>
        {motor === 'groq' && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              Microfono
              <div className="relative h-3 w-64 rounded bg-zinc-800">
                <div
                  className={`h-3 rounded ${nivel.hablando ? 'bg-emerald-500' : 'bg-zinc-500'}`}
                  style={{ width: `${Math.min(100, nivel.nivel * 800)}%` }}
                />
                <div
                  className="absolute top-0 h-3 w-0.5 bg-amber-400"
                  style={{ left: `${Math.min(100, Math.max(nivel.piso, 0.002) * sensibilidad * 800)}%` }}
                  title="umbral de habla"
                />
              </div>
              <span className="text-zinc-500">la raya amarilla es el umbral: hablando tiene que pasarla, el ruido no</span>
            </div>
            <label className="flex items-center gap-3">
              Silencio que cierra la frase: {silencioVad} ms
              <input
                type="range"
                min={400}
                max={2500}
                step={100}
                value={silencioVad}
                onChange={(e) => {
                  ajustesVoz.silencioVadMs = Number(e.target.value)
                  setSilencioVad(ajustesVoz.silencioVadMs)
                }}
              />
            </label>
            <label className="flex items-center gap-3">
              Sensibilidad (mas alto = ignora mas ruido): {sensibilidad}
              <input
                type="range"
                min={1.5}
                max={8}
                step={0.5}
                value={sensibilidad}
                onChange={(e) => {
                  ajustesVoz.sensibilidadVad = Number(e.target.value)
                  setSensibilidad(ajustesVoz.sensibilidadVad)
                }}
              />
            </label>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm uppercase text-zinc-400">En vivo</h2>
        <p className="min-h-16 text-3xl">{parcial || <span className="text-zinc-600">...</span>}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase text-zinc-400">Turno a mano</h2>
        <CampoTurno />
        <label className="flex items-center gap-3 text-sm">
          Silencio de fin de turno (frase final): {silencio} ms
          <input
            type="range"
            min={500}
            max={3000}
            step={100}
            value={silencio}
            onChange={(e) => {
              ajustesVoz.silencioMs = Number(e.target.value)
              setSilencio(ajustesVoz.silencioMs)
            }}
          />
        </label>
        <label className="flex items-center gap-3 text-sm">
          Extra si Chrome no la cerro: {extra} ms
          <input
            type="range"
            min={0}
            max={3000}
            step={100}
            value={extra}
            onChange={(e) => {
              ajustesVoz.extraSinFinalMs = Number(e.target.value)
              setExtra(ajustesVoz.extraSinFinalMs)
            }}
          />
        </label>
        <p className="text-xs text-zinc-500">Frases de hasta {ajustesVoz.palabrasFraseCorta} palabras esperan el doble.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm uppercase text-zinc-400">Decir</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded bg-zinc-800 px-3 py-2 text-white"
            value={frase}
            onChange={(e) => setFrase(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && frase.trim() && bus.emit('decir', { texto: frase.trim() })}
          />
          <button className="rounded bg-sky-700 px-4" onClick={() => frase.trim() && bus.emit('decir', { texto: frase.trim() })}>
            Decir
          </button>
          <button className="rounded bg-zinc-700 px-4" onClick={() => bus.emit('repetir', {})}>
            Repetir
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded bg-red-700 px-4 py-2 font-bold"
            onClick={() => bus.emit('decir', { texto: 'Necesito ayuda.', urgencia: true })}
          >
            Urgencia
          </button>
          <button className="rounded bg-zinc-700 px-4" onClick={() => bus.emit('detenerUrgencia', {})}>
            Atendida
          </button>
          <button className="rounded bg-zinc-700 px-4" onClick={() => bus.emit('detenerUrgencia', { falsaAlarma: true })}>
            Falsa alarma
          </button>
          <button className="rounded bg-zinc-800 px-4" onClick={() => setVistaPrevia(mensajeUrgencia(ajustesVoz.nombre))}>
            Ver mensaje (sin mandar)
          </button>
        </div>
        {vistaPrevia && <pre className="whitespace-pre-wrap rounded bg-zinc-900 p-3 text-sm">{vistaPrevia}</pre>}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section>
          <h2 className="text-sm uppercase text-zinc-400">Turnos ({turnos.length})</h2>
          <ol className="list-decimal pl-6">
            {turnos.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        </section>
        <section>
          <h2 className="text-sm uppercase text-zinc-400">Eventos</h2>
          <ul className="max-h-64 overflow-auto font-mono text-xs">
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="text-sm uppercase text-zinc-400">Resultados de Chrome (tiempo desde el anterior)</h2>
        <ul className="max-h-64 overflow-auto font-mono text-xs">
          {resultados.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      <section className="text-sm text-zinc-400">
        <h2 className="uppercase">Voces</h2>
        <p>Comun: {vozRed ? `${vozRed.name} (${vozRed.lang}, ${vozRed.localService ? 'local' : 'red'})` : 'ninguna'}</p>
        <p>Urgencia: {vozLocal ? `${vozLocal.name} (${vozLocal.lang}, local)` : 'ninguna'}</p>
        <details>
          <summary>Todas en espanol</summary>
          <ul>
            {voces
              .filter((v) => v.lang.startsWith('es'))
              .map((v) => (
                <li key={v.voiceURI}>
                  {v.name} - {v.lang} - {v.localService ? 'local' : 'red'}
                </li>
              ))}
          </ul>
        </details>
      </section>
    </main>
  )
}
