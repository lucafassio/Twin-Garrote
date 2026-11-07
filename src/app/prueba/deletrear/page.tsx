'use client'

import { useEffect, useMemo, useState } from 'react'
import { bus, type LineaHistorial, type PedidoOpciones } from '@/eventos'
import Simulador from '@/dev/Simulador'
import SimuladorOjos from '@/interfaz/SimuladorOjos'
import { Deletrear } from '@/deletrear'

// Pagina de prueba del path deletrear. Solo la toca ese path.
// Espacio = parpadeo largo al instante. Mantener O = ojos cerrados (500 ms elige, 2 s seria urgencia).
// El turno del simulador actualiza el pedido sin salir de deletrear.
export default function Prueba() {
  const [historial, setHistorial] = useState<LineaHistorial[]>([])
  const [ultimoTurno, setUltimoTurno] = useState<string | null>('¿Cómo estás, Roberto? ¿Necesitás algo?')
  const [montado, setMontado] = useState(true)
  const [inicio, setInicio] = useState(() => Date.now())
  const [registro, setRegistro] = useState<string[]>([])

  useEffect(
    () =>
      bus.on('turno', ({ texto }) => {
        setUltimoTurno(texto)
        setHistorial((h) => [...h, { quien: 'interlocutor', texto }])
      }),
    [],
  )

  const pedido: PedidoOpciones = useMemo(() => ({ historial, ultimoTurno, yaMostradas: [] }), [historial, ultimoTurno])

  const terminar = (texto: string) => {
    const segundos = ((Date.now() - inicio) / 1000).toFixed(1)
    bus.emit('decir', { texto })
    setHistorial((h) => [...h, { quien: 'usuario', texto, origen: 'deletreo' }])
    setUltimoTurno(null)
    setRegistro((r) => [`${segundos} s: ${texto}`, ...r])
    setInicio(Date.now())
  }

  return (
    <main className="flex h-screen flex-col bg-zinc-950">
      <header className="flex items-center justify-between px-4 pt-2 text-zinc-300">
        <h1 className="text-2xl font-bold">Prueba: DELETREAR</h1>
        <div className="flex gap-4 text-lg">
          {registro.slice(0, 3).map((r, i) => (
            <span key={i}>{r}</span>
          ))}
          {!montado && (
            <button
              className="rounded bg-zinc-800 px-3"
              onClick={() => {
                setMontado(true)
                setInicio(Date.now())
              }}
            >
              Volver a deletrear
            </button>
          )}
        </div>
      </header>
      <div className="flex-1">
        {montado ? (
          <Deletrear pedido={pedido} onTerminar={terminar} onCancelar={() => setMontado(false)} />
        ) : (
          <p className="p-8 text-3xl text-zinc-400">Salió de deletrear (el borrador quedó guardado).</p>
        )}
      </div>
      <Simulador />
      <SimuladorOjos />
    </main>
  )
}
