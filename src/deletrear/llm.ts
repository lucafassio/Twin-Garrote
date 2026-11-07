// Prediccion con el LLM para deletrear (lado servidor, lo usa /api/deletrear).
// Lo escrito es una pista: puede ser el comienzo de la frase o las primeras letras de la
// palabra importante. Dos pedidos independientes: 4 frases (con la huella entera) y
// palabras para la palabra a medias (con poco contexto, para que lleguen rapido).
// Nunca tira: si el modelo falla o devuelve algo invalido, devuelve [].
import type { Cercania, LineaHistorial, PedidoOpciones } from '@/eventos'
import type { Almacen, Hecho, Proveedor, SalidaProveedor } from '@/llm'
import { clave } from './diccionario.ts'

export type TipoPrediccion = 'frases' | 'palabras'
export type Predecir = (tipo: TipoPrediccion, escrito: string, pedido: PedidoOpciones) => Promise<string[]>

const MAX_HECHOS = 10
const MAX_EJEMPLOS = 6
const MAX_LINEAS = 8
const MAX_PALABRAS_FRASE = 20

const lista = (nombre: string): SalidaProveedor['esquema'] => ({
  type: 'object',
  properties: { [nombre]: { type: 'array', items: { type: 'string' } } },
  required: [nombre],
  additionalProperties: false,
})

const SALIDA_FRASES: SalidaProveedor = { nombre: 'deletrear-frases', maxTokens: 300, esquema: lista('frases') }
const SALIDA_PALABRAS: SalidaProveedor = { nombre: 'deletrear-palabras', maxTokens: 120, esquema: lista('palabras') }

export function crearPrediccion(deps: { proveedor: Proveedor; almacen: Almacen }): Predecir {
  return async function predecir(tipo, escrito, pedido) {
    if (tipo === 'frases' && clave(escrito).trim() === '') return []
    try {
      const perfil = await deps.almacen.leerPerfil()
      if (tipo === 'palabras') {
        const texto = await deps.proveedor.generar({
          sistema: SISTEMA_PALABRAS,
          usuario: armarPalabras(perfil.markdown, escrito, pedido),
          salida: SALIDA_PALABRAS,
        })
        return validarPalabras(texto, escrito)
      }
      const memoria = await deps.almacen.leerMemoria()
      const texto = await deps.proveedor.generar({
        sistema: SISTEMA_FRASES,
        usuario: armarFrases(perfil.markdown, memoria.hechos, memoria.ejemplosEstilo, escrito, pedido),
        salida: SALIDA_FRASES,
      })
      return validarFrases(texto, escrito)
    } catch {
      return []
    }
  }
}

// --- Prompts -----------------------------------------------------------------------

const SISTEMA_FRASES = `Sos el usuario de un sistema de comunicacion aumentativa: una persona con ELA que esta deletreando letra por letra con parpadeos, porque ninguna respuesta propuesta le sirvio. Deletrear le cuesta muchisimo, asi que escribe solo una pista y vos adivinas la frase entera que quiere decir, en primera persona, como el. Nunca hablas como asistente.

La pista puede ser:
- el comienzo de la frase ("cuando vien" -> "¿Cuándo vienen?"),
- las primeras letras de la palabra importante, en cualquier lugar de la frase ("fr" -> "Tengo frío", "Cerrá la ventana, que hace frío"),
- o una mezcla ("el lunes tengo fr" -> "El lunes tengo franco").
La ultima palabra puede estar a medias: completala. Escribe sin tildes ni signos.

Reglas:
1. Exactamente 4 frases distintas entre si, la mas probable primero. Que cubran interpretaciones distintas de la pista.
2. Cada frase usa la pista: contiene una palabra que empieza con la ultima palabra a medias, y respeta las palabras completas que ya escribio.
3. Tienen sentido en la conversacion y como respuesta al ultimo turno, si lo hay.
4. Como maximo ${MAX_PALABRAS_FRASE} palabras cada una. Cortas y naturales, con tildes y signos correctos.
5. Primera persona, con la voz del usuario segun su huella. Tono segun la cercania si esta aclarada; si no, segun el registro del turno. Con cercania formal: usted, sin muletillas ni hechos intimos (salud, familia, plata).
6. Solo usas hechos que esten en la huella. Nunca inventes sintomas, planes, noticias ni datos de su vida.
7. No nombres al interlocutor salvo que la seccion Interlocutor lo diga.
8. Espanol rioplatense con voseo.

Respondes solo JSON, sin texto alrededor: {"frases":["...","...","...","..."]}`

