'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Cercania, LineaHistorial } from '@/eventos'
import { describirFecha } from '@/llm/fechas'
import type { HechoListado } from '@/llm/controles-memoria'
import type { Bloque, Hecho, Niveles } from '@/llm/tipos'

// Demo del aprendizaje (#12): "Lo que aprendí de vos" y el botón para cerrar la conversación.
// El botón es solo para la demo: en el producto la conversación se cierra sola por el silencio.
// Consolidar ahora (#34, #37) arma los bloques del dia y la semana de hoy sin esperar el corte.

type Hechos = { activos: HechoListado[]; vencidos: HechoListado[]; invalidados: HechoListado[] }

const ORIGEN: Record<Hecho['origen'], string> = {
  deletreo: 'lo deletreaste vos',
  opcion: 'lo elegiste vos',
  fija: 'opción fija',
  interlocutor: 'lo dijo el interlocutor',
  familia: 'lo cargó la familia',
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
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pedir = useCallback(async (init?: RequestInit) => {
    const r = await fetch('/api/memoria', init)
    const datos = await r.json()
    if (!r.ok) throw new Error(datos.error ?? `HTTP ${r.status}`)
    setHechos({ activos: datos.activos, vencidos: datos.vencidos, invalidados: datos.invalidados })
    if (datos.niveles) setNiveles(datos.niveles)
    return datos
  }, [])

  const recargar = useCallback(async () => {
    setError(null)
    try {
      await pedir()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [pedir])

  useEffect(() => {
    recargar()
  }, [recargar])

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
    setAviso(
      `Consolidado en ${ms} ms. ${armado('Dia', datos.dia, datos.modelos.dia)}. ${armado('Semana', datos.semana, datos.modelos.semana)}.`,
    )
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
                      {fechaBloque(corte, b)} · {fuentes(b.fuentes.length)}{b.descartado ? ' · descartado' : ''}
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
                  onClick={() => enviar('invalidar', { accion: 'invalidar', id: h.id })}
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
                    onClick={() => enviar('invalidar', { accion: 'invalidar', id: h.id })}
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
