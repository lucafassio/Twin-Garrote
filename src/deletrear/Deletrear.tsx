'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { bus, type PedidoOpciones } from '@/eventos'
import {
  agregarLetra,
  armarFilas,
  avanzar,
  BARRIDO_INICIAL,
  borrarLetra,
  borrarPalabra,
  elegir,
  fragmento,
  iluminado,
  ponerPalabra,
  type Accion,
  type Barrido,
  type Fila,
  type IdFila,
  type Item,
} from './barrido.ts'
import { buscar, clave, type Diccionario } from './diccionario.ts'
import { cargarDiccionario, palabrasCercanas, pedirPrediccion } from './prediccion.ts'

export const VELOCIDAD_DELETREO_MS = 1200 // igual que el barrido del nucleo
export const ESPERA_PREDICCION_MS = 400 // despues de la ultima letra
const GESTO_URGENCIA_MS = 2000 // con los ojos cerrados tanto tiempo es urgencia: no se elige nada

type Props = {
  pedido: PedidoOpciones // el del turno actual; si llega un turno nuevo, se actualiza sin salir
  onTerminar: (texto: string) => void // el nucleo lo dice y lo agrega al historial como deletreo
  onCancelar: () => void
  velocidadMs?: number
}

// Lo escrito sobrevive a salir y volver a entrar.
let borrador = ''

