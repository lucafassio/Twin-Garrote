'use client'

import { useEffect, useState } from 'react'
import { bus } from '@/eventos'
import { ajustesVoz, CampoTurno, escuchaDisponible, iniciarVoz } from '@/voz'
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
  const [frase, setFrase] = useState('Si, dale, me encantaria.')
  const [voces, setVoces] = useState<SpeechSynthesisVoice[]>([])
  const [hayReconocimiento, setHayReconocimiento] = useState(true)

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
    return () => {
      offs.forEach((off) => off())
      depuracionEscucha.alResultado = null
    }
  }, [])

  useEffect(() => {
    if (!activa) return
    return iniciarVoz()
  }, [activa])

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
        <a className="ml-auto text-sm text-sky-400 underline" href="/prueba/voz/conversacion">
          Conversacion completa
        </a>
      </header>

      {!hayReconocimiento && (
        <p className="rounded bg-red-900 p-3">Este navegador no tiene reconocimiento de voz: usar Chrome. Queda el campo de texto.</p>
      )}

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
        </div>
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
