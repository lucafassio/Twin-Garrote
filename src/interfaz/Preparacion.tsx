'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { bus } from '@/eventos'
import { crearEstabilizadorMirada } from '@/nucleo/estabilizadorMirada'
import { calibrar, calibrarZonas, observarVision, setUmbral } from '@/vision'
import { difiereEncuadre, type CalibracionGuardada } from './calibracionGuardada'
import { evaluarEncuadre, type Encuadre, type Evaluacion } from './encuadre'
import ObjetivoMirada from './ObjetivoMirada'
import type { EstadoCamara } from './useCamara'

// Preparacion antes de conversar, guiada para quien acompana al usuario:
// 1. camara bien encuadrada, 2. parpadeo largo (linea base + prueba), 3. mirada por zonas
// (calibracion sobre la pantalla real + prueba con 5 objetivos).

export const ZONAS_MIRADA = ['opcion0', 'opcion1', 'opcion2', 'opcion3', 'franja']

function Marco({ paso, titulo, children }: { paso: number; titulo: string; children: ReactNode }) {
  return (
    <main className="flex h-screen flex-col items-center gap-6 bg-zinc-950 px-8 py-8 text-zinc-50">
      <div className="flex items-center gap-4 text-2xl text-zinc-400">
        {[1, 2, 3].map((n) => (
          <span key={n} className={n === paso ? 'font-bold text-amber-300' : n < paso ? 'text-emerald-400' : ''}>
            {n < paso ? '✓' : n} {['Cámara', 'Parpadeo', 'Mirada'][n - 1]}
          </span>
        ))}
      </div>
      <h1 className="text-5xl font-black">{titulo}</h1>
      {children}
    </main>
  )
}

function Boton({ onClick, children, secundario, disabled }: { onClick: () => void; children: ReactNode; secundario?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        secundario
          ? 'rounded-xl px-6 py-3 text-2xl text-zinc-400 underline disabled:opacity-40'
          : 'rounded-2xl bg-amber-300 px-12 py-5 text-4xl font-bold text-zinc-950 disabled:opacity-30'
      }
    >
      {children}
    </button>
  )
}

// ---------- 1. Camara ----------

export function PasoCamara({
  camara,
  guardada,
  onListo,
  onUsarGuardada,
  onSaltear,
}: {
  camara: { estado: EstadoCamara; error: string; reintentar: () => void }
  guardada: CalibracionGuardada | null // ultima calibracion de este navegador, si hay
  onListo: (encuadre: Encuadre | null) => void // seguir calibrando
  onUsarGuardada: () => void // saltear la calibracion y usar la guardada
  onSaltear: () => void
}) {
  const [evaluacion, setEvaluacion] = useState<Evaluacion | null>(null)
  const [estableDesde, setEstableDesde] = useState<number | null>(null)
  const [ahora, setAhora] = useState(0)

  // Ultimo segundo de encuadres, evaluado 5 veces por segundo.
  useEffect(() => {
    const muestras: (Encuadre | null)[] = []
    const dejar = observarVision((l) => {
      muestras.push(l.encuadre ?? null)
      if (muestras.length > 30) muestras.shift()
    })
    const reloj = setInterval(() => {
      if (!muestras.length) return
      const e = evaluarEncuadre(muestras)
      const t = performance.now()
      setEvaluacion(e)
      setAhora(t)
      setEstableDesde((d) => (e.listo ? (d ?? t) : null))
    }, 200)
    return () => {
      dejar()
      clearInterval(reloj)
    }
  }, [])

  const firme = estableDesde !== null && ahora - estableDesde >= 1000
  const item = (ok: boolean | undefined, texto: string) => (
    <li className={ok ? 'text-emerald-300' : 'text-zinc-500'}>
      {ok ? '✓' : '○'} {texto}
    </li>
  )

  return (
    <Marco paso={1} titulo="Acomodá la cámara">
      {/* El video lo dibuja la pagina en este lugar (mismo elemento durante toda la preparacion). */}
      <div className="relative aspect-video w-[44rem] max-w-full rounded-3xl border-4 border-dashed border-zinc-700">
        <div className="pointer-events-none absolute left-1/2 top-[45%] h-3/5 w-1/3 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-4 border-amber-300/60" />
      </div>
      {camara.estado === 'error' ? (
        <div className="flex flex-col items-center gap-4">
          <p className="max-w-3xl text-center text-3xl text-red-300">{camara.error}</p>
          <p className="text-2xl text-zinc-400">Revisá el permiso de cámara en el candado de la barra de direcciones.</p>
          <Boton onClick={camara.reintentar}>Reintentar</Boton>
        </div>
      ) : camara.estado === 'iniciando' ? (
        <p className="text-3xl text-zinc-400">Prendiendo la cámara… (aceptá el permiso)</p>
      ) : (
        <>
          <p className={`text-4xl ${evaluacion?.listo ? 'text-emerald-300' : 'text-amber-200'}`}>
            {evaluacion?.consejo ?? 'Mirá la pantalla.'}
          </p>
          <ul className="flex gap-8 text-2xl">
            {item(evaluacion?.cara, 'Se ve la cara')}
            {item(evaluacion?.centrada, 'Centrada')}
            {item(evaluacion?.distancia === 'bien', 'Buena distancia')}
          </ul>
          {guardada ? (
            <OfertaGuardada
              guardada={guardada}
              actual={evaluacion?.promedio ?? null}
              habilitado={firme}
              onUsar={onUsarGuardada}
              onCalibrar={() => onListo(evaluacion?.promedio ?? null)}
            />
          ) : (
            <Boton onClick={() => onListo(evaluacion?.promedio ?? null)} disabled={!firme}>
              Continuar
            </Boton>
          )}
        </>
      )}
      <Boton secundario onClick={onSaltear}>
        Saltear la preparación (sin cámara)
      </Boton>
    </Marco>
  )
}