// Deletreo: el usuario escribe una pista y elige entre frases y palabras predichas,
// o escribe la frase entera letra por letra. Maneja su propio barrido mientras esta montado.
export default function Deletrear({ pedido, onTerminar, onCancelar, velocidadMs = VELOCIDAD_DELETREO_MS }: Props) {
  const [texto, setTexto] = useState(borrador)
  const [barrido, setBarrido] = useState<Barrido>(BARRIDO_INICIAL)
  const [dic, setDic] = useState<Diccionario | null>(null)
  const [ojosCerrados, setOjosCerrados] = useState(false)
  const [progreso, setProgreso] = useState(0)
  // Lo que llego del LLM para un texto dado, y lo que se muestra (congelado mientras esta iluminado).
  const [llm, setLlm] = useState<{ escrito: string; frases: string[]; palabras: string[] }>({ escrito: '', frases: [], palabras: [] })
  const [mostradas, setMostradas] = useState<{ frases: string[]; palabras: string[] }>({ frases: [], palabras: [] })

  useEffect(() => {
    cargarDiccionario().then(setDic)
  }, [])

  // Por contenido: si el padre arma un pedido nuevo en cada render, no se repiten los pedidos al LLM.
  const pedidoClave = JSON.stringify(pedido)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cercanas = useMemo(() => palabrasCercanas(pedido), [pedidoClave])
  const locales = useMemo(() => (dic ? buscar(dic, fragmento(texto), cercanas) : []), [dic, texto, cercanas])

  // Candidatas: las del LLM primero (si son para este texto), despues las del diccionario.
  const candidatas = useMemo(() => {
    const delLlm = llm.escrito === texto ? llm : { frases: [], palabras: [] }
    const vistas = new Set<string>()
    const palabras = [...delLlm.palabras, ...locales]
      .filter((p) => !vistas.has(clave(p)) && vistas.add(clave(p)))
      .slice(0, 4)
    return { frases: delLlm.frases, palabras }
  }, [llm, texto, locales])

  const filas: Fila[] = useMemo(
    () => armarFilas(mostradas.frases, mostradas.palabras, texto.trim() !== ''),
    [mostradas, texto],
  )
  const luz = iluminado(barrido, filas)

  // Las sugerencias no cambian mientras su fila esta iluminada o abierta: se elegiria la que no era.
  const congeladas = luz.fila === 'frases' || luz.fila === 'palabras'
  // Se ajusta durante el render (patron de React para estado derivado), sin efecto en cascada.
  if (!congeladas && JSON.stringify(candidatas) !== JSON.stringify(mostradas)) setMostradas(candidatas)

  // Pedidos al LLM: frases y palabras en paralelo, 400 ms despues de la ultima letra.
  useEffect(() => {
    const control = new AbortController()
    const espera = setTimeout(async () => {
      const [frases, palabras] = await Promise.all([
        pedirPrediccion('frases', texto, pedido, control.signal),
        pedirPrediccion('palabras', texto, pedido, control.signal),
      ])
      if (!control.signal.aborted) setLlm({ escrito: texto, frases, palabras })
    }, ESPERA_PREDICCION_MS)
    return () => {
      clearTimeout(espera)
      control.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, pedidoClave])

  // Refs para los manejadores del bus, que no se re-suscriben en cada render.
  const actual = useRef({ barrido, filas, texto, locales })
  const callbacks = useRef({ onTerminar, onCancelar })
  useLayoutEffect(() => {
    actual.current = { barrido, filas, texto, locales }
    callbacks.current = { onTerminar, onCancelar }
  })

  // Avance del barrido: se reinicia con cada cambio y se congela con los ojos cerrados.
  useEffect(() => {
    if (ojosCerrados || barrido.pausado) return
    const paso = setTimeout(() => setBarrido((b) => avanzar(b, actual.current.filas)), velocidadMs)
    return () => clearTimeout(paso)
  }, [barrido, ojosCerrados, velocidadMs])

  useEffect(() => {
    const escribir = (nuevo: string) => {
      borrador = nuevo
      setTexto(nuevo)
      // Lo viejo deja de valer ya: frases vacias hasta que llegue el LLM, palabras del diccionario.
      setMostradas({ frases: [], palabras: [] })
    }
    const terminar = (dicho: string) => {
      borrador = ''
      callbacks.current.onTerminar(dicho)
    }
    const accion = (a: Accion, t: string) => {
      if (a === 'decir' && t.trim()) terminar(t.trim())
      else if (a === 'borrarLetra') escribir(borrarLetra(t))
      else if (a === 'borrarPalabra') escribir(borrarPalabra(t))
      else if (a === 'salir') {
        borrador = t
        callbacks.current.onCancelar()
      }
    }
    const aplicar = (item: Item | null) => {
      const t = actual.current.texto
      if (!item) return
      if (item.tipo === 'frase') terminar(item.texto)
      else if (item.tipo === 'palabra') escribir(ponerPalabra(t, item.texto))
      else if (item.tipo === 'letra') escribir(agregarLetra(t, item.letra))
      else accion(item.accion, t)
    }
    const alElegir = () => {
      const { barrido: b, filas: f } = actual.current
      const r = elegir(b, f)
      setBarrido(r.barrido)
      aplicar(r.item)
    }

    // El parpadeo largo llega con los ojos todavia cerrados: se confirma al abrirlos.
    // La barra espaciadora del simulador lo manda sin ojos: se elige al instante.
    let cerradosDesde: number | null = null
    let pendiente = false
    const offOjos = bus.on('ojos', ({ cerrados, progreso, perdido }) => {
      setProgreso(cerrados ? progreso : 0)
      if (cerrados) {
        cerradosDesde ??= performance.now()
        setOjosCerrados(true)
        return
      }
      const duracion = cerradosDesde === null ? 0 : performance.now() - cerradosDesde
      if (pendiente && !perdido && duracion < GESTO_URGENCIA_MS) alElegir()
      pendiente = false
      cerradosDesde = null
      setOjosCerrados(false)
    })
    const offParpadeo = bus.on('parpadeoLargo', () => {
      if (cerradosDesde !== null) pendiente = true
      else alElegir()
    })
    return () => {
      offOjos()
      offParpadeo()
    }
  }, [])

  // Todo entra en la pantalla, sin scroll: las filas se reparten el alto y el texto escala con el alto.
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-zinc-950 p-3 text-zinc-50">
      {pedido.ultimoTurno && (
        <p className="shrink-0 truncate text-[clamp(1rem,3vh,1.875rem)] text-zinc-400">
          Te dijeron: <span className="text-zinc-100">«{pedido.ultimoTurno}»</span>
        </p>
      )}
      {/* Si el texto no entra, se ve el final (lo ultimo escrito) */}
      <div className="flex max-h-[18vh] min-h-[8vh] shrink-0 flex-col justify-end overflow-hidden rounded-2xl bg-zinc-900 px-8 py-[1vh] text-[clamp(1.5rem,5.5vh,3.75rem)] leading-tight">
        <p>
          {texto ? (
            <span className="whitespace-pre-wrap">{texto}</span>
          ) : (
            <span className="text-[0.6em] text-zinc-500">Escribí una pista: el comienzo o la palabra importante</span>
          )}
          <span className="animate-pulse text-yellow-300">|</span>
        </p>
      </div>
      {barrido.pausado && (
        <p className="shrink-0 rounded-2xl bg-sky-900 px-8 py-2 text-center text-[clamp(1rem,3vh,1.875rem)]">
          Barrido en pausa: parpadeo largo para seguir
        </p>
      )}
      <div className="flex min-h-0 flex-1 flex-col gap-[0.8vh]">
        {filas.map((fila) => (
          <FilaVista
            key={fila.id}
            fila={fila}
            filaIluminada={luz.fila === fila.id && luz.item === null && !barrido.pausado}
            itemIluminado={luz.fila === fila.id && !barrido.pausado ? luz.item : null}
            progreso={progreso}
          />
        ))}
      </div>
    </div>
  )
}

