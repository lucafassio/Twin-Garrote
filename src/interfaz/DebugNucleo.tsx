'use client'

import { useEffect, useState } from 'react'
import type { Nucleo } from '@/nucleo/motor'
import type { Estado } from '@/nucleo/tipos'

// Panel chico para la demo: velocidad del barrido (teclas + y -) y estado del nucleo.
type Props = { nucleo: Nucleo; estado: Estado; flotante?: boolean }

export default function DebugNucleo({ nucleo, estado, flotante = true }: Props) {
  const [velocidad, setVelocidad] = useState(() => nucleo.velocidad())

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.key === '+' || e.key === '=') nucleo.setVelocidad(nucleo.velocidad() - 100)
      else if (e.key === '-') nucleo.setVelocidad(nucleo.velocidad() + 100)
      else return
      setVelocidad(nucleo.velocidad())
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [nucleo])

  return (
    <div
      className={`${flotante ? 'fixed right-2 bottom-2 z-50' : 'ml-auto'} w-72 rounded border border-sky-500 bg-black/90 p-2 font-mono text-xs text-sky-200`}
    >
      <div className="font-bold">Nucleo (+ / - velocidad)</div>
      <div>barrido: {velocidad} ms por elemento</div>
      <div>conversacion: {estado.conversacion}</div>
      <div>
        iluminado: {estado.iluminado} · vueltas: {estado.vueltas}
        {estado.pausado ? ' · PAUSA' : ''}
      </div>
      <div>
        ojos: {estado.ojosCerrados ? `cerrados ${Math.round(estado.progreso * 100)}%` : 'abiertos'}
        {estado.eleccionPendiente ? ` · pendiente: ${estado.eleccionPendiente.tipo}` : ''}
      </div>
      <div>historial: {estado.historial.length} lineas</div>
      <div>
        lectura:{' '}
        {estado.ultimaLectura
          ? `para ${estado.ultimaLectura.paraUsuario.toFixed(2)} · completo ${estado.ultimaLectura.completo.toFixed(2)} · ${estado.ultimaLectura.tipo}`
          : '-'}
        {estado.tipoTurno ? ` · turno ${estado.tipoTurno}` : ''}
      </div>
    </div>
  )
}
