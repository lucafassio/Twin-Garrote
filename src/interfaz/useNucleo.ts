'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { pedirOpcionesConInterlocutor, registrarEleccion } from '@/llm/cliente'
import { leerTurnoRemoto } from '@/nucleo/lecturaCliente'
import { crearNucleo } from '@/nucleo/motor'

// Crea el nucleo una sola vez, lo prende al montar y lo apaga al desmontar.
// En modo estricto React monta dos veces: detener() + iniciar() lo soporta.
// Las opciones traen el interlocutor probable para el chip "¿Habla Laura?".
// Cada eleccion se registra en /api/elecciones (resumen en /prueba/llm).
// La lectura del turno usa el modelo de decision (/api/lectura) y, si falla o tarda, la heuristica local.
export function useNucleo() {
  const [nucleo] = useState(() => crearNucleo({ pedirOpciones: pedirOpcionesConInterlocutor, leerTurno: leerTurnoRemoto, registrarEleccion }))
  useEffect(() => {
    nucleo.iniciar()
    return () => nucleo.detener()
  }, [nucleo])
  const estado = useSyncExternalStore(nucleo.suscribir, nucleo.obtener, nucleo.obtener)
  return { nucleo, estado }
}
