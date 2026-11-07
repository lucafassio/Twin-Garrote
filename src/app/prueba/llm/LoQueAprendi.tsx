'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Cercania, LineaHistorial } from '@/eventos'
import { describirFecha } from '@/llm/fechas'
import type { HechoListado } from '@/llm/controles-memoria'
import type { FuenteDescrita } from '@/llm/huella'
import type { Bloque, Hecho, HuellaAceptada, Niveles, PropuestaHuella } from '@/llm/tipos'

// Demo del aprendizaje (#12): "Lo que aprendí de vos" y el botón para cerrar la conversación.
// El botón es solo para la demo: en el producto la conversación se cierra sola por el silencio.
// Consolidar ahora (#34, #37) arma los bloques del dia y la semana de hoy sin esperar el corte, y
// propone la huella aprendida (#38) sin esperar el corte de mes. La familia la acepta o la descarta aca.

type Hechos = { activos: HechoListado[]; vencidos: HechoListado[]; invalidados: HechoListado[] }

type ConFuentes<T> = T & { fuentesDescritas: FuenteDescrita[] }
type Huella = { base: string; propuesta: ConFuentes<PropuestaHuella> | null; aceptada: ConFuentes<HuellaAceptada> | null }

const ORIGEN: Record<Hecho['origen'], string> = {
  deletreo: 'lo deletreaste vos',
  opcion: 'lo elegiste vos',
  fija: 'opción fija',
  interlocutor: 'lo dijo el interlocutor',
  familia: 'lo cargó la familia',
}

// La respuesta cruda de /api/memoria; tira con el error de la ruta si no salio bien.
async function leerMemoria(init?: RequestInit) {
  const r = await fetch('/api/memoria', init)
  const datos = await r.json()
  if (!r.ok) throw new Error(datos.error ?? `HTTP ${r.status}`)
  return datos
}

// "el jueves 12/11, en 2 dias": la fecha del evento, si el hecho la tiene.
function fechaDelEvento(h: Hecho) {
  return h.fechaEvento ? describirFecha(h.fechaEvento, new Date()) : null
}

const ZONA = 'America/Argentina/Buenos_Aires'

type Corte = keyof Niveles

const DIA_MS = 24 * 3_600_000
const LARGO: Record<Corte, number> = { dia: DIA_MS, semana: 7 * DIA_MS, mes: 28 * DIA_MS }
const TITULO: Record<Corte, string> = { dia: 'Dia por dia', semana: 'Semana por semana', mes: 'Mes por mes' }

const diaDe = (ms: number) =>
  new Date(ms).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: ZONA })

// "viernes 6/11", "semana del lunes 2/11 al domingo 8/11", "noviembre de 2026". Si el bloque es de
// Consolidar ahora (no cubre el periodo entero), hasta cuando.
function fechaBloque(corte: Corte, b: Bloque) {
  const desde = Date.parse(b.desde)
  const hasta = Date.parse(b.hasta)
  const parcial = hasta - desde < LARGO[corte]
  if (corte === 'mes') return new Date(desde).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: ZONA })
  if (corte === 'semana') {
    return parcial
      ? `semana del ${diaDe(desde)}, hasta el ${diaDe(hasta)}`
      : `semana del ${diaDe(desde)} al ${diaDe(hasta - 1)}`
  }
  const hora = new Date(hasta).toLocaleTimeString('es-AR', { timeStyle: 'short', timeZone: ZONA })
  return parcial ? `${diaDe(desde)}, hasta las ${hora}` : diaDe(desde)
}

const fuentes = (n: number) => `${n} ${n === 1 ? 'fuente' : 'fuentes'}`

function fecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

