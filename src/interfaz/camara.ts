// Prende la camara (vision) una sola vez aunque React monte y desmonte el componente
// dos veces seguidas (modo estricto). Antes, el segundo montaje chocaba con el primero
// ("la camara ya esta en uso") y el primero, al ver su componente desmontado, la apagaba.
// El apagado se demora un poco: si alguien vuelve a enganchar enseguida, se cancela.

export function crearControladorCamara<V>(iniciar: (video: V) => Promise<() => void>, demoraApagadoMs = 300) {
  let encendida: Promise<() => void> | null = null
  let usos = 0
  let apagado: ReturnType<typeof setTimeout> | null = null

  return {
    enganchar(video: V) {
      usos++
      if (apagado) {
        clearTimeout(apagado)
        apagado = null
      }
      if (!encendida) {
        const p = iniciar(video)
        encendida = p
        p.catch(() => {
          if (encendida === p) encendida = null // el proximo intento vuelve a probar
        })
      }
      const listo = encendida.then(() => undefined)
      let suelto = false
      return {
        listo,
        soltar() {
          if (suelto) return
          suelto = true
          usos--
          if (usos > 0) return
          apagado = setTimeout(() => {
            apagado = null
            if (usos > 0 || !encendida) return
            const p = encendida
            encendida = null
            p.then(
              (apagar) => apagar(),
              () => {},
            )
          }, demoraApagadoMs)
        },
      }
    },
  }
}
