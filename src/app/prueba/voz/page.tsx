'use client'

import Simulador from '@/dev/Simulador'

// Pagina de prueba del path voz. Solo la toca ese path.
export default function Prueba() {
  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold">Prueba: VOZ</h1>
      <Simulador />
    </main>
  )
}
