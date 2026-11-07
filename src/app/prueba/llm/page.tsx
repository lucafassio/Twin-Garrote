'use client'

import { useEffect, useState } from 'react'
import { registrarEleccion } from '@/llm/cliente'
import type { Eleccion, ResumenElecciones } from '@/llm/elecciones'
import type { Cercania, LineaHistorial, Opcion, PedidoOpciones, TipoTurno } from '@/eventos'
import PruebaCompletado from './PruebaCompletado'
import PruebaCorte from './PruebaCorte'
import { LoQueAprendi } from './LoQueAprendi'

// Pagina de prueba del path llm. Solo la toca ese path.
// Se escribe un turno (o se elige uno de los 10 de prueba), se piden las opciones y se mide la latencia.

const TURNOS_DE_PRUEBA: { turno: string; cercania?: Cercania }[] = [
  { turno: '¿Qué querés comer hoy?', cercania: 'familia' },
  { turno: '¿Tenés hambre? ¿Te preparo algo?', cercania: 'familia' },
  { turno: '¿Viste el partido de River ayer?', cercania: 'conocido' },
  { turno: 'Che, ¿quién gana el superclásico el domingo?' },
  { turno: '¿Cómo te sentís hoy?', cercania: 'familia' },
  { turno: '¿Dormiste bien anoche?' },
  { turno: 'Laura dijo que viene el sábado con los chicos.', cercania: 'familia' },
  { turno: '¿Querés que abra la ventana?' },
  { turno: 'Buenos días, Roberto. ¿Tuvo dificultad para tragar esta semana?', cercania: 'formal' },
  { turno: 'Le vamos a ajustar la medicación. ¿Tiene alguna pregunta?', cercania: 'formal' },
]

type Medicion = { turno: string; cercania: string; msTotal: number; msServidor: number; proveedor: string }

type Respuesta = {
  pedido: PedidoOpciones
  opciones: Opcion[]
  registro: string
  nuevaConversacion: boolean
  proveedor: string
  ms: number
}

