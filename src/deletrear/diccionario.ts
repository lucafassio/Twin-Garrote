// Diccionario local de deletrear: palabras predichas al instante y sin internet.
// Busca por prefijo sin tildes (pero con enie: "ano" no es "anio") y sube primero
// las palabras de la charla actual y del usuario, despues las mas frecuentes del espanol.

export type Entrada = { palabra: string; clave: string }

export type Diccionario = {
  entradas: Entrada[] // ordenadas por frecuencia, la mas frecuente primero; una por clave
}

// Clave de busqueda: minusculas, sin tildes ni dieresis, conservando la enie.
export function clave(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/ñ/g, 'ñ').replace(/\p{M}/gu, '').normalize('NFC')
}

// Voseo y palabras de cuidado que la lista de subtitulos no trae o trae muy abajo.
// Van antes que la lista general, con tilde donde corresponde.
export const PALABRAS_EXTRA = [
  'tenés', 'querés', 'podés', 'sabés', 'venís', 'decís', 'sos', 'vos', 'che', 'mirá', 'vení', 'decime',
  'dame', 'traeme', 'pasame', 'ayudame', 'llamá', 'esperá', 'contame', 'dale', 'bárbaro', 'laburo',
  'frío', 'calor', 'sed', 'hambre', 'dolor', 'duele', 'baño', 'agua', 'manta', 'almohada', 'remedio',
  'médico', 'enfermera', 'cansado', 'incómodo', 'acomodame', 'girame', 'subime', 'bajame', 'tele', 'mate',
]

// Lista con una palabra por linea, opcionalmente seguida de su frecuencia ("hola 123").
// Ya viene ordenada por frecuencia. Ignora lineas vacias, comentarios (#) y lo que no es palabra.
export function crearDiccionario(lista: string, extras: string[] = PALABRAS_EXTRA): Diccionario {
  const vistas = new Set<string>()
  const entradas: Entrada[] = []
  const agregar = (palabra: string) => {
    const p = palabra.trim().toLowerCase()
    if (!/^[\p{L}]+$/u.test(p)) return
    const c = clave(p)
    if (vistas.has(c)) return
    vistas.add(c)
    entradas.push({ palabra: p, clave: c })
  }
  for (const linea of lista.split(/\r?\n/)) {
    if (linea.startsWith('#')) continue
    agregar(linea.split(/\s+/)[0] ?? '')
  }
  // Las extras van despues en la lista pero se suben en buscar(); aca solo se aseguran.
  for (const e of extras) agregar(e)
  return { entradas }
}

// Palabras sueltas de un texto (frases de la charla, perfil), sin signos.
export function palabrasDe(texto: string): string[] {
  return texto.match(/[\p{L}]+/gu)?.map((p) => p.toLowerCase()) ?? []
}

// Las n palabras que empiezan con el fragmento, en este orden:
// 1. las de la charla actual y del usuario (cercanas), de 3 letras o mas
// 2. las extras (voseo, cuidado)
// 3. la lista general por frecuencia
// Con el fragmento vacio no predice nada: la proxima palabra la propone el LLM.
export function buscar(dic: Diccionario, fragmento: string, cercanas: string[] = [], n = 4, extras: string[] = PALABRAS_EXTRA): string[] {
  const f = clave(fragmento.trim())
  if (f === '') return []
  const salida: string[] = []
  const vistas = new Set<string>()
  const probar = (palabra: string) => {
    const c = clave(palabra)
    if (salida.length >= n || vistas.has(c) || !c.startsWith(f)) return
    vistas.add(c)
    salida.push(palabra)
  }
  for (const p of cercanas) if (p.length >= 3) probar(p)
  for (const p of extras) probar(p)
  for (const e of dic.entradas) {
    if (salida.length >= n) break
    probar(e.palabra)
  }
  return salida
}
