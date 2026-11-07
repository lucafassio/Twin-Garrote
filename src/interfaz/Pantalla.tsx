'use client'

import { useEffect, type ReactNode } from 'react'
import { Deletrear } from '@/deletrear'
import { elementosBarrido, pedidoActual } from '@/nucleo/reductor'
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
}

function Celda({ iluminada, progreso, elegible, base, children, onClick }: CeldaProps) {
  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      className={[
        onClick ? 'cursor-pointer' : '',
        'relative flex items-center justify-center overflow-hidden rounded-2xl p-6 text-center',
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

type Props = {
  estado: Estado
  onCortarUrgencia: () => void
  onRepetir: () => void
  onTerminarDeletreo: (texto: string) => void
  onCancelarDeletreo: () => void
  velocidadMs?: number // la del barrido del nucleo, para que Deletrear vaya al mismo ritmo
  operador?: ReactNode // herramientas de quien opera la demo (CampoTurno, debug), debajo de la franja
}

export default function Pantalla({
  estado,
  onCortarUrgencia,
  onRepetir,
  onTerminarDeletreo,
  onCancelarDeletreo,
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
      <div className="flex h-screen flex-col bg-zinc-950 text-zinc-50">
        <div className="min-h-0 flex-1">
          <Deletrear
            pedido={pedidoActual(estado)}
            onTerminar={onTerminarDeletreo}
            onCancelar={onCancelarDeletreo}
            velocidadMs={velocidadMs}
          />
        </div>
        {operador && <div className="px-4 pb-4">{operador}</div>}
      </div>
    )
  }

  // Arriba: lo que va diciendo (parcial), lo que se esta decidiendo si es un turno
  // (acumulado), o el ultimo turno aceptado.
  const enCurso = estado.parcial ?? estado.acumulado
  const textoArriba = enCurso ?? estado.turnoMostrado

  return (
    <div className="flex h-screen flex-col gap-4 bg-zinc-950 p-4 text-zinc-50">
      {/* Arriba: lo que dijo (o va diciendo) el interlocutor */}
      <header className="flex min-h-28 items-center justify-between gap-6 rounded-2xl bg-zinc-900 px-8 py-4">
        <div className="flex flex-col gap-1">
          <p className={`text-5xl leading-tight ${enCurso ? 'text-zinc-400 italic' : ''}`}>
            {textoArriba ?? <span className="text-zinc-500">Esperando que alguien hable…</span>}
          </p>
          {estado.descartado && !enCurso && (
            <p className="text-2xl text-zinc-500">No parecía para vos: «{estado.descartado}»</p>
          )}
        </div>
        {estado.hablando || estado.esperandoHabla ? (
          <span className="shrink-0 text-3xl text-sky-300">Hablando…</span>
        ) : (
          estado.escuchando && <span className="shrink-0 text-3xl text-emerald-300">● Escuchando</span>
        )}
      </header>

      {estado.pausado && (
        <div className="rounded-2xl bg-sky-900 px-8 py-3 text-center text-4xl">
          Barrido en pausa · parpadeá para seguir
        </div>
      )}

      {/* Centro: 4 cuadrantes con las opciones */}
      <main className="grid flex-1 grid-cols-2 grid-rows-2 gap-4 text-5xl leading-tight">
        {[0, 1, 2, 3].map((indice) => {
          const opcion = estado.conversacion === 'opciones' ? estado.opciones[indice] : undefined
          const el: Elemento = { tipo: 'opcion', indice }
          return (
            <Celda
              key={indice}
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
      <footer className="grid h-36 grid-cols-7 gap-4 text-4xl font-bold">
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

      {operador}
    </div>
  )
}
