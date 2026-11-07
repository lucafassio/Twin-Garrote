// Medicion en vivo del proveedor (#24): pega a las rutas de un servidor que ya esta corriendo.
//   1. Un pedido de calentamiento (no cuenta: en dev compila la ruta).
//   2. Los 10 turnos de prueba de /prueba/llm contra /api/opciones, uno por uno.
//   3. Un completado contra /api/completar.
//   4. Un cierre forzado contra /api/memoria (el agente de memoria, con su propio esquema).
// Dos modos:
//   Contra un servidor levantado (punta a punta por las rutas). Escribe en .data/, igual que /prueba/llm:
//     node src/llm/medir-latencias.ts http://localhost:3000
//   Directo, sin servidor: los mismos modulos en este proceso, con un almacen en una carpeta temporal
//   cargado con la memoria de un mes de uso (memoria-cargada.ts, #41: bloques de dia, semana y mes,
//   huella aprendida aceptada, saliencia). Con --vacia, el almacen arranca vacio, para comparar.
//   El proveedor sale de LLM_PROVEEDOR, asi se comparan los dos sin tocar el servidor:
//     LLM_PROVEEDOR=gateway node --env-file=.env.local src/llm/medir-latencias.ts
//     LLM_PROVEEDOR=anthropic node --env-file=.env.local src/llm/medir-latencias.ts
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Cercania, LineaHistorial, PedidoOpciones } from '@/eventos'
import { crearAlmacenEnArchivos } from './almacen-archivos.ts'
import { crearCompletado } from './completado.ts'
import { listarHechos } from './controles-memoria.ts'
import { memoriaCargada } from './memoria-cargada.ts'
import { estimarTokens } from './tokens.ts'
import { crearOpcionesConMemoria } from './memoria.ts'
import { elegirProveedor } from './proveedores.ts'
import type { Proveedor } from './tipos.ts'

const ARGS = process.argv.slice(2)
const VACIA = ARGS.includes('--vacia')
const BASE = ARGS.find((a) => !a.startsWith('--'))
const LIMITE_MS = 2500

// Los mismos 10 turnos de src/app/prueba/llm/page.tsx.
const TURNOS: { turno: string; cercania?: Cercania }[] = [
  { turno: '¿Qué querés comer hoy?', cercania: 'familia' },
  { turno: '¿Tenés hambre? ¿Te preparo algo?', cercania: 'familia' },
  { turno: '¿Viste el partido de River ayer?', cercania: 'conocido' },
  { turno: 'Che, ¿quién gana el superclásico el domingo?' },
  { turno: '¿Cómo te sentís hoy?', cercania: 'familia' },
  { turno: '¿Dormiste bien anoche?' },
  { turno: 'Laura dijo que viene el sábado con los chicos.', cercania: 'familia' },
  { turno: '¿Querés que abra la ventana?' },
  { turno: 'Buenos días, Roberto. ¿Tuvo dificultad para tragar esta semana?', cercania: 'formal' },
  { turno: 'Le vamos a ajustar la medicación. ¿Tiene alguna pregunta?', cercania: 'formal' },
]

type Medido = { datos: Record<string, unknown>; ms: number }
type Llamar = (ruta: '/api/opciones' | '/api/completar' | '/api/memoria', cuerpo: Record<string, unknown>) => Promise<Medido>

async function medir(fn: () => Promise<Record<string, unknown>>): Promise<Medido> {
  const inicio = performance.now()
  const datos = await fn()
  return { datos, ms: Math.round(performance.now() - inicio) }
}

