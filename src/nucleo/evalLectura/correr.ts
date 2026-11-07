// Mide la lectura del turno contra los casos etiquetados.
// Correr: AI_GATEWAY_API_KEY=... npx tsx src/nucleo/evalLectura/correr.ts [modelo ...]
// Sin modelos, compara la heuristica local con los modelos de decision por defecto.
import { leerTurnoLocal } from '../lecturaLocal'
import { armarPedidoLectura, interpretarLectura, URL_GATEWAY_DECISION } from '../lecturaModelo'
import { UMBRAL_COMPLETO, UMBRAL_PARA_USUARIO } from '../reductor'
import type { LecturaTurno } from '../tipos'
import { CASOS, type Caso } from './casos'

const MODELOS_POR_DEFECTO = [
  'typesafe-ai/jev',
  'baseten/mammoth-1',
  'perplexity/pplx-decider-v1.2',
  'liquid/d1-ultra',
  'baseten/elephant-1',
]
const PARALELO = 4

type Medicion = { caso: Caso; lectura: LecturaTurno | null; ms: number; error?: string }

async function leerConModelo(modelo: string, caso: Caso, key: string): Promise<Medicion> {
  const inicio = performance.now()
  try {
    const r = await fetch(URL_GATEWAY_DECISION, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(
        armarPedidoLectura({ modelo, nombreUsuario: 'Roberto', texto: caso.texto, historial: caso.historial ?? [] }),
      ),
    })
    const json = await r.json()
    const ms = performance.now() - inicio
    if (!r.ok) return { caso, lectura: null, ms, error: `${r.status} ${json?.error?.message ?? ''}`.slice(0, 120) }
    return { caso, lectura: interpretarLectura(json), ms }
  } catch (e) {
    return { caso, lectura: null, ms: performance.now() - inicio, error: String(e).slice(0, 120) }
  }
}

function leerLocal(caso: Caso): Medicion {
  const inicio = performance.now()
  const lectura = leerTurnoLocal(caso.texto, {
    nombreUsuario: 'Roberto',
    usuarioAcabaDeHablar: caso.historial?.at(-1)?.quien === 'usuario',
  })
  return { caso, lectura, ms: performance.now() - inicio }
}

async function enTandas<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++
        out[k] = await fn(items[k])
      }
    }),
  )
  return out
}

const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : '-')
const percentil = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(p * s.length))]) : 0
}

function resumir(nombre: string, ms: Medicion[]) {
  const ok = ms.filter((m) => m.lectura)
  const errores = ms.filter((m) => !m.lectura)
  // Decision final del nucleo: aceptar (para y completo), esperar (para e incompleto), descartar.
  const decision = (l: LecturaTurno) =>
    l.paraUsuario < UMBRAL_PARA_USUARIO ? 'descartar' : l.completo >= UMBRAL_COMPLETO ? 'aceptar' : 'esperar'
  const esperada = (c: Caso) => (!c.para ? 'descartar' : c.completo ? 'aceptar' : 'esperar')

  const aciertoDecision = ok.filter((m) => decision(m.lectura!) === esperada(m.caso)).length
  const ruidoAceptado = ok.filter((m) => !m.caso.para && decision(m.lectura!) === 'aceptar').length
  const paraPerdido = ok.filter((m) => m.caso.para && decision(m.lectura!) === 'descartar').length
  const conTipo = ok.filter((m) => m.caso.para && m.caso.completo && m.caso.tipo)
  const aciertoTipo = conTipo.filter((m) => m.lectura!.tipo === m.caso.tipo).length
  const tiempos = ok.map((m) => m.ms)

  console.log(
    [
      nombre.padEnd(30),
      `decision ${pct(aciertoDecision, ok.length).padStart(4)}`,
      `ruido aceptado ${ruidoAceptado}/${ok.filter((m) => !m.caso.para).length}`,
      `para Roberto descartado ${paraPerdido}/${ok.filter((m) => m.caso.para).length}`,
      `tipo ${pct(aciertoTipo, conTipo.length).padStart(4)}`,
      `p50 ${percentil(tiempos, 0.5)} ms`,
      `p95 ${percentil(tiempos, 0.95)} ms`,
      errores.length ? `errores ${errores.length} (${errores[0].error})` : '',
    ].join(' | '),
  )
  return ok.filter((m) => decision(m.lectura!) !== esperada(m.caso))
}

async function main() {
  const key = process.env.AI_GATEWAY_API_KEY
  const modelos = process.argv.slice(2).length ? process.argv.slice(2) : MODELOS_POR_DEFECTO
  console.log(`${CASOS.length} casos · umbrales para >= ${UMBRAL_PARA_USUARIO}, completo >= ${UMBRAL_COMPLETO}\n`)

  const fallos: Record<string, Medicion[]> = {}
  fallos['local'] = resumir('heuristica local', CASOS.map(leerLocal))
  if (!key) {
    console.log('\nSin AI_GATEWAY_API_KEY: solo heuristica local.')
    return
  }
  for (const modelo of modelos) {
    const ms = await enTandas(CASOS, PARALELO, (c) => leerConModelo(modelo, c, key))
    fallos[modelo] = resumir(modelo, ms)
  }

  console.log('\nFallos de decision por modelo:')
  for (const [nombre, fs] of Object.entries(fallos)) {
    if (!fs.length) continue
    console.log(`\n${nombre}`)
    for (const f of fs) {
      const l = f.lectura!
      console.log(
        `  "${f.caso.texto}" esperado ${f.caso.para ? (f.caso.completo ? 'aceptar' : 'esperar') : 'descartar'} · para ${l.paraUsuario.toFixed(2)} completo ${l.completo.toFixed(2)} ${l.tipo}`,
      )
    }
  }
}

void main()
