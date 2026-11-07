// MediaPipe (Emscripten) imprime avisos informativos por console.error, y Next los
// muestra como errores en pantalla. Su cargador guarda console.error al cargar
// (`var err = console.error.bind(console)`), asi que el filtro tiene que estar puesto
// ANTES de cargar MediaPipe; cambiar console.error despues no lo afecta.

// "INFO: ..." y lineas de log de glog con nivel I o W ("W1107 16:58:39 ... gl_context.cc:1136] ...").
const AVISO = /^(INFO:|[IW]\d{4} \d{2}:\d{2}:\d{2})/

export function esAvisoMediaPipe(argumentos: unknown[]): boolean {
  const primero = argumentos[0]
  return typeof primero === 'string' && AVISO.test(primero.trimStart())
}

let instalado = false

// Una sola vez por pagina: los avisos van a console.info; los errores reales siguen igual.
export function silenciarAvisosMediaPipe() {
  if (instalado || typeof console === 'undefined') return
  instalado = true
  const original = console.error
  console.error = (...argumentos: unknown[]) => {
    if (esAvisoMediaPipe(argumentos)) console.info(...argumentos)
    else original.apply(console, argumentos)
  }
}
