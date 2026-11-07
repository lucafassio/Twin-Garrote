'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { pedirOpciones } from '@/llm/cliente'
import { leerTurnoRemoto } from '@/nucleo/lecturaCliente'
import { crearNucleo } from '@/nucleo/motor'

// Crea el nucleo una sola vez, lo prende al montar y lo apaga al desmontar.
// En modo estricto React monta dos veces: detener() + iniciar() lo soporta.
// La lectura del turno usa el modelo de decision (/api/lectura) y, si falla o tarda, la heuristica local.
export function useNucleo() {
  const [nucleo] = useState(() => crearNucleo({ pedirOpciones, leerTurno: leerTurnoRemoto }))
  useEffect(() => {
    nucleo.iniciar()
    return () => nucleo.detener()
  }, [nucleo])
  const estado = useSyncExternalStore(nucleo.suscribir, nucleo.obtener, nucleo.obtener)
  return { nucleo, estado }
}
