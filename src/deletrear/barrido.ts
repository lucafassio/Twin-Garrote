// Barrido de deletrear, puro y testeable: primero ilumina filas, un parpadeo largo entra
// a la fila iluminada y despues ilumina sus elementos de a uno.
// Orden: Frases (si hay) -> Palabras (si hay) -> Acciones -> 5 filas de letras por frecuencia -> 2 de numeros.

export type Accion = 'decir' | 'borrarLetra' | 'borrarPalabra' | 'salir'

export type Item =
  | { tipo: 'frase'; texto: string }
  | { tipo: 'palabra'; texto: string }
  | { tipo: 'accion'; accion: Accion }
  | { tipo: 'letra'; letra: string } // ' ' = espacio; tambien los numeros

export type IdFila = 'frases' | 'palabras' | 'acciones' | 'l1' | 'l2' | 'l3' | 'l4' | 'l5' | 'n1' | 'n2'

export type Fila = { id: IdFila; items: Item[] }

// Por frecuencia en espanol: las dos primeras filas cubren ~85% de lo que se escribe.
export const LETRAS: string[][] = [
  [' ', 'e', 'a', 'o', 's', 'n'],
  ['r', 'i', 'l', 'd', 't', 'u'],
  ['c', 'm', 'p', 'b', 'h', 'q'],
  ['y', 'v', 'g', 'f', 'j', 'z'],
  ['ñ', 'x', 'k', 'w'],
]

// Al final: se usan poco (horas, fechas, cantidades). De a 5 para no alargar el barrido de la fila.
export const NUMEROS: string[][] = [
  ['1', '2', '3', '4', '5'],
  ['6', '7', '8', '9', '0'],
]

export const VUELTAS_HASTA_PAUSA = 3

export function armarFilas(frases: string[], palabras: string[], hayTexto: boolean): Fila[] {
  const filas: Fila[] = []
  if (frases.length > 0) filas.push({ id: 'frases', items: frases.map((texto) => ({ tipo: 'frase', texto })) })
  if (palabras.length > 0) filas.push({ id: 'palabras', items: palabras.map((texto) => ({ tipo: 'palabra', texto })) })
  const acciones: Accion[] = hayTexto ? ['decir', 'borrarLetra', 'borrarPalabra', 'salir'] : ['salir']
  filas.push({ id: 'acciones', items: acciones.map((accion) => ({ tipo: 'accion', accion })) })
  LETRAS.forEach((letras, i) => {
    filas.push({ id: `l${i + 1}` as IdFila, items: letras.map((letra) => ({ tipo: 'letra', letra })) })
  })
  NUMEROS.forEach((numeros, i) => {
    filas.push({ id: `n${i + 1}` as IdFila, items: numeros.map((letra) => ({ tipo: 'letra', letra })) })
  })
  return filas
}

// fila null = la primera de las filas actuales (cambian cuando llegan frases o palabras).
// dentro null = recorriendo filas; un numero = elemento iluminado dentro de la fila.
export type Barrido = { fila: IdFila | null; dentro: number | null; vueltas: number; pausado: boolean }

export const BARRIDO_INICIAL: Barrido = { fila: null, dentro: null, vueltas: 0, pausado: false }

export function filaActual(b: Barrido, filas: Fila[]): Fila {
  return filas.find((f) => f.id === b.fila) ?? filas[0]
}

// Lo iluminado ahora: la fila entera, o un elemento de ella.
export function iluminado(b: Barrido, filas: Fila[]): { fila: IdFila; item: number | null } {
  const fila = filaActual(b, filas)
  return { fila: fila.id, item: b.dentro !== null && fila.id === b.fila ? b.dentro : null }
}

// Un paso del barrido. Si una fila se recorre entera sin elegir, vuelve arriba.
// Tras VUELTAS_HASTA_PAUSA vueltas por las filas sin elegir, se pausa.
export function avanzar(b: Barrido, filas: Fila[]): Barrido {
  if (b.pausado) return b
  const fila = filaActual(b, filas)
  if (b.dentro !== null) {
    if (fila.id !== b.fila || b.dentro + 1 >= fila.items.length) return { ...b, fila: null, dentro: null }
    return { ...b, dentro: b.dentro + 1 }
  }
  const i = filas.indexOf(fila)
  if (i + 1 < filas.length) return { ...b, fila: filas[i + 1].id }
  const vueltas = b.vueltas + 1
  return { fila: null, dentro: null, vueltas, pausado: vueltas >= VUELTAS_HASTA_PAUSA }
}

// Parpadeo largo: reanuda si estaba en pausa, entra a la fila, o elige el elemento.
// Despues de elegir, el barrido vuelve arriba.
export function elegir(b: Barrido, filas: Fila[]): { barrido: Barrido; item: Item | null } {
  if (b.pausado) return { barrido: BARRIDO_INICIAL, item: null }
  const fila = filaActual(b, filas)
  if (b.dentro === null || fila.id !== b.fila) {
    return { barrido: { fila: fila.id, dentro: 0, vueltas: 0, pausado: false }, item: null }
  }
  return { barrido: BARRIDO_INICIAL, item: fila.items[b.dentro] ?? null }
}

// --- Texto ---------------------------------------------------------------------

// La palabra a medias: lo que va despues del ultimo espacio.
export function fragmento(texto: string): string {
  return texto.slice(texto.lastIndexOf(' ') + 1)
}

export function agregarLetra(texto: string, letra: string): string {
  if (letra === ' ') return texto === '' || texto.endsWith(' ') ? texto : texto + ' '
  return texto + letra
}

// Reemplaza la palabra a medias por la palabra elegida y agrega el espacio.
export function ponerPalabra(texto: string, palabra: string): string {
  return texto.slice(0, texto.lastIndexOf(' ') + 1) + palabra + ' '
}

export function borrarLetra(texto: string): string {
  return texto.slice(0, -1)
}

export function borrarPalabra(texto: string): string {
  const sinEspacio = texto.replace(/ +$/, '')
  return sinEspacio.slice(0, sinEspacio.lastIndexOf(' ') + 1)
}