export default function Prueba() {
  const [turno, setTurno] = useState(TURNOS_DE_PRUEBA[0].turno)
  const [sinTurno, setSinTurno] = useState(false)
  const [tipoTurno, setTipoTurno] = useState<TipoTurno | ''>('')
  const [cercania, setCercania] = useState<Cercania | ''>(TURNOS_DE_PRUEBA[0].cercania ?? '')
  const [interlocutor, setInterlocutor] = useState('')
  const [historial, setHistorial] = useState<LineaHistorial[]>([])
  const [yaMostradas, setYaMostradas] = useState<string[]>([])
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null)
  const [msTotal, setMsTotal] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const [mediciones, setMediciones] = useState<Medicion[]>([])
  const [resumen, setResumen] = useState<ResumenElecciones | null>(null)
  const [errorRegistro, setErrorRegistro] = useState(false)

  function mostrarResumen(nuevo: ResumenElecciones) {
    setResumen((previo) => !previo || nuevo.total >= previo.total ? nuevo : previo)
  }

  useEffect(() => {
    let vigente = true
    fetch('/api/elecciones').then(async (r) => {
      if (!r.ok) throw new Error('No se pudo leer el resumen')
      const datos: ResumenElecciones = await r.json()
      if (vigente) mostrarResumen(datos)
    }).catch(() => { if (vigente) setErrorRegistro(true) })
    return () => { vigente = false }
  }, [])

  function registrar(eleccion: Eleccion) {
    if (!respuesta) return
    const { pedido, opciones } = respuesta
    void registrarEleccion({
      opciones, eleccion, turno: pedido.ultimoTurno, cercania: pedido.cercania ?? null,
      interlocutor: pedido.interlocutor, tipoTurno: pedido.tipoTurno,
    }).then((nuevo) => {
      setErrorRegistro(!nuevo)
      if (nuevo) mostrarResumen(nuevo)
    })
  }

  async function pedir(otra: boolean) {
    if (otra) registrar('otra')
    const mostradas = otra && respuesta ? [...yaMostradas, ...respuesta.opciones.map((o) => o.texto)] : []
    const pedido: PedidoOpciones = otra && respuesta ? { ...respuesta.pedido, yaMostradas: mostradas } : {
      historial,
      ultimoTurno: sinTurno ? null : turno,
      yaMostradas: mostradas,
      ...(cercania ? { cercania } : {}),
      ...(tipoTurno && !sinTurno ? { tipoTurno } : {}),
      ...(interlocutor.trim() ? { interlocutor: interlocutor.trim() } : {}),
    }
    setCargando(true)
    setError(null)
    const inicio = performance.now()
    try {
      const r = await fetch('/api/opciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedido),
      })
      const datos = await r.json()
      const total = Math.round(performance.now() - inicio)
      if (!r.ok) throw new Error(datos.error ?? `HTTP ${r.status}`)
      setRespuesta({ ...datos, pedido })
      setMsTotal(total)
      setYaMostradas(mostradas)
      setMediciones((m) => [
        { turno: sinTurno ? '(sin turno)' : turno, cercania: cercania || '—', msTotal: total, msServidor: datos.ms, proveedor: datos.proveedor },
        ...m,
      ])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCargando(false)
    }
  }

  function elegir(o: Opcion, posicion: number) {
    if (!respuesta || cargando) return
    registrar(posicion as Eleccion)
    const nuevas: LineaHistorial[] = []
    if (respuesta.pedido.ultimoTurno !== null) nuevas.push({ quien: 'interlocutor', texto: respuesta.pedido.ultimoTurno })
    nuevas.push({ quien: 'usuario', texto: o.texto, origen: 'opcion' })
    setHistorial((h) => [...h, ...nuevas])
    setRespuesta(null)
    setYaMostradas([])
    setTurno('')
  }

  const pedidoDePagina: PedidoOpciones = {
    historial,
    ultimoTurno: sinTurno ? null : turno,
    yaMostradas: [],
    ...(cercania ? { cercania } : {}),
    ...(tipoTurno && !sinTurno ? { tipoTurno } : {}),
    ...(interlocutor.trim() ? { interlocutor: interlocutor.trim() } : {}),
  }

  const promedio = mediciones.length
    ? Math.round(mediciones.reduce((s, m) => s + m.msTotal, 0) / mediciones.length)
    : null

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-4xl font-bold">Prueba: LLM</h1>

      <section className="space-y-3">
        <label className="block text-sm font-semibold">Turno del interlocutor</label>
        <textarea
          className="w-full rounded border bg-transparent p-3 text-lg"
          rows={2}
          value={turno}
          disabled={sinTurno}
          onChange={(e) => setTurno(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sinTurno} onChange={(e) => setSinTurno(e.target.checked)} />
            Sin turno (arrancar charla)
          </label>
          <label className="flex items-center gap-2">
            Tipo de turno
            <select
              className="rounded border bg-transparent p-1"
              value={tipoTurno}
              disabled={sinTurno}
              onChange={(e) => setTipoTurno(e.target.value as TipoTurno | '')}
            >
              <option value="">sin aviso</option>
              <option value="siNo">si o no</option>
              <option value="abierta">abierta</option>
              <option value="comentario">comentario</option>
              <option value="saludo">saludo</option>
              <option value="pedido">pedido</option>
              <option value="otro">otro</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Cercanía
            <select
              className="rounded border bg-transparent p-1"
              value={cercania}
              onChange={(e) => setCercania(e.target.value as Cercania | '')}
            >
              <option value="">sin aclarar</option>
              <option value="familia">familia</option>
              <option value="conocido">conocido</option>
              <option value="formal">formal</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Quién habla
            <input
              className="w-36 rounded border bg-transparent p-1"
              placeholder="sin aclarar"
              value={interlocutor}
              onChange={(e) => setInterlocutor(e.target.value)}
            />
          </label>
          <button
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
            disabled={cargando}
            onClick={() => pedir(false)}
          >
            Pedir opciones
          </button>
          <button
            className="rounded bg-gray-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
            disabled={cargando || !respuesta}
            onClick={() => pedir(true)}
          >
            Otra
          </button>
          {cargando && <span>Pensando…</span>}
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm font-semibold">Turnos de prueba</p>
        <div className="flex flex-wrap gap-2">
          {TURNOS_DE_PRUEBA.map((t, i) => (
            <button
              key={i}
              className="rounded border px-2 py-1 text-sm hover:bg-gray-100 hover:text-black"
              onClick={() => {
                setTurno(t.turno)
                setCercania(t.cercania ?? '')
                setSinTurno(false)
                setRespuesta(null)
                setYaMostradas([])
              }}
            >
              {i + 1}. {t.turno}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="rounded bg-red-100 p-3 text-red-800">Error: {error}</p>}

      <section className="space-y-2 rounded border p-4" aria-live="polite">
        <h2 className="font-semibold">Resumen de elecciones</h2>
        {resumen && <>
          <p>{resumen.total} elecciones registradas</p>
          <p>{resumen.posiciones.map((cantidad, i) => `Posicion ${i + 1}: ${cantidad}`).join(' / ')}</p>
          <p>Otra: {(resumen.tasaOtra * 100).toFixed(1)}% · Fijas: {(resumen.tasaFijas * 100).toFixed(1)}% · Posicion media: {resumen.posicionMedia?.toFixed(2) ?? 'sin datos'}</p>
          <p className="text-sm">Tasas sobre todas las elecciones. Media solo sobre opciones 1 a 4.</p>
        </>}
        {errorRegistro && <p role="status">No se pudo actualizar el registro. Podes seguir con el turno.</p>}
      </section>

      {respuesta && (
        <section className="space-y-2">
          <p className="text-sm">
            <strong>{msTotal} ms</strong> en total ({respuesta.ms} ms en el servidor) · {respuesta.proveedor} ·
            registro {respuesta.registro} · {respuesta.nuevaConversacion ? 'conversación nueva' : 'misma conversación'}
          </p>
          <ol className="space-y-2">
            {respuesta.opciones.map((o, i) => (
              <li key={i}>
                <button
                  className="w-full rounded border p-3 text-left text-xl hover:bg-gray-100 hover:text-black"
                  disabled={cargando}
                  onClick={() => elegir(o, i + 1)}
                  title="Elegir esta opción: pasa al historial"
                >
                  <span className="mr-2 text-sm text-gray-500">
                    {i + 1}. {o.intencion}
                  </span>
                  {o.texto}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {historial.length > 0 && (
        <section>
          <div className="flex items-center gap-4">
            <p className="text-sm font-semibold">Historial</p>
            <button className="text-sm underline" onClick={() => setHistorial([])}>
              Vaciar
            </button>
          </div>
          <ul className="text-sm">
            {historial.map((l, i) => (
              <li key={i}>
                <strong>{l.quien}:</strong> {l.texto}
              </li>
            ))}
          </ul>
        </section>
      )}

      <PruebaCompletado pedido={pedidoDePagina} />

      <PruebaCorte pedido={pedidoDePagina} />

      <LoQueAprendi
        historial={historial}
        cercania={cercania}
        alCerrar={() => {
          setHistorial([])
          setRespuesta(null)
          setYaMostradas([])
        }}
      />

      {mediciones.length > 0 && (
        <section>
          <p className="text-sm font-semibold">Latencias (promedio {promedio} ms)</p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>Turno</th>
                <th>Cercanía</th>
                <th>Total</th>
                <th>Servidor</th>
                <th>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {mediciones.map((m, i) => (
                <tr key={i} className={m.msTotal > 2500 ? 'text-red-600' : ''}>
                  <td>{m.turno}</td>
                  <td>{m.cercania}</td>
                  <td>{m.msTotal} ms</td>
                  <td>{m.msServidor} ms</td>
                  <td>{m.proveedor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  )
}