export function LoQueAprendi({
  historial,
  cercania,
  alCerrar,
}: {
  historial: LineaHistorial[]
  cercania: Cercania | ''
  alCerrar: () => void
}) {
  const [hechos, setHechos] = useState<Hechos | null>(null)
  const [niveles, setNiveles] = useState<Niveles | null>(null)
  const [huella, setHuella] = useState<Huella | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mostrar = useCallback((datos: Awaited<ReturnType<typeof leerMemoria>>) => {
    setHechos({ activos: datos.activos, vencidos: datos.vencidos, invalidados: datos.invalidados })
    if (datos.niveles) setNiveles(datos.niveles)
    if (datos.huella) setHuella(datos.huella)
  }, [])

  const pedir = useCallback(async (init?: RequestInit) => {
    const datos = await leerMemoria(init)
    mostrar(datos)
    return datos
  }, [mostrar])

  const recargar = useCallback(async () => {
    setError(null)
    try {
      await pedir()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [pedir])

  // Al montar: el estado se toca solo cuando llega la respuesta, nunca sincronico dentro del efecto.
  useEffect(() => {
    let vigente = true
    leerMemoria()
      .then((datos) => { if (vigente) mostrar(datos) })
      .catch((e) => { if (vigente) setError(e instanceof Error ? e.message : String(e)) })
    return () => { vigente = false }
  }, [mostrar])

  async function enviar(accion: string, cuerpo: object) {
    setOcupado(accion)
    setError(null)
    setAviso(null)
    try {
      return await pedir({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setOcupado(null)
    }
  }

  async function cerrar() {
    const inicio = performance.now()
    const antes = hechos?.activos.length ?? 0
    const datos = await enviar('cerrar', { accion: 'cerrar', historial, ...(cercania ? { cercania } : {}) })
    if (!datos) return
    const ms = Math.round(performance.now() - inicio)
    if (!datos.cerrada) {
      setAviso('No había una conversación con líneas para cerrar.')
    } else {
      const nuevos = datos.activos.length - antes
      setAviso(`Conversación cerrada (${datos.lineas} líneas, ${ms} ms, ${datos.proveedor}). Hechos activos: ${antes} → ${datos.activos.length}${nuevos > 0 ? ` (+${nuevos})` : ''}.`)
    }
    alCerrar()
  }

  async function consolidar() {
    const inicio = performance.now()
    const datos = await enviar('consolidar', { accion: 'consolidar' })
    if (!datos) return
    const ms = Math.round(performance.now() - inicio)
    const armado = (nombre: string, b: Bloque | null, modelo: string) =>
      b ? `${nombre}: ${fuentes(b.fuentes.length)} (${modelo})` : `${nombre}: nada para resumir (${modelo})`
    const propuesta = datos.errorHuella
      ? `La huella aprendida fallo (${datos.modelos.huella}): ${datos.errorHuella}`
      : datos.propuesta
        ? `Huella aprendida propuesta (${datos.modelos.huella}).`
        : `Huella aprendida: nada nuevo que proponer (${datos.modelos.huella}).`
    setAviso(
      `Consolidado en ${ms} ms. ${armado('Dia', datos.dia, datos.modelos.dia)}. ${armado('Semana', datos.semana, datos.modelos.semana)}. ${propuesta}`,
    )
  }

  async function decidirHuella(accion: 'aceptar' | 'descartar') {
    const datos = await enviar(accion, { accion })
    if (datos) setAviso(accion === 'aceptar' ? 'Huella aprendida aceptada: ya entra a las opciones.' : 'Propuesta descartada: no se vuelve a proponer igual.')
  }

  // La aceptada para revisar (#40): citaba un hecho que se invalido.
  async function revisarHuella(decision: 'aceptar' | 'descartar') {
    const datos = await enviar('revisar', { accion: 'revisar', decision })
    if (datos) setAviso(decision === 'aceptar' ? 'Huella aprendida aceptada de nuevo: vuelve a entrar a las opciones.' : 'Huella aprendida descartada: no se vuelve a proponer igual.')
  }

  async function invalidar(id: string) {
    const datos = await enviar('invalidar', { accion: 'invalidar', id })
    if (datos) setAviso('Hecho invalidado. Lo que lo citaba se descarta y se rehace en el proximo cierre o con Consolidar ahora.')
  }

  return (
    <section className="space-y-4 rounded border p-4">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-2xl font-bold">Lo que aprendí de vos</h2>
        <button
          className="rounded bg-amber-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          disabled={ocupado !== null}
          onClick={cerrar}
        >
          Cerrar conversación
        </button>
        <button
          className="rounded bg-sky-700 px-4 py-2 font-semibold text-white disabled:opacity-50"
          disabled={ocupado !== null}
          onClick={consolidar}
        >
          Consolidar ahora
        </button>
        <button className="text-sm underline" disabled={ocupado !== null} onClick={recargar}>
          Recargar
        </button>
        {ocupado === 'cerrar' && <span>Aprendiendo…</span>}
        {ocupado === 'consolidar' && <span>Resumiendo el dia y la semana…</span>}
      </div>
      {aviso && <p className="text-sm">{aviso}</p>}
      {error && <p className="rounded bg-red-100 p-3 text-red-800">Error: {error}</p>}

      {huella && (
        <div className="space-y-2">
          <p className="font-semibold">Como sos</p>
          {huella.propuesta && (
            <div className="rounded border-2 border-dashed border-amber-500 p-3">
              <p className="text-sm text-amber-700">
                Propuesta, pendiente de la familia · {fecha(huella.propuesta.fecha)} · todavia no entra a las opciones
              </p>
              <p className="whitespace-pre-line">{huella.propuesta.texto}</p>
              <ListaFuentes fuentes={huella.propuesta.fuentesDescritas} />
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded bg-emerald-700 px-4 py-1 font-semibold text-white disabled:opacity-50"
                  disabled={ocupado !== null}
                  onClick={() => decidirHuella('aceptar')}
                >
                  Aceptar
                </button>
                <button
                  className="rounded border px-4 py-1 hover:bg-gray-100 hover:text-black disabled:opacity-50"
                  disabled={ocupado !== null}
                  onClick={() => decidirHuella('descartar')}
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
          {huella.aceptada && !huella.aceptada.paraRevisar && (
            <div className="rounded border-2 border-emerald-600 p-3">
              <p className="text-sm text-emerald-700">
                <span className="rounded bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">Aprendida</span> · aceptada{' '}
                {fecha(huella.aceptada.fechaAceptacion)}
              </p>
              <p className="whitespace-pre-line">{huella.aceptada.texto}</p>
              <ListaFuentes fuentes={huella.aceptada.fuentesDescritas} />
            </div>
          )}
          {huella.aceptada?.paraRevisar && (
            <div className="rounded border-2 border-dashed border-red-500 p-3">
              <p className="text-sm text-red-700">
                <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Para revisar</span> · cita un
                hecho que se invalido el {fecha(huella.aceptada.paraRevisar)} · no entra a las opciones hasta que la revisen
              </p>
              <p className="whitespace-pre-line">{huella.aceptada.texto}</p>
              <ListaFuentes fuentes={huella.aceptada.fuentesDescritas} />
              <div className="mt-2 flex gap-2">
                <button
                  className="rounded bg-emerald-700 px-4 py-1 font-semibold text-white disabled:opacity-50"
                  disabled={ocupado !== null}
                  onClick={() => revisarHuella('aceptar')}
                >
                  Volver a aceptar
                </button>
                <button
                  className="rounded border px-4 py-1 hover:bg-gray-100 hover:text-black disabled:opacity-50"
                  disabled={ocupado !== null}
                  onClick={() => revisarHuella('descartar')}
                >
                  Descartar
                </button>
              </div>
            </div>
          )}
          <details className="rounded border p-3">
            <summary className="cursor-pointer text-sm text-gray-500">Huella base: la cargo la familia y nunca cambia</summary>
            <pre className="mt-2 whitespace-pre-wrap text-sm">{huella.base}</pre>
          </details>
        </div>
      )}

      {niveles &&
        (['dia', 'semana', 'mes'] as const)
          .filter((corte) => niveles[corte].length > 0)
          .map((corte) => (
            <div key={corte}>
              <p className="font-semibold">{TITULO[corte]}</p>
              <ul className="space-y-2">
                {[...niveles[corte]].reverse().map((b) => (
                  <li key={b.id} className={`rounded border p-3 ${b.descartado ? 'opacity-50' : ''}`}>
                    <p className="text-sm text-gray-500">
                      {fechaBloque(corte, b)} · {fuentes(b.fuentes.length)}
                      {b.descartado ? ' · descartado: citaba algo que ya no vale, se rehace en el proximo cierre' : ''}
                    </p>
                    <p>{b.texto}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}

      {hechos && hechos.activos.length === 0 && hechos.vencidos.length === 0 && (
        <p className="text-sm text-gray-500">Todavía no aprendí nada.</p>
      )}
      {hechos && hechos.activos.length > 0 && (
        <ul className="space-y-2">
          {hechos.activos.map((h) => {
            const evento = fechaDelEvento(h)
            return (
              <li key={h.id} className="flex items-start justify-between gap-4 rounded border p-3">
                <div>
                  <p className="text-lg">{h.texto}</p>
                  <p className="text-sm text-gray-500">
                    {ORIGEN[h.origen]} · interlocutor: {h.interlocutor ?? 'no se sabe'} · {fecha(h.fecha)} · importancia{' '}
                    {h.importancia}
                    {h.saliencia && h.saliencia > 1 ? ` · saliencia x${h.saliencia}` : ''}
                    {h.intimo ? ' · íntimo' : ''}
                  </p>
                  {evento && <p className="text-sm text-amber-700">Evento: {evento}</p>}
                </div>
                <button
                  className="shrink-0 rounded border px-3 py-1 text-sm hover:bg-gray-100 hover:text-black disabled:opacity-50"
                  disabled={ocupado !== null}
                  onClick={() => invalidar(h.id)}
                >
                  Invalidar
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {hechos && hechos.vencidos.length > 0 && (
        <div>
          <p className="text-sm font-semibold">Ya pasó ({hechos.vencidos.length})</p>
          {/* Siguen activos en la memoria: conservan el Invalidar que ya tenían, sin botón nuevo. */}
          <ul className="space-y-1 text-sm text-gray-500">
            {hechos.vencidos.map((h) => {
              const evento = fechaDelEvento(h)
              return (
                <li key={h.id} className="flex items-start justify-between gap-4">
                  <span>
                    {h.texto}
                    {evento ? ` · ${evento}` : ''}
                  </span>
                  <button
                    className="shrink-0 rounded border px-3 py-1 text-sm hover:bg-gray-100 hover:text-black disabled:opacity-50"
                    disabled={ocupado !== null}
                    onClick={() => invalidar(h.id)}
                  >
                    Invalidar
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {hechos && hechos.invalidados.length > 0 && (
        <div>
          <p className="text-sm font-semibold">Ya no vale ({hechos.invalidados.length})</p>
          <ul className="text-sm text-gray-500">
            {hechos.invalidados.map((h) => (
              <li key={h.id}>
                <span className="line-through">{h.texto}</span> · invalidado {fecha(h.fechaInvalidacion)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function ListaFuentes({ fuentes }: { fuentes: FuenteDescrita[] }) {
  if (fuentes.length === 0) return null
  return (
    <details className="mt-1 text-sm text-gray-500">
      <summary className="cursor-pointer">{fuentes.length === 1 ? '1 fuente' : `${fuentes.length} fuentes`}</summary>
      <ul className="ml-4 list-disc">
        {fuentes.map((f) => (
          <li key={f.id}>{f.texto}</li>
        ))}
      </ul>
    </details>
  )
}