// Hay una calibracion guardada: usarla (directo a conversar) o calibrar de nuevo.
// Si la cara quedo en otro lugar que al calibrar, se recomienda recalibrar.
function OfertaGuardada({
  guardada,
  actual,
  habilitado,
  onUsar,
  onCalibrar,
}: {
  guardada: CalibracionGuardada
  actual: Encuadre | null
  habilitado: boolean
  onUsar: () => void
  onCalibrar: () => void
}) {
  const cuando = new Date(guardada.fecha).toLocaleString('es-AR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })
  const movido = !!(guardada.encuadre && actual && difiereEncuadre(guardada.encuadre, actual))
  return (
    <div className="flex flex-col items-center gap-3">
      {movido && <p className="text-2xl text-amber-300">Estás en otra posición que cuando calibraste: conviene calibrar de nuevo.</p>}
      <div className="flex items-center gap-4">
        {movido ? (
          <>
            <Boton onClick={onCalibrar} disabled={!habilitado}>
              Calibrar de nuevo
            </Boton>
            <Boton secundario onClick={onUsar} disabled={!habilitado}>
              Usar la guardada ({cuando})
            </Boton>
          </>
        ) : (
          <>
            <Boton onClick={onUsar} disabled={!habilitado}>
              Usar la calibración guardada
            </Boton>
            <Boton secundario onClick={onCalibrar} disabled={!habilitado}>
              Calibrar de nuevo
            </Boton>
          </>
        )}
      </div>
      {!movido && <p className="text-xl text-zinc-500">Guardada el {cuando}</p>}
    </div>
  )
}

// ---------- 2. Parpadeo ----------

const PARPADEOS_DE_PRUEBA = 2
const SENSIBILIDADES = [0.35, 0.45, 0.5, 0.55, 0.65] // umbral de vision: mas bajo = detecta mas facil

export function PasoParpadeo({ onListo, onVolver }: { onListo: () => void; onVolver: () => void }) {
  const [etapa, setEtapa] = useState<'base' | 'prueba' | 'error'>('base')
  const [mensaje, setMensaje] = useState('')
  const [parpadeos, setParpadeos] = useState(0)
  const [ojos, setOjos] = useState({ cerrados: false, progreso: 0 })
  const [sensibilidad, setSensibilidad] = useState(2)
  const [intento, setIntento] = useState(0)

  // Linea base con los ojos abiertos (3 s), al entrar o al reintentar.
  useEffect(() => {
    let vivo = true
    calibrar().then(
      () => vivo && setEtapa('prueba'),
      (e: unknown) => {
        if (!vivo) return
        setEtapa('error')
        setMensaje(e instanceof Error ? e.message : 'No pudimos medir tus ojos.')
      },
    )
    return () => {
      vivo = false
    }
  }, [intento])

  useEffect(() => {
    const offs = [
      bus.on('ojos', ({ cerrados, progreso }) => setOjos({ cerrados, progreso })),
      bus.on('parpadeoLargo', () => setParpadeos((n) => n + 1)),
    ]
    return () => offs.forEach((off) => off())
  }, [])

  const cambiarSensibilidad = (delta: number) => {
    const i = Math.max(0, Math.min(SENSIBILIDADES.length - 1, sensibilidad + delta))
    setSensibilidad(i)
    setUmbral(SENSIBILIDADES[i])
  }

  const listo = parpadeos >= PARPADEOS_DE_PRUEBA

  return (
    <Marco paso={2} titulo={etapa === 'base' ? 'Mirá la pantalla con los ojos abiertos' : 'Probá el parpadeo largo'}>
      {etapa === 'base' && <p className="text-3xl text-zinc-300">Midiendo tus ojos abiertos durante 3 segundos…</p>}

      {etapa === 'error' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-3xl text-red-300">{mensaje}</p>
          <div className="flex gap-4">
            <Boton
              onClick={() => {
                setEtapa('base')
                setIntento((i) => i + 1)
              }}
            >
              Reintentar
            </Boton>
            <Boton secundario onClick={onVolver}>
              Volver a la cámara
            </Boton>
          </div>
        </div>
      )}

      {etapa === 'prueba' && (
        <>
          <p className="max-w-4xl text-center text-3xl text-zinc-300">
            Cerrá los ojos medio segundo y abrilos. Así se elige. Hacelo {PARPADEOS_DE_PRUEBA} veces.
          </p>
          <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-full border-8 border-zinc-700">
            <div className="absolute inset-x-0 bottom-0 bg-amber-300/70" style={{ height: `${(ojos.cerrados ? ojos.progreso : 0) * 100}%` }} />
            <span className="relative text-3xl">{ojos.cerrados ? 'cerrados' : 'abiertos'}</span>
          </div>
          <div className="flex gap-4 text-6xl">
            {Array.from({ length: PARPADEOS_DE_PRUEBA }, (_, i) => (
              <span key={i} className={i < parpadeos ? 'text-emerald-400' : 'text-zinc-700'}>
                ●
              </span>
            ))}
          </div>
          {listo ? (
            <Boton onClick={onListo}>Continuar</Boton>
          ) : (
            <div className="flex items-center gap-4 text-2xl text-zinc-400">
              ¿No lo detecta?
              <Boton secundario onClick={() => cambiarSensibilidad(-1)}>
                más sensible
              </Boton>
              <span>{['muy alta', 'alta', 'normal', 'baja', 'muy baja'][sensibilidad]}</span>
              <Boton secundario onClick={() => cambiarSensibilidad(1)}>
                menos sensible
              </Boton>
            </div>
          )}
        </>
      )}
      <Boton secundario onClick={onListo}>
        Saltear este paso
      </Boton>
    </Marco>
  )
}

