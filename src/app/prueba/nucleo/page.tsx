'use client'

import Simulador from '@/dev/Simulador'
import DebugNucleo from '@/interfaz/DebugNucleo'
import Pantalla from '@/interfaz/Pantalla'
import { useNucleo } from '@/interfaz/useNucleo'
import SimuladorOjos from './SimuladorOjos'

// Pagina de prueba del path nucleo. Solo la toca ese path.
// Espacio = parpadeo largo directo. Mantener O = ojos cerrados (congela, 2 s = urgencia).
// Escape = cortar urgencia. + / - = velocidad del barrido.
export default function Prueba() {
  const { nucleo, estado } = useNucleo()
  return (
    <>
      <Pantalla estado={estado} onCortarUrgencia={nucleo.cortarUrgencia} />
      <Simulador />
      <SimuladorOjos />
      <DebugNucleo nucleo={nucleo} estado={estado} />
    </>
  )
}
