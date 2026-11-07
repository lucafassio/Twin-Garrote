// Completado: la frase entera que propone el LLM mientras el usuario deletrea (ver GLOSSARY).
// Recibe lo que lleva deletreado y el PedidoOpciones actual (turno, historial, cercania),
// y devuelve una sola frase en la voz del usuario que empieza con lo deletreado.
// Nunca falla: si el modelo falla o devuelve algo invalido, devuelve el prefijo tal cual.
import type { Cercania, LineaHistorial, PedidoOpciones } from '@/eventos'
import type { Almacen, Hecho, Proveedor, SalidaProveedor } from './tipos.ts'

const MAX_HECHOS = 10
const MAX_EJEMPLOS = 6
const MAX_LINEAS = 8
const MAX_PALABRAS = 20

// Salida estructurada propia para los proveedores reales. Tiene que coincidir con interpretar().
export const SALIDA_COMPLETADO: SalidaProveedor = {
  nombre: 'completado',
  maxTokens: 120,
  esquema: {
    type: 'object',
    properties: { frase: { type: 'string' } },
    required: ['frase'],
    additionalProperties: false,
  },
}

export type DependenciasCompletado = {
  proveedor: Proveedor
  almacen: Almacen
}

export type CompletarFrase = (prefijo: string, pedido: PedidoOpciones) => Promise<string>

export function crearCompletado(deps: DependenciasCompletado): CompletarFrase {
  return async function completar(prefijo, pedido) {
    if (normalizar(prefijo) === '') return prefijo
    try {
      const [perfil, memoria] = await Promise.all([deps.almacen.leerPerfil(), deps.almacen.leerMemoria()])
      const partes: string[] = [`# Huella\n\n${perfil.markdown.trim()}`]

      const hechos = hechosParaCompletado(memoria.hechos, pedido.cercania)
      if (hechos.length > 0) partes.push(`## Hechos que sabes\n${hechos.map((h) => `- ${h.texto}`).join('\n')}`)

      const ejemplos = [...memoria.ejemplosEstilo]
        .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
        .slice(0, MAX_EJEMPLOS)
      if (ejemplos.length > 0) {
        partes.push(`## Frases que dijo hace poco\n${ejemplos.map((e) => `- "${e.texto}"`).join('\n')}`)
      }

      partes.push(`# Cercania\n${pedido.cercania ?? 'no aclarada: inferi el registro del turno'}`)

      const lineas = pedido.historial.slice(-MAX_LINEAS)
      if (lineas.length > 0) partes.push(`# Conversacion reciente\n${lineas.map(renderLinea).join('\n')}`)

      partes.push(
        pedido.ultimoTurno === null
          ? '# Ultimo turno\nSIN_TURNO: el usuario arranca la charla.'
          : `# Ultimo turno\nInterlocutor: ${pedido.ultimoTurno}`,
      )
      partes.push(`# Lo que lleva deletreado\n${prefijo}`)

      const texto = await deps.proveedor.generar({
        sistema: promptSistema(),
        usuario: partes.join('\n\n'),
        salida: SALIDA_COMPLETADO,
      })
      return interpretar(texto, prefijo) ?? prefijo
    } catch {
      return prefijo
    }
  }
}

// Reglas fijas en codigo: el aprendizaje automatico nunca las toca.
function promptSistema(): string {
  return `Sos el usuario de un sistema de comunicacion aumentativa: una persona con ELA que esta deletreando una frase letra por letra. Completas la frase que esta escribiendo, en primera persona, como el. Nunca hablas como asistente.

Reglas:
1. Devolves una sola frase entera que empieza exactamente con lo que lleva deletreado. La ultima palabra puede estar a medias: completala.
2. Primera persona, con la voz del usuario segun su huella. Nunca como asistente ni en tercera persona.
3. La frase tiene sentido como respuesta al ultimo turno, si lo hay.
4. Como maximo ${MAX_PALABRAS} palabras. Corta y natural: es lo que el usuario diria.
5. Tono: segun la cercania si esta aclarada; si no, segun el registro del turno. Con cercania o registro formal: usted y sin muletillas.
6. Solo usas hechos que esten en la huella. Nunca inventes sintomas, planes, opiniones fuertes ni datos de su vida. Ante la duda, completa con algo general.
7. Con cercania formal no usas hechos intimos (salud, familia, plata).
8. Espanol rioplatense con voseo.

Respondes solo JSON, sin texto alrededor: {"frase":"..."}`
}

function hechosParaCompletado(hechos: Hecho[], cercania: Cercania | undefined): Hecho[] {
  return hechos
    .filter((h) => h.estado === 'activo')
    .filter((h) => !(cercania === 'formal' && h.intimo))
    .sort((a, b) => b.importancia - a.importancia || Date.parse(b.fecha) - Date.parse(a.fecha))
    .slice(0, MAX_HECHOS)
}

function renderLinea(l: LineaHistorial) {
  return `- ${l.quien === 'usuario' ? 'Usuario' : 'Interlocutor'}: ${l.texto}`
}

// Sin mayusculas, sin tildes y con espacios simples: deletrear suele escribir sin tildes.
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// La frase vale si empieza con el prefijo (sin contar mayusculas ni tildes) y no es demasiado larga.
function interpretar(texto: string, prefijo: string): string | null {
  const limpio = texto
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  let datos: unknown
  try {
    datos = JSON.parse(limpio)
  } catch {
    return null
  }
  if (typeof datos !== 'object' || datos === null) return null
  const frase = (datos as Record<string, unknown>).frase
  if (typeof frase !== 'string') return null
  const f = frase.trim().replace(/\s+/g, ' ')
  if (f === '' || f.split(' ').length > MAX_PALABRAS + 5) return null
  const p = normalizar(prefijo)
  if (!normalizar(f).startsWith(p)) return null
  // Si el modelo no agrego nada, no es un completado: devuelve el prefijo tal cual.
  if (normalizar(f) === p) return null
  return f
}
