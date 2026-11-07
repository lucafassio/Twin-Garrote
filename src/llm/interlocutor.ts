// Interlocutor probable (#46): el modelo propone quien habla y el codigo lo valida contra la huella.
// Solo pasa una persona que aparece en la huella (el perfil, un hecho activo o la huella aprendida
// aceptada), nunca el usuario.
// Lo demas queda 'desconocido'. Es una propuesta: sin confirmar no nombra ni atribuye nada.
// Limite conocido: sin reconocer entidades, una palabra con mayuscula que no es persona ("River",
// "Esposa", el "Che" de una frase) pasaria si el modelo la propone. La regla del prompt pide personas.
import { huellaDe } from './huella.ts'
import type { Confianza, InterlocutorProbable, Memoria, PerfilHuella } from './tipos.ts'
import { CONFIANZAS, INTERLOCUTOR_DESCONOCIDO, SIN_INTERLOCUTOR_PROBABLE as DESCONOCIDO } from './tipos.ts'

// El nombre del usuario sale del primer titulo de la huella ("# Roberto"). Vive aca porque sus dos
// usos son la misma regla: el usuario nunca es el interlocutor (aca y en el agente de memoria).
export function nombreUsuario(perfil: PerfilHuella): string | null {
  const m = perfil.markdown.match(/^#\s+(.+?)\s*$/m)
  return m ? m[1] : null
}

// Sin mayusculas, tildes ni signos, con espacios simples. Propia y no la de completado.ts: esa cambia
// los signos por nada ("Marta-Laura" quedaria "martalaura") y traerla armaria un ciclo de imports.
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const conMayuscula = (palabra: string) => /^\p{Lu}/u.test(palabra)

// Como aparece el nombre en la huella: palabras enteras, no un pedazo de otra ("Mar" no es "Marta"),
// y escrito como nombre propio, con mayuscula ("tango" o "che" no son personas).
function buscarEnHuella(nombre: string, textos: string[]): string | null {
  const buscado = normalizar(nombre)
  if (buscado === '') return null
  const n = buscado.split(' ').length
  for (const texto of textos) {
    const palabras = texto.split(/[^\p{L}\p{N}]+/u).filter(Boolean)
    for (let i = 0; i + n <= palabras.length; i++) {
      const tramo = palabras.slice(i, i + n)
      if (conMayuscula(tramo[0]) && normalizar(tramo.join(' ')) === buscado) return tramo.join(' ')
    }
  }
  return null
}

// El usuario es su nombre completo o su primer nombre ("Roberto" de "# Roberto Fernandez").
function esElUsuario(nombre: string, perfil: PerfilHuella): boolean {
  const usuario = normalizar(nombreUsuario(perfil) ?? '')
  if (usuario === '') return false
  const n = normalizar(nombre)
  return n === usuario || n === usuario.split(' ')[0]
}

// Lo que devolvio el modelo, validado. Sin el campo, con un nombre fuera de la huella o con el del
// usuario: 'desconocido' con confianza baja. 'desconocido' del modelo conserva su confianza.
// El nombre que pasa se devuelve como esta escrito en la huella.
export function validarInterlocutorProbable(
  valor: unknown,
  perfil: PerfilHuella,
  memoria: Memoria,
): InterlocutorProbable {
  if (typeof valor !== 'object' || valor === null) return DESCONOCIDO
  const v = valor as Record<string, unknown>
  const confianza = CONFIANZAS.includes(v.confianza as Confianza) ? (v.confianza as Confianza) : 'baja'
  // "Marta (esposa)": lo de entre parentesis no es parte del nombre.
  const nombre = typeof v.nombre === 'string' ? v.nombre.replace(/\(.*?\)/g, ' ') : ''
  if (normalizar(nombre) === INTERLOCUTOR_DESCONOCIDO) return { nombre: INTERLOCUTOR_DESCONOCIDO, confianza }

  if (esElUsuario(nombre, perfil)) return DESCONOCIDO

  const activos = memoria.hechos.filter((h) => h.estado === 'activo')
  const textos = [
    perfil.markdown,
    huellaDe(memoria).aceptada?.texto ?? '', // la propuesta pendiente no cuenta: no es huella todavia
    ...activos.map((h) => h.texto),
    ...activos.map((h) => h.interlocutor ?? ''),
  ]
  const enHuella = buscarEnHuella(nombre, textos)
  return enHuella ? { nombre: enHuella, confianza } : DESCONOCIDO
}