// ---------- 3. Mirada (se dibuja encima de la pantalla real) ----------

const MS_POR_OBJETIVO = 5000

type EtapaMirada =
  | { tipo: 'instrucciones' }
  | { tipo: 'calibrando'; zona: string | null; paso: number; total: number }
  | { tipo: 'prueba'; indice: number; resultado: 'mirando' | 'bien' | 'mal' }
  | { tipo: 'resultado' }
  | { tipo: 'error'; mensaje: string }

export function PasoMirada({ onListo }: { onListo: () => void }) {
  const [etapa, setEtapa] = useState<EtapaMirada>({ tipo: 'instrucciones' })
  const [objetivos, setObjetivos] = useState<string[]>([])
  const [aciertos, setAciertos] = useState(0)
  const control = useRef<AbortController | null>(null)

  useEffect(() => () => control.current?.abort(), [])

  function calibrarMirada() {
    control.current?.abort()
    const c = new AbortController()
    control.current = c
    setEtapa({ tipo: 'calibrando', zona: null, paso: 0, total: ZONAS_MIRADA.length * 2 })
    calibrarZonas(
      ZONAS_MIRADA,
      (zona, paso, total) => !c.signal.aborted && zona && setEtapa({ tipo: 'calibrando', zona, paso, total }),
      c.signal,
    ).then(
      (ok) => {
        if (!ok || c.signal.aborted) return
        setObjetivos([...ZONAS_MIRADA].sort(() => Math.random() - 0.5))
        setAciertos(0)
        setEtapa({ tipo: 'prueba', indice: 0, resultado: 'mirando' })
      },
      (e: unknown) => setEtapa({ tipo: 'error', mensaje: e instanceof Error ? e.message : 'No se pudo calibrar la mirada.' }),
    )
  }

  // Prueba: cada objetivo se acierta si la mirada se queda 500 ms en esa zona (en 5 s).
  const indicePrueba = etapa.tipo === 'prueba' && etapa.resultado === 'mirando' ? etapa.indice : null
  useEffect(() => {
    if (indicePrueba === null) return
    const objetivo = objetivos[indicePrueba]
    const estabilizador = crearEstabilizadorMirada({ permanenciaMs: 500 })
    let terminado = false
    const terminar = (bien: boolean) => {
      if (terminado) return
      terminado = true
      if (bien) setAciertos((n) => n + 1)
      setEtapa({ tipo: 'prueba', indice: indicePrueba, resultado: bien ? 'bien' : 'mal' })
      setTimeout(() => {
        const siguiente = indicePrueba + 1
        setEtapa(siguiente < objetivos.length ? { tipo: 'prueba', indice: siguiente, resultado: 'mirando' } : { tipo: 'resultado' })
      }, 700)
    }
    const off = bus.on('zonaMirada', (l) => {
      if (estabilizador.leer(l, performance.now()) === objetivo) terminar(true)
    })
    const limite = setTimeout(() => terminar(false), MS_POR_OBJETIVO)
    return () => {
      off()
      clearTimeout(limite)
    }
  }, [indicePrueba, objetivos])

  const panel = (contenido: ReactNode) => (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85">
      <div className="flex max-w-4xl flex-col items-center gap-6 rounded-3xl bg-zinc-900 px-12 py-10 text-center text-zinc-50">
        {contenido}
      </div>
    </div>
  )

  switch (etapa.tipo) {
    case 'instrucciones':
      return panel(
        <>
          <h1 className="text-5xl font-black">Calibremos la mirada</h1>
          <p className="text-3xl text-zinc-300">
            Se va a iluminar una zona por vez. Mirala sin mover la cabeza hasta que pase a la siguiente. Son unos 20 segundos.
          </p>
          <Boton onClick={calibrarMirada}>Empezar</Boton>
          <Boton secundario onClick={onListo}>
            Saltear (elegir solo con el barrido)
          </Boton>
        </>,
      )
    case 'calibrando':
      return etapa.zona ? <ObjetivoMirada zona={etapa.zona} texto={`Mirá acá · ${etapa.paso}/${etapa.total}`} /> : null
    case 'prueba': {
      const zona = objetivos[etapa.indice]
      const texto = etapa.resultado === 'bien' ? '✓' : etapa.resultado === 'mal' ? '✗' : `Probá: mirá acá · ${etapa.indice + 1}/${objetivos.length}`
      const color = etapa.resultado === 'bien' ? 'emerald' : etapa.resultado === 'mal' ? 'red' : 'amber'
      return <ObjetivoMirada zona={zona} texto={texto} color={color} />
    }
    case 'resultado': {
      const bien = aciertos >= objetivos.length - 1
      return panel(
        <>
          <h1 className="text-5xl font-black">
            Acertó {aciertos} de {objetivos.length}
          </h1>
          <p className="text-3xl text-zinc-300">
            {bien
              ? 'La mirada anda bien. Mirá una opción y parpadeá largo para elegirla.'
              : 'Conviene calibrar de nuevo: quedate quieto, con luz de frente, y mirá el centro de cada zona.'}
          </p>
          <div className="flex gap-4">
            <Boton onClick={bien ? onListo : calibrarMirada}>{bien ? 'Empezar a conversar' : 'Calibrar de nuevo'}</Boton>
            <Boton secundario onClick={bien ? calibrarMirada : onListo}>
              {bien ? 'Calibrar de nuevo' : 'Seguir igual'}
            </Boton>
          </div>
        </>,
      )
    }
    case 'error':
      return panel(
        <>
          <p className="text-3xl text-red-300">{etapa.mensaje}</p>
          <Boton onClick={calibrarMirada}>Reintentar</Boton>
          <Boton secundario onClick={onListo}>
            Saltear (elegir solo con el barrido)
          </Boton>
        </>,
      )
  }
}
