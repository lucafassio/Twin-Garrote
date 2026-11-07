import type { LecturaTurno, TipoTurno } from './tipos'

// Lectura del turno con heuristicas, al instante y sin red. Es el respaldo del
// lector con modelo (path llm): se usa si el modelo no esta, tarda o falla.
// Limite conocido: no distingue "che, ¿viste el partido?" dicho a Roberto o
// entre jurados. Eso solo lo resuelve un modelo con contexto.

export type ContextoLectura = { nombreUsuario: string; usuarioAcabaDeHablar: boolean }

const MULETILLAS = new Set([
  'eh', 'ehh', 'ah', 'ahh', 'uh', 'mm', 'mmm', 'este', 'bueno', 'si', 'no', 'aja', 'ok', 'dale', 'claro', 'osea', 'o', 'sea',
])
const VOCATIVOS = new Set(['che', 'papa', 'abuelo', 'abu', 'viejo'])
const SEGUNDA_PERSONA = new Set(['vos', 'te', 'tu', 'tus', 'ti', 'contigo', 'sos', 'vas', 'queres', 'tenes', 'estas', 'podes', 'sabes', 'venis', 'decis', 'necesitas', 'preferis'])
const INTERROGATIVAS = new Set(['que', 'como', 'cuando', 'donde', 'quien', 'cual', 'cuanto', 'cuanta', 'cuantos', 'cuantas', 'por'])
const SALUDOS = ['hola', 'buen dia', 'buenos dias', 'buenas', 'que tal']
const PEDIDOS = new Set(['contame', 'decime', 'mira', 'escuchame', 'avisame', 'fijate', 'pasame', 'ayudame'])
const CONECTORES_FINALES = new Set([
  'que', 'y', 'o', 'de', 'a', 'con', 'para', 'por', 'en', 'el', 'la', 'los', 'las', 'un', 'una', 'pero', 'porque', 'si', 'mi', 'tu', 'le', 'me', 'te', 'del', 'al',
])

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
const palabras = (s: string) =>
  s
    .toLowerCase()
    .replace(/[¿?¡!.,;:"']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

// Voseo y pronombres: "querés", "tenés", "venís", "viste", "visitarte".
function esSegundaPersona(conTilde: string, plana: string) {
  return (
    SEGUNDA_PERSONA.has(plana) ||
    /[áéí]s$/.test(conTilde) ||
    (plana.length > 4 && /iste$/.test(plana)) ||
    /(ar|er|ir)te$/.test(plana)
  )
}

const limitar = (x: number) => Math.max(0.05, Math.min(0.95, x))

export function leerTurnoLocal(texto: string, ctx: ContextoLectura): LecturaTurno {
  const conTilde = palabras(texto)
  const planas = conTilde.map(sinTildes)
  const nombre = sinTildes(ctx.nombreUsuario.toLowerCase())

  if (planas.length === 0 || planas.every((p) => MULETILLAS.has(p))) {
    return { paraUsuario: 0.1, completo: 0.3, tipo: 'otro' }
  }

  const nombrado = planas.some((p) => p === nombre || VOCATIVOS.has(p))
  const segunda = conTilde.some((p, i) => esSegundaPersona(p, planas[i]))
  const unido = planas.join(' ')
  const saludo = SALUDOS.some((s) => unido.startsWith(s))

  // Sin vocativos ni nombre, para ver como arranca la frase.
  const nucleo = planas.filter((p) => p !== nombre && !VOCATIVOS.has(p))
  const nucleoConTilde = conTilde.filter((_, i) => planas[i] !== nombre && !VOCATIVOS.has(planas[i]))

  let paraUsuario = 0.3
  if (nombrado) paraUsuario += 0.5
  if (segunda) paraUsuario += 0.4
  if (saludo) paraUsuario += 0.3
  if (ctx.usuarioAcabaDeHablar) paraUsuario += 0.2

  let completo: number
  if (nucleo.length === 0) completo = 0.2 // solo el nombre o "che": sigue algo
  else if (CONECTORES_FINALES.has(planas[planas.length - 1])) completo = 0.2
  else if (planas.length >= 2) completo = 0.8
  else completo = 0.4

  let tipo: TipoTurno = 'comentario'
  if (saludo) tipo = 'saludo'
  else if (nucleo.length && (INTERROGATIVAS.has(nucleo[0]) || /^(por que|para que)/.test(nucleo.join(' ')))) tipo = 'abierta'
  else if (nucleo.length && PEDIDOS.has(nucleo[0])) tipo = 'pedido'
  else if (nucleoConTilde.length && esSegundaPersona(nucleoConTilde[0], nucleo[0])) tipo = 'siNo'

  return { paraUsuario: limitar(paraUsuario), completo: limitar(completo), tipo }
}