function porHttp(base: string): Llamar {
  return (ruta, cuerpo) =>
    medir(async () => {
      const r = await fetch(`${base}${ruta}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      const datos = (await r.json()) as Record<string, unknown>
      if (!r.ok) throw new Error(`${ruta} HTTP ${r.status}: ${String(datos.error ?? '')}`)
      return datos
    })
}

// Tokens estimados (sistema + usuario) de cada pedido de opciones, en orden. Solo en modo directo.
const tokensOpciones: number[] = []

// Lo mismo que hacen las tres rutas, sin Next en el medio.
async function directo(): Promise<Llamar> {
  const real = elegirProveedor()
  const proveedor: Proveedor = {
    nombre: real.nombre,
    generar(p) {
      // Sin salida propia es un pedido de opciones: completado, memoria y rollups traen la suya.
      const esOpciones = !p.salida
      if (esOpciones) tokensOpciones.push(estimarTokens(p.sistema) + estimarTokens(p.usuario))
      return real.generar(p)
    },
  }
  const almacen = crearAlmacenEnArchivos(await mkdtemp(join(tmpdir(), 'parpadeo-medir-')))
  if (!VACIA) await almacen.guardarMemoria(memoriaCargada(new Date()))
  let errorMemoria: unknown = null
  const { generarOpciones, cierre, memoria } = crearOpcionesConMemoria({
    proveedor,
    almacen,
    alFallar: (e) => (errorMemoria = e),
  })
  const completar = crearCompletado({ proveedor, almacen })
  return (ruta, cuerpo) =>
    medir(async () => {
      if (ruta === '/api/opciones') {
        const resultado = await generarOpciones(cuerpo as unknown as PedidoOpciones)
        return { ...resultado, proveedor: proveedor.nombre }
      }
      if (ruta === '/api/completar') {
        const frase = await completar(String(cuerpo.prefijo), cuerpo.pedido as PedidoOpciones)
        return { frase, proveedor: proveedor.nombre }
      }
      const cerrada = await cierre.cerrar(cuerpo.historial as LineaHistorial[])
      if (cerrada) {
        await new Promise((r) => setImmediate(r)) // el cierre dispara al agente en segundo plano
        await memoria.listo()
        if (errorMemoria) throw errorMemoria
      }
      return { cerrada: cerrada !== null, lineas: cerrada?.lineas.length ?? 0, ...(await listarHechos(almacen)) }
    })
}

function armarPedido(turno: string, cercania?: Cercania, historial: LineaHistorial[] = []): PedidoOpciones {
  return { historial, ultimoTurno: turno, yaMostradas: [], ...(cercania ? { cercania } : {}) }
}

function mediana(xs: number[]): number {
  const o = [...xs].sort((a, b) => a - b)
  const m = Math.floor(o.length / 2)
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2)
}

async function main() {
  const llamar = BASE ? porHttp(BASE) : await directo()
  console.log(
    BASE
      ? `Punta a punta por ${BASE}`
      : `Directo, sin servidor (almacen temporal ${VACIA ? 'vacio' : 'con memoria cargada'})`,
  )
  // Calentamiento de las tres rutas: en dev, la primera llamada a cada una compila.
  await llamar('/api/opciones', armarPedido('Hola, ¿cómo andás?', 'familia'))
  await llamar('/api/completar', { prefijo: '', pedido: armarPedido('Hola', 'familia') })
  if (BASE) await fetch(`${BASE}/api/memoria`)

  const filas: { turno: string; total: number; servidor: number; opciones: string[]; probable: string }[] = []
  let proveedor = ''
  for (const t of TURNOS) {
    const { datos, ms } = await llamar('/api/opciones', armarPedido(t.turno, t.cercania))
    proveedor = String(datos.proveedor)
    const opciones = (datos.opciones as { texto: string }[]).map((o) => o.texto)
    const p = datos.interlocutorProbable as { nombre?: string; confianza?: string } | undefined
    const probable = p ? `${p.nombre} (${p.confianza})` : 'sin campo'
    filas.push({ turno: t.turno, total: ms, servidor: Number(datos.ms ?? ms), opciones, probable })
  }

  const completado = await llamar('/api/completar', {
    prefijo: 'quiero mil',
    pedido: armarPedido('¿Qué querés comer hoy?', 'familia'),
  })

  const historialCierre: LineaHistorial[] = [
    { quien: 'interlocutor', texto: 'Laura dijo que viene el sábado con los chicos.' },
    { quien: 'usuario', texto: 'Qué lindo, que traigan facturas.', origen: 'opcion' },
    { quien: 'interlocutor', texto: '¿De qué las querés?' },
    { quien: 'usuario', texto: 'de dulce de leche', origen: 'deletreo' },
  ]
  const cierre = await llamar('/api/memoria', { accion: 'cerrar', historial: historialCierre, cercania: 'familia' })

  // Que haya tiempos no alcanza: el completado devuelve el prefijo si el modelo falla,
  // y sin key el proveedor cae en el falso sin avisar.
  if (proveedor.startsWith('falso')) throw new Error('Se uso el proveedor falso: falta la key o LLM_PROVEEDOR')
  if (completado.datos.frase === 'quiero mil') throw new Error('El completado devolvio el prefijo: fallo el modelo')
  if (cierre.datos.cerrada !== true) throw new Error('El cierre no cerro ninguna conversacion')

  const totales = filas.map((f) => f.total)
  const promedio = Math.round(totales.reduce((s, x) => s + x, 0) / totales.length)
  console.log(`## ${proveedor}\n`)
  console.log('| # | Turno | Total | Servidor | Interlocutor probable |')
  console.log('|---|---|---|---|---|')
  filas.forEach((f, i) => console.log(`| ${i + 1} | ${f.turno} | ${f.total} ms | ${f.servidor} ms | ${f.probable} |`))
  console.log(
    `\nOpciones: promedio ${promedio} ms, mediana ${mediana(totales)} ms, max ${Math.max(...totales)} ms` +
      ` (${totales.filter((x) => x > LIMITE_MS).length}/${TURNOS.length} pasan de ${LIMITE_MS} ms)`,
  )
  if (tokensOpciones.length > 0) {
    // El primero es el calentamiento: se cuentan los de los 10 turnos.
    const t = tokensOpciones.slice(1, 1 + TURNOS.length)
    console.log(`Prompt de opciones: ~${Math.min(...t)} a ~${Math.max(...t)} tokens estimados`)
  }
  console.log(`Completado "quiero mil": "${String(completado.datos.frase)}" en ${completado.ms} ms`)
  const activos = (cierre.datos.activos as { texto?: string }[] | undefined) ?? []
  console.log(
    `Agente de memoria: cerrada=${String(cierre.datos.cerrada)}, ${String(cierre.datos.lineas)} lineas,` +
      ` ${activos.length} hechos activos, en ${cierre.ms} ms`,
  )
  console.log('\nOpciones por turno:')
  filas.forEach((f, i) => console.log(`${i + 1}. ${f.opciones.join(' | ')}`))
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
