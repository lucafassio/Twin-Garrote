'use client'

import { useEffect } from 'react'
import { bus } from '@/eventos'

// Reemplazo de teclado para el path vision, hasta que exista el eye tracker.
// Emite los mismos eventos que va a emitir vision, asi el nucleo no cambia.
//
// - Mantener O = ojos cerrados. La barra se llena; a los 500 ms emite parpadeoLargo
//   y la eleccion se confirma al soltar. Mantenerla 2 s dispara la urgencia.
// - Espacio (si `espacio`) = parpadeo largo instantaneo: elige lo iluminado sin barra.
//   En /prueba/nucleo el espacio ya lo maneja el Simulador compartido.
export default function SimuladorOjos({ espacio = false }: { espacio?: boolean }) {
  useEffect(() => {
    let inicio = 0
    let intervalo: ReturnType<typeof setInterval> | null = null
    let parpadeoEmitido = false
    const enCampo = (e: KeyboardEvent) => (e.target as HTMLElement).tagName === 'INPUT'

    const bajar = (e: KeyboardEvent) => {
      if (enCampo(e) || e.repeat) return
      if (espacio && e.code === 'Space') {
        e.preventDefault()
        bus.emit('parpadeoLargo', {})
        return
      }
      if (e.code !== 'KeyO') return
      inicio = performance.now()
      parpadeoEmitido = false
      bus.emit('ojos', { cerrados: true, progreso: 0 })
      intervalo = setInterval(() => {
        const progreso = Math.min(1, (performance.now() - inicio) / 500)
        if (!parpadeoEmitido) bus.emit('ojos', { cerrados: true, progreso })
        if (progreso >= 1 && !parpadeoEmitido) {
          parpadeoEmitido = true
          bus.emit('parpadeoLargo', {})
        }
      }, 50)
    }

    const soltar = (e: KeyboardEvent) => {
      if (e.code !== 'KeyO' || !intervalo) return
      clearInterval(intervalo)
      intervalo = null
      bus.emit('ojos', { cerrados: false, progreso: 0 })
    }

    window.addEventListener('keydown', bajar)
    window.addEventListener('keyup', soltar)
    return () => {
      window.removeEventListener('keydown', bajar)
      window.removeEventListener('keyup', soltar)
      if (intervalo) clearInterval(intervalo)
    }
  }, [espacio])

  return null
}
