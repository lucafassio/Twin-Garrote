'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { pedirOpciones } from '@/llm/cliente'
import { crearNucleo } from '@/nucleo/motor'

// Crea el nucleo una sola vez, lo prende al montar y lo apaga al desmontar.
// En modo estricto React monta dos veces: detener() + iniciar() lo soporta.
export function useNucleo() {
  const [nucleo] = useState(() => crearNucleo({ pedirOpciones }))
  useEffect(() => {
    nucleo.iniciar()
    return () => nucleo.detener()
  }, [nucleo])
  const estado = useSyncExternalStore(nucleo.suscribir, nucleo.obtener, nucleo.obtener)
  return { nucleo, estado }
}
