'use client'

import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { bus } from '@/eventos'
import DebugVision from '@/vision/DebugVision'
import { calibrarCompensacion, calibrarMirada, iniciarVision, observarVision, setDuracion, setModoPrueba } from '@/vision'
import { puntosCalibracion, sugerirDuracion, type Mirada, type Punto } from '@/vision/senales'

const objetivos: Punto[] = [
  { x: 0.24, y: 0.23 }, { x: 0.72, y: 0.64 }, { x: 0.50, y: 0.2 }, { x: 0.27, y: 0.76 },
  { x: 0.79, y: 0.35 }, { x: 0.46, y: 0.76 }, { x: 0.20, y: 0.50 }, { x: 0.73, y: 0.82 },
  { x: 0.66, y: 0.38 }, { x: 0.38, y: 0.44 },
]

export default function PruebaVision() {
  const video = useRef<HTMLVideoElement>(null)
  const areaMirada = useRef<HTMLDivElement>(null)
  const calibracionMirada = useRef<AbortController | null>(null)
  const detener = useRef<(() => void) | null>(null)
  const cancelarMedicion = useRef<(() => void) | null>(null)
  const montado = useRef(false)
  const muestrasObjetivo = useRef<{ tiempo: number; mirada: Mirada }[]>([])
  const [condicion, setCondicion] = useState('Cabeza quieta')
  const [resultados, setResultados] = useState<{ condicion: string; objetivo: number; error: number | null; oscilacion: number | null; valida: number }[]>([])
  const [estado, cambiarEstado] = useState<'apagada' | 'iniciando' | 'activa'>('apagada')
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [cantidad, setCantidad] = useState(0)
  const [duracion, cambiarDuracion] = useState(500)
  const [mirada, setMirada] = useState<Mirada>({ valida: false })
  const [posturaFuera, setPosturaFuera] = useState(false)
  const [objetivo, setObjetivo] = useState<Punto | null>(null)
  const [pantallaMirada, setPantallaMirada] = useState(false)
  const [miradaCalibrada, setMiradaCalibrada] = useState(false)
  const [prueba, setPrueba] = useState<{ intento: number; aciertos: number; errorTotal: number } | null>(null)

  useEffect(() => {
    montado.current = true
    const dejarParpadeo = bus.on('parpadeoLargo', () => setCantidad(n => n + 1))
    const dejarMirada = observarVision(lectura => {
      const ahora = performance.now()
      muestrasObjetivo.current.push({ tiempo: ahora, mirada: lectura.mirada })
      muestrasObjetivo.current = muestrasObjetivo.current.filter(muestra => ahora - muestra.tiempo <= 1500)
      setMirada(lectura.mirada)
      setPosturaFuera(lectura.posturaFuera ?? false)
    })
    return () => {
      montado.current = false
      calibracionMirada.current?.abort()
      cancelarMedicion.current?.()
      detener.current?.()
      dejarMirada()
      dejarParpadeo()
    }
  }, [])

  async function encender() {
    if (!video.current) return
    cambiarEstado('iniciando')
    setMensaje('')
    try {
      const apagar = await iniciarVision(video.current)
      if (!montado.current) { apagar(); return }
      detener.current = apagar
      setDuracion(duracion)
      cambiarEstado('activa')
    } catch (error) {
      if (!montado.current) return
      cambiarEstado('apagada')
      setMensaje(error instanceof Error ? error.message : 'No pudimos iniciar la cámara.')
    }
  }

  function aplicarDuracion(ms: number) {
    cambiarDuracion(ms)
    setDuracion(ms)
  }

  async function prepararMirada() {
    const area = areaMirada.current
    if (!area) return
    const calibracion = new AbortController()
    calibracionMirada.current = calibracion
    flushSync(() => setPantallaMirada(true))
    setMiradaCalibrada(false)
    setOcupado(true)
    setPrueba(null)
    setModoPrueba(true)
    setMensaje('Mirá el punto de calibración a medida que cambia de lugar.')
    try {
      if (document.fullscreenElement !== area && area.requestFullscreen) {
        await area.requestFullscreen().catch(() => { /* El panel fijo cubre la ventana como respaldo. */ })
      }
      if (calibracion.signal.aborted) return
      area.focus({ preventScroll: true })
      await calibrarMirada((punto, paso) => {
        setObjetivo(punto)
        setMensaje(`Calibración ${paso}/${puntosCalibracion.length}. Mirá el centro del punto y mantené la cabeza quieta.`)
      }, calibracion.signal)
      if (montado.current && !calibracion.signal.aborted) {
        setMiradaCalibrada(true)
        setMensaje('Mirada calibrada. Probá con objetivos nuevos.')
      }
    } catch (error) {
      if (montado.current) setMensaje(error instanceof Error ? error.message : 'No pudimos calibrar.')
    } finally {
      setModoPrueba(false)
      if (montado.current) { setObjetivo(null); setOcupado(false) }
    }
  }

  function salirDeMirada() {
    calibracionMirada.current?.abort()
    setPantallaMirada(false)
    setMiradaCalibrada(false)
    setObjetivo(null)
    setPrueba(null)
    if (document.fullscreenElement === areaMirada.current) void document.exitFullscreen().catch(() => {})
  }

  async function prepararCompensacion() {
    const controlador = new AbortController()
    calibracionMirada.current = controlador
    setOcupado(true)
    setModoPrueba(true)
    setObjetivo({ x: 0.5, y: 0.5 })
    setMensaje('Mirá siempre el centro. Durante 10 segundos, repetí movimientos pequeños hacia los lados y arriba/abajo.')
    try {
      const aplicada = await calibrarCompensacion(controlador.signal)
      if (!controlador.signal.aborted && montado.current) {
        setMensaje(aplicada ? 'Corrección activada. Repetí los 10 objetivos para medir el resultado.'
          : 'La corrección no mejoró la validación. Podés repetir con movimientos más pequeños.')
      }
    } catch (error) {
      if (montado.current) setMensaje(error instanceof Error ? error.message : 'No pudimos medir la postura.')
    } finally {
      setModoPrueba(false)
      if (montado.current) { setObjetivo(null); setOcupado(false) }
    }
  }

  useEffect(() => {
    if (!pantallaMirada) return
    const area = areaMirada.current
    let tuvoPantallaCompleta = document.fullscreenElement === area
    function alCambiarPantalla() {
      if (document.fullscreenElement === area) tuvoPantallaCompleta = true
      else if (tuvoPantallaCompleta) salirDeMirada()
    }
    document.addEventListener('fullscreenchange', alCambiarPantalla)
    return () => document.removeEventListener('fullscreenchange', alCambiarPantalla)
  }, [pantallaMirada])

  function medirDuracion() {
    setOcupado(true)
    setModoPrueba(true)
    setMensaje('Mirá la pantalla y parpadeá normalmente durante 30 segundos.')
    const naturales: number[] = []
    const deliberados: number[] = []
    let inicio: number | null = null
    let enReposo = true
    let abiertos = false
    let muestrasValidas = 0
    const dejar = observarVision(lectura => {
      if (lectura.izquierdo === null) { inicio = null; abiertos = false; return }
      muestrasValidas++
      if (lectura.cerrados && abiertos) inicio ??= performance.now()
      if (lectura.cerrados) return
      abiertos = true
      if (inicio === null) return
      const ms = performance.now() - inicio
      inicio = null
      if (enReposo) { naturales.push(ms); return }
      deliberados.push(ms)
      setMensaje(`Cierres deliberados: ${deliberados.length}/5. Cerrá y abrí los ojos a un ritmo cómodo.`)
      if (deliberados.length === 5) finalizar(true)
    })
    let limite = 0
    function finalizar(completa: boolean) {
      dejar()
      window.clearTimeout(pausa)
      window.clearTimeout(limite)
      cancelarMedicion.current = null
      setModoPrueba(false)
      if (!montado.current) return
      const sugerida = completa ? sugerirDuracion(naturales, deliberados) : null
      if (sugerida !== null) aplicarDuracion(sugerida)
      setMensaje(sugerida === null ? 'Calibración inconclusa. Revisá la cámara o repetí la prueba.' : `Duración sugerida: ${sugerida} ms. Podés ajustarla abajo.`)
      setOcupado(false)
    }
    const pausa = window.setTimeout(() => {
      if (muestrasValidas < 30) { finalizar(false); return }
      enReposo = false
      inicio = null
      abiertos = false
      setMensaje('Ahora hacé 5 cierres deliberados a un ritmo cómodo y reabrí después de cada uno.')
      limite = window.setTimeout(() => finalizar(false), 30000)
    }, 30000)
    cancelarMedicion.current = () => finalizar(false)
  }

  function registrarObjetivo() {
    if (!prueba || !objetivo) return
    const muestras = muestrasObjetivo.current
    if (muestras.length < 2 || performance.now() - muestras[0].tiempo < 1000) {
      setMensaje('Sostené la mirada al menos un segundo antes de registrar.')
      return
    }
    let tiempoTotal = 0
    let tiempoValido = 0
    let sumaX = 0
    let sumaY = 0
    let sumaError = 0
    const validas: { x: number; y: number; peso: number }[] = []
    const ahora = performance.now()
    muestras.forEach((muestra, indice) => {
      const intervalo = (muestras[indice + 1]?.tiempo ?? ahora) - muestra.tiempo
      tiempoTotal += intervalo
      if (!muestra.mirada.valida) return
      const peso = Math.min(intervalo, 100)
      const { x, y } = muestra.mirada
      tiempoValido += peso
      sumaX += x * peso
      sumaY += y * peso
      sumaError += Math.hypot((x - objetivo.x) * window.innerWidth, (y - objetivo.y) * window.innerHeight) * peso
      validas.push({ x, y, peso })
    })
    const centroX = sumaX / tiempoValido
    const centroY = sumaY / tiempoValido
    const errorPx = tiempoValido > 0 ? sumaError / tiempoValido : null
    const oscilacion = tiempoValido > 0 ? Math.sqrt(validas.reduce((total, muestra) =>
      total + muestra.peso * (((muestra.x - centroX) * window.innerWidth) ** 2 +
        ((muestra.y - centroY) * window.innerHeight) ** 2), 0) / tiempoValido) : null
    setResultados(previos => [...previos, {
      condicion, objetivo: prueba.intento + 1, error: errorPx, oscilacion,
      valida: tiempoTotal > 0 ? 100 * tiempoValido / tiempoTotal : 0,
    }])
    const error = tiempoValido > 0 ? Math.hypot(centroX - objetivo.x, centroY - objetivo.y) : 1
    const acierto = error <= 0.12
    const intento = prueba.intento + 1
    const aciertos = prueba.aciertos + Number(acierto)
    const errorTotal = prueba.errorTotal + error
    if (intento < objetivos.length) {
      setPrueba({ intento, aciertos, errorTotal })
      setObjetivo(objetivos[intento])
      muestrasObjetivo.current = []
      setMensaje('Mirá el centro del objetivo y presioná Enter sin apartar la mirada.')
    } else {
      setMensaje(`Prueba de mirada: ${aciertos}/${objetivos.length} aciertos. Desvío medio normalizado: ${(100 * errorTotal / intento).toFixed(1)} %.`)
      setPrueba(null)
      setObjetivo(null)
    }
  }

  const boton = 'rounded border px-3 py-1 disabled:opacity-50'
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-3 py-6 sm:px-6">
      <h1 className="text-3xl font-bold">Prueba de Visión</h1>
      <div className="flex flex-wrap gap-2">
        <label>Condición de prueba <select className="rounded border bg-zinc-900 p-2 text-white" value={condicion} disabled={ocupado || !!prueba} onChange={evento => setCondicion(evento.target.value)}>
          <option>Cabeza quieta</option><option>Movimientos leves</option>
        </select></label>
        <button className={boton} disabled={estado !== 'apagada'} onClick={encender}>Encender cámara</button>
        <button className={boton} disabled={estado !== 'activa' || ocupado} onClick={() => {
          detener.current?.(); detener.current = null; cambiarEstado('apagada'); setObjetivo(null); setPrueba(null)
        }}>Apagar cámara</button>
        <button className={boton} onClick={() => setCantidad(0)}>Reiniciar contador</button>
      </div>
      <p>Parpadeos largos detectados: <strong>{cantidad}</strong></p>
      <video ref={video} muted playsInline className="w-48 rounded bg-black" />
      <DebugVision ocupado={ocupado || estado !== 'activa'} />
      <div className="flex flex-wrap gap-2">
        <button className={boton} disabled={estado !== 'activa' || ocupado || !!prueba} onClick={medirDuracion}>Sugerir duración</button>
        <button className={boton} disabled={estado !== 'activa' || ocupado} onClick={prepararMirada}>Calibrar mirada</button>
      </div>
      <label className="block">Duración del cierre: {duracion} ms{' '}
        <input type="range" min="250" max="1000" step="25" value={duracion} disabled={ocupado} onChange={evento => aplicarDuracion(evento.target.valueAsNumber)} />
      </label>
      <p role="status">{estado === 'iniciando' ? 'Iniciando cámara y modelo…' : mensaje}</p>
      <div ref={areaMirada} hidden={!pantallaMirada} tabIndex={-1} onKeyDown={evento => {
        if (evento.key === 'Escape') salirDeMirada()
        if (evento.key === 'Enter' && !evento.repeat && evento.target === evento.currentTarget) registrarObjetivo()
      }} className="fixed inset-0 z-50 overflow-hidden bg-zinc-950 text-white outline-none" aria-label="Área calibrada de mirada">
        <div className="absolute inset-x-0 top-0 z-10 flex flex-wrap items-center gap-3 p-3">
          <button className={boton} onClick={salirDeMirada}>Salir</button>
          {!ocupado && !prueba && <select aria-label="Condición de prueba" className="rounded border bg-zinc-900 p-2" value={condicion} onChange={evento => setCondicion(evento.target.value)}>
            <option>Cabeza quieta</option><option>Movimientos leves</option>
          </select>}
          {miradaCalibrada && !prueba && !ocupado && <button className={boton} onClick={prepararCompensacion}>Calibrar movimientos leves</button>}
          {miradaCalibrada && !prueba && !ocupado && <button className={boton} onClick={() => {
            setPrueba({ intento: 0, aciertos: 0, errorTotal: 0 })
            setObjetivo(objetivos[0])
            muestrasObjetivo.current = []
            setMensaje('Mirá el centro del objetivo y presioná Enter sin apartar la mirada.')
            areaMirada.current?.focus({ preventScroll: true })
          }}>Probar 10 objetivos</button>}
          <p role="status">{posturaFuera ? 'Volvé a la postura de calibración para retomar la mirada.' : mensaje}{prueba && ` ${prueba.intento + 1}/10`}</p>
        </div>
        {objetivo && <span className="absolute grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-sky-500" style={{ left: `${objetivo.x * 100}%`, top: `${objetivo.y * 100}%` }}><span className="size-1.5 rounded-full bg-white" /></span>}
        {mirada.valida && !ocupado && <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400" style={{ left: `${mirada.x * 100}%`, top: `${mirada.y * 100}%` }} />}
      </div>
      <p>Mirada: {mirada.valida ? `${mirada.x.toFixed(2)}, ${mirada.y.toFixed(2)}` : 'Sin seguimiento válido'}</p>
      {resultados.length > 0 && <section className="overflow-x-auto">
        <p>Resultados de los últimos 1,5 segundos antes de cada registro. Error y oscilación medidos en píxeles sobre las lecturas válidas.</p>
        <table className="w-full text-left">
          <thead><tr><th>Condición</th><th>Objetivo</th><th>Error medio</th><th>Oscilación RMS</th><th>Señal válida</th></tr></thead>
          <tbody>{resultados.map((resultado, indice) => <tr key={indice}>
            <td>{resultado.condicion}</td><td>{resultado.objetivo}</td>
            <td>{resultado.error === null ? 'Sin datos' : resultado.error.toFixed(0) + ' px'}</td>
            <td>{resultado.oscilacion === null ? 'Sin datos' : resultado.oscilacion.toFixed(0) + ' px'}</td>
            <td>{resultado.valida.toFixed(1)} %</td>
          </tr>)}</tbody>
        </table>
        <button className={boton} disabled={!!prueba} onClick={() => setResultados([])}>Limpiar resultados</button>
      </section>}
    </main>
  )
}
