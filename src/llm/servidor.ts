// El path llm en el servidor: una sola instancia por proceso, compartida por /api/opciones y
// /api/memoria. Tiene que ser una sola para que opciones, el cierre y el agente de memoria usen el
// mismo almacen y la misma fila (fila.ts): asi un cierre y un pedido de opciones no se pisan.
//
// Cierre por tiempo: cada minuto se revisa si pasaron mas de 15 min desde la ultima actividad, y si
// es asi se cierra la conversacion y el agente aprende en segundo plano. Corre aparte, nunca dentro
// de un turno.
//
// Vive en globalThis: si Next evalua este modulo mas de una vez (una vez por ruta, o al recargar en
// dev), la instancia nueva reemplaza a la anterior y frena su chequeo, y todos usan la ultima.
import { crearAlmacenEnArchivos } from './almacen-archivos.ts'
import { crearOpcionesConMemoria } from './memoria.ts'
import { elegirProveedor } from './proveedores.ts'

export const CHEQUEO_CIERRE_MS = 60_000

function crearServidorLlm() {
  const proveedor = elegirProveedor()
  const almacen = crearAlmacenEnArchivos()
  // El ultimo error del agente de memoria: /api/memoria lo muestra al cerrar a mano.
  const estado = { ultimoErrorMemoria: null as string | null }
  const llm = crearOpcionesConMemoria({
    proveedor,
    almacen,
    alFallar: (e) => {
      estado.ultimoErrorMemoria = e instanceof Error ? e.message : String(e)
      console.error('[llm] agente de memoria', e)
    },
  })
  const chequeo = setInterval(() => {
    llm.cierre.cerrarSiInactiva().catch((e) => console.error('[llm] cierre por tiempo', e))
  }, CHEQUEO_CIERRE_MS)
  chequeo.unref?.() // no mantiene vivo el proceso
  return { proveedor, almacen, estado, ...llm, detener: () => clearInterval(chequeo) }
}

export type ServidorLlm = ReturnType<typeof crearServidorLlm>

const conLlm = globalThis as typeof globalThis & { __parpadeoLlm?: ServidorLlm }
conLlm.__parpadeoLlm?.detener()
conLlm.__parpadeoLlm = crearServidorLlm()

export function servidorLlm(): ServidorLlm {
  return conLlm.__parpadeoLlm!
}
