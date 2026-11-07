'use client'

import { useEffect, type ReactNode } from 'react'
import { Deletrear } from '@/deletrear'
import { chipInterlocutor, elementosBarrido, pedidoActual } from '@/nucleo/reductor'
import type { Elemento, ElementoFijo, Estado } from '@/nucleo/tipos'

// Pantalla principal: dibuja el estado del nucleo. No decide nada.
// Fondo oscuro, texto claro de 32 px o mas, iluminado en amarillo (el rojo es de la urgencia).

const FRANJA: { tipo: ElementoFijo; texto: string }[] = [
  { tipo: 'urgencia', texto: 'Urgencia' },
  { tipo: 'si', texto: 'Sí' },
  { tipo: 'no', texto: 'No' },
  { tipo: 'espera', texto: 'Espera' },
  { tipo: 'otra', texto: 'Otra' },
  { tipo: 'deletrear', texto: 'Deletrear' },
  { tipo: 'repetir', texto: 'Repetir' },
]

const AVISO_CUADRANTE = {
  escuchando: 'Escuchando…',
  pensando: 'Pensando…',
  sinConexion: 'Sin conexión',
  opciones: '',
} as const

function mismoElemento(a: Elemento | undefined, b: Elemento) {
  if (!a || a.tipo !== b.tipo) return false
  return a.tipo !== 'opcion' || (b.tipo === 'opcion' && a.indice === b.indice)
}

type CeldaProps = {
  iluminada: boolean
  progreso: number
  elegible: boolean
  base: string
  children: ReactNode
  onClick?: () => void // solo para la sala (Repetir); el usuario elige con el barrido
  zona?: string // zona para la mirada (calibracion y clasificacion)
}

function Celda({ iluminada, progreso, elegible, base, children, onClick, zona }: CeldaProps) {
  return (
    <div
      data-zona={zona}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={[
        onClick ? 'cursor-pointer' : '',
        'relative flex min-h-0 items-center justify-center overflow-hidden rounded-2xl p-[1.5vh] text-center',
        base,
        iluminada ? 'outline outline-[10px] -outline-offset-[10px] outline-yellow-300' : 'border-2 border-zinc-700',
        elegible ? '' : 'opacity-40',
      ].join(' ')}
    >
      {iluminada && progreso > 0 && (
        <div className="absolute inset-y-0 left-0 bg-yellow-300/40" style={{ width: `${progreso * 100}%` }} />
      )}
      <span className="relative">{children}</span>
    </div>
  )
}

// Chip "¿Habla Laura?" (#48): lo toca el interlocutor con mouse o dedo. No entra al barrido ni le
// cuesta parpadeos al usuario; ignorarlo no cambia nada. Confirmado, queda a la vista para deshacerlo.
type ChipProps = {
  estado: Estado
  onConfirmar: (nombre: string) => void
  onDescartar: (nombre: string) => void
}

function ChipInterlocutor({ estado, onConfirmar, onDescartar }: ChipProps) {
  const chip = chipInterlocutor(estado)
  if (!chip) return null
  const boton = 'min-h-14 rounded-xl px-5 text-2xl font-bold'
  if (chip.confirmado) {
    return (
      <div className="flex shrink-0 items-center gap-3 rounded-2xl border-2 border-sky-400 bg-sky-950 py-2 pl-5 pr-2 text-3xl text-sky-100">
        <span>Habla {chip.nombre}</span>
        <button type="button" onClick={() => onDescartar(chip.nombre)} className={`${boton} bg-zinc-800 text-zinc-100`}>
          No soy
        </button>
      </div>
    )
  }
  return (
    <div className="flex shrink-0 items-center gap-3 rounded-2xl border-2 border-sky-400 bg-sky-950 py-2 pl-5 pr-2 text-3xl text-white">
      <span>¿Habla {chip.nombre}?</span>
      <button type="button" onClick={() => onConfirmar(chip.nombre)} className={`${boton} bg-sky-300 text-zinc-950`}>
        Sí, soy yo
      </button>
      <button type="button" onClick={() => onDescartar(chip.nombre)} className={`${boton} bg-zinc-800 text-zinc-100`}>
        No
      </button>
    </div>
  )
}

type Props = {
  estado: Estado
  onCortarUrgencia: () => void
  onRepetir: () => void
  onTerminarDeletreo: (texto: string) => void
  onCancelarDeletreo: () => void
  // Chip del interlocutor: sin estos, no se muestra.
  onConfirmarInterlocutor?: (nombre: string) => void
  onDescartarInterlocutor?: (nombre: string) => void
  velocidadMs?: number // la del barrido del nucleo, para que Deletrear vaya al mismo ritmo
  operador?: ReactNode // herramientas de quien opera la demo (CampoTurno, debug), debajo de la franja
}