const SISTEMA_PALABRAS = `Sos el predictor de palabras de un teclado para una persona con ELA que deletrea letra por letra con parpadeos, en espanol rioplatense con voseo. Te dan lo que lleva escrito y la palabra a medias, y devolves las 6 palabras mas probables para completar esa palabra, segun el contexto de la frase y de la conversacion ("el lunes tengo fr" -> franco antes que frío).

Reglas:
1. Cada palabra empieza con la palabra a medias (sin contar tildes). Si la palabra a medias esta vacia, predeci la proxima palabra de la frase.
2. Una sola palabra por elemento, sin espacios ni signos, con sus tildes correctas.
3. La mas probable primero, sin repetir.

Respondes solo JSON, sin texto alrededor: {"palabras":["...", "..."]}`

function seccionesComunes(pedido: PedidoOpciones): string[] {
  const partes = [
    `# Cercania\n${pedido.cercania ?? 'no aclarada: inferi el registro del turno'}`,
    `# Interlocutor\n${pedido.interlocutor?.trim() || 'no aclarado'}`,
  ]
  const lineas = pedido.historial.slice(-MAX_LINEAS)
  if (lineas.length > 0) partes.push(`# Conversacion reciente\n${lineas.map(renderLinea).join('\n')}`)
  partes.push(
    pedido.ultimoTurno === null
      ? '# Ultimo turno\nSIN_TURNO: el usuario arranca la charla.'
      : `# Ultimo turno\nInterlocutor: ${pedido.ultimoTurno}`,
  )
  return partes
}

function armarFrases(
  perfil: string,
  hechos: Hecho[],
  ejemplos: { texto: string; fecha: string }[],
  escrito: string,
  pedido: PedidoOpciones,
): string {
  const partes = [`# Huella\n\n${perfil.trim()}`]
  const activos = hechosVisibles(hechos, pedido.cercania)
  if (activos.length > 0) partes.push(`## Hechos que sabes\n${activos.map((h) => `- ${h.texto}`).join('\n')}`)
  const recientes = [...ejemplos].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha)).slice(0, MAX_EJEMPLOS)
  if (recientes.length > 0) partes.push(`## Frases que dijo hace poco\n${recientes.map((e) => `- "${e.texto}"`).join('\n')}`)
  partes.push(...seccionesComunes(pedido))
  partes.push(`# Pista deletreada\n"${escrito.trim()}"`)
  return partes.join('\n\n')
}

function armarPalabras(perfil: string, escrito: string, pedido: PedidoOpciones): string {
  const corte = escrito.lastIndexOf(' ') + 1
  return [
    `# Usuario\n\n${perfil.trim()}`,
    ...seccionesComunes(pedido),
    `# Lo que lleva escrito\n"${escrito.slice(0, corte).trim()}"`,
    `# Palabra a medias\n"${escrito.slice(corte)}"`,
  ].join('\n\n')
}

function hechosVisibles(hechos: Hecho[], cercania: Cercania | undefined): Hecho[] {
  return hechos
    .filter((h) => h.estado === 'activo' && !(cercania === 'formal' && h.intimo))
    .sort((a, b) => b.importancia - a.importancia || Date.parse(b.fecha) - Date.parse(a.fecha))
    .slice(0, MAX_HECHOS)
}

function renderLinea(l: LineaHistorial) {
  return `- ${l.quien === 'usuario' ? 'Usuario' : 'Interlocutor'}: ${l.texto}`
}

// --- Validacion ----------------------------------------------------------------------

function leerLista(texto: string, nombre: string): string[] {
  const limpio = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    const datos = JSON.parse(limpio) as Record<string, unknown>
    const valor = datos?.[nombre]
    return Array.isArray(valor) ? valor.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const palabrasClave = (texto: string) => texto.match(/[\p{L}]+/gu)?.map(clave) ?? []

// Una frase vale si contiene una palabra que empieza con la palabra a medias.
export function validarFrases(texto: string, escrito: string): string[] {
  const ultima = palabrasClave(escrito).at(-1) ?? ''
  const vistas = new Set<string>()
  const salida: string[] = []
  for (const bruta of leerLista(texto, 'frases')) {
    const f = bruta.trim().replace(/\s+/g, ' ')
    const c = palabrasClave(f)
    if (f === '' || c.length > MAX_PALABRAS_FRASE + 5) continue
    if (ultima !== '' && !c.some((p) => p.startsWith(ultima))) continue
    const k = c.join(' ')
    if (vistas.has(k)) continue
    vistas.add(k)
    salida.push(f)
  }
  return salida.slice(0, 4)
}

// Una palabra vale si es una sola palabra y empieza con la palabra a medias.
export function validarPalabras(texto: string, escrito: string): string[] {
  const medias = clave(escrito.slice(escrito.lastIndexOf(' ') + 1))
  const vistas = new Set<string>()
  const salida: string[] = []
  for (const bruta of leerLista(texto, 'palabras')) {
    const p = bruta.trim() // conserva mayuscula de nombres propios ("Laura")
    if (!/^[\p{L}]+$/u.test(p)) continue
    const c = clave(p)
    if (!c.startsWith(medias) || vistas.has(c)) continue
    vistas.add(c)
    salida.push(p)
  }
  return salida
}