const NOMBRE_FILA: Partial<Record<IdFila, string>> = { frases: 'Frases', palabras: 'Palabras', acciones: 'Acciones' }
const NOMBRE_ACCION: Record<Accion, string> = {
  decir: 'Decir',
  borrarLetra: 'Borrar letra',
  borrarPalabra: 'Borrar palabra',
  salir: 'Salir',
}

function textoItem(item: Item): string {
  if (item.tipo === 'letra') return item.letra === ' ' ? 'espacio' : item.letra.toUpperCase()
  if (item.tipo === 'accion') return NOMBRE_ACCION[item.accion]
  return item.texto
}

const LUZ = 'outline outline-[8px] -outline-offset-[8px] outline-yellow-300'

function FilaVista({
  fila,
  filaIluminada,
  itemIluminado,
  progreso,
}: {
  fila: Fila
  filaIluminada: boolean
  itemIluminado: number | null
  progreso: number
}) {
  const esFrase = fila.id === 'frases'
  return (
    // Frases ocupa el doble de alto: son dos renglones de dos frases.
    <div
      className={[
        'flex min-h-0 items-stretch gap-3 rounded-2xl p-1',
        esFrase ? 'flex-[2]' : 'flex-1',
        filaIluminada ? LUZ : '',
      ].join(' ')}
    >
      {NOMBRE_FILA[fila.id] && (
        <span className="flex w-40 shrink-0 items-center text-[clamp(0.875rem,2.5vh,1.5rem)] text-zinc-400">
          {NOMBRE_FILA[fila.id]}
        </span>
      )}
      <div
        className={['grid min-h-0 flex-1 gap-2', esFrase ? 'grid-cols-2 grid-rows-2' : 'grid-flow-col auto-cols-fr'].join(' ')}
      >
        {fila.items.map((item, i) => {
          const luz = itemIluminado === i
          return (
            <div
              key={i}
              className={[
                'relative flex min-h-0 items-center justify-center overflow-hidden rounded-xl px-3 text-center leading-tight',
                esFrase ? 'text-[clamp(0.875rem,2.6vh,1.875rem)]' : 'text-[clamp(1rem,4.5vh,2.25rem)] font-bold',
                item.tipo === 'accion' ? 'bg-zinc-800 text-sky-200' : 'bg-zinc-900',
                luz ? LUZ : 'border-2 border-zinc-700',
              ].join(' ')}
            >
              {luz && progreso > 0 && (
                <div className="absolute inset-y-0 left-0 bg-yellow-300/40" style={{ width: `${progreso * 100}%` }} />
              )}
              <span className="relative line-clamp-2">{textoItem(item)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