export default function Pantalla({
  estado,
  onCortarUrgencia,
  onRepetir,
  onTerminarDeletreo,
  onCancelarDeletreo,
  onConfirmarInterlocutor,
  onDescartarInterlocutor,
  velocidadMs,
  operador,
}: Props) {
  const elementos = elementosBarrido(estado)
  const iluminado = estado.pausado ? undefined : elementos[estado.iluminado]
  const progreso = estado.ojosCerrados ? estado.progreso : 0
  const esElegible = (el: Elemento) => elementos.some((x) => mismoElemento(x, el))

  // El cuidador corta la urgencia con Escape (o con click en la pantalla roja).
  useEffect(() => {
    if (!estado.urgencia) return
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCortarUrgencia()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [estado.urgencia, onCortarUrgencia])

  if (estado.urgencia) {
    return (
      <button
        type="button"
        onClick={onCortarUrgencia}
        className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-red-700 text-white"
      >
        <span className="text-8xl font-black">NECESITO AYUDA</span>
        {/* Unico elemento del barrido en urgencia: el usuario la corta con dos parpadeos largos */}
        <span className="rounded-2xl bg-zinc-900 px-12 py-6 text-5xl outline outline-[10px] -outline-offset-[10px] outline-yellow-300">
          {estado.urgenciaPaso === 'aviso' ? 'Fue sin querer' : '¿Seguro? Fue sin querer'}
        </span>
        <span className="text-3xl">Escape o click para cortar</span>
      </button>
    )
  }

  // Deletrear a pantalla completa. Se desmonta durante la urgencia (arriba): si siguiera montado,
  // los parpadeos de "Fue sin querer" le elegirian letras. El borrador lo guarda deletrear.
  if (estado.deletreando) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-zinc-950 text-zinc-50">
        <div className="min-h-0 flex-1">
          <Deletrear
            pedido={pedidoActual(estado)}
            onTerminar={onTerminarDeletreo}
            onCancelar={onCancelarDeletreo}
            velocidadMs={velocidadMs}
          />
        </div>
        {operador && <div className="max-h-[35vh] shrink-0 overflow-y-auto px-4 pb-4">{operador}</div>}
      </div>
    )
  }

  // Arriba: lo que va diciendo (parcial), lo que se esta decidiendo si es un turno
  // (acumulado), o el ultimo turno aceptado.
  const enCurso = estado.parcial ?? estado.acumulado
  const textoArriba = enCurso ?? estado.turnoMostrado

  return (
    // Todo entra en la pantalla, sin scroll: el centro se achica y el texto escala con el alto.
    <div className="flex h-screen flex-col gap-4 overflow-hidden bg-zinc-950 p-4 text-zinc-50">
      {/* Arriba: lo que dijo (o va diciendo) el interlocutor */}
      <header className="flex max-h-[22vh] min-h-[10vh] shrink-0 items-center justify-between gap-6 overflow-hidden rounded-2xl bg-zinc-900 px-8 py-[1vh]">
        <div className="flex min-w-0 flex-col gap-1">
          <p className={`line-clamp-3 text-[clamp(1.5rem,5vh,3rem)] leading-tight ${enCurso ? 'text-zinc-400 italic' : ''}`}>
            {textoArriba ?? <span className="text-zinc-500">Esperando que alguien hable…</span>}
          </p>
          {estado.descartado && !enCurso && (
            <p className="truncate text-[clamp(1rem,2.5vh,1.5rem)] text-zinc-500">No parecía para vos: «{estado.descartado}»</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-6">
          {onConfirmarInterlocutor && onDescartarInterlocutor && (
            <ChipInterlocutor estado={estado} onConfirmar={onConfirmarInterlocutor} onDescartar={onDescartarInterlocutor} />
          )}
          {estado.hablando || estado.esperandoHabla ? (
            <span className="shrink-0 text-3xl text-sky-300">Hablando…</span>
          ) : (
            estado.escuchando && <span className="shrink-0 text-3xl text-emerald-300">● Escuchando</span>
          )}
        </div>
      </header>

      {estado.pausado && (
        <div className="shrink-0 rounded-2xl bg-sky-900 px-8 py-2 text-center text-[clamp(1.25rem,3.5vh,2.25rem)]">
          Barrido en pausa · parpadeá para seguir
        </div>
      )}

      {/* Centro: 4 cuadrantes con las opciones */}
      <main className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-4 text-[clamp(1.5rem,5vh,3rem)] leading-tight">
        {[0, 1, 2, 3].map((indice) => {
          const opcion = estado.conversacion === 'opciones' ? estado.opciones[indice] : undefined
          const el: Elemento = { tipo: 'opcion', indice }
          return (
            <Celda
              key={indice}
              zona={`opcion${indice}`}
              iluminada={mismoElemento(iluminado, el)}
              progreso={progreso}
              elegible
              base={opcion ? 'bg-zinc-800' : 'bg-zinc-900 text-zinc-500'}
            >
              {opcion ? opcion.texto : indice === 0 ? AVISO_CUADRANTE[estado.conversacion] : ''}
            </Celda>
          )
        })}
      </main>

      {/* Abajo: franja fija, siempre visible */}
      <footer data-zona="franja" className="grid h-[14vh] shrink-0 grid-cols-7 gap-4 text-[clamp(1rem,4vh,2.25rem)] font-bold">
        {FRANJA.map(({ tipo, texto }) => {
          const el: Elemento = { tipo }
          return (
            <Celda
              key={tipo}
              iluminada={mismoElemento(iluminado, el)}
              progreso={progreso}
              elegible={esElegible(el)}
              base={tipo === 'urgencia' ? 'bg-red-700' : 'bg-zinc-800'}
              onClick={tipo === 'repetir' ? onRepetir : undefined}
            >
              {texto}
            </Celda>
          )
        })}
      </footer>

      {operador && <div className="max-h-[35vh] shrink-0 overflow-y-auto">{operador}</div>}
    </div>
  )
}
