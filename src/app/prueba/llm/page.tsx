'use client'

import Simulador from '@/dev/Simulador'

// Pagina de prueba del path llm. Solo la toca ese path.
export default function Prueba() {
  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold">Prueba: LLM</h1>
      <Simulador />
    </main>
  )
}
