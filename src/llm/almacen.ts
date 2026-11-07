// Almacen en memoria: para tests y para correr sin archivos.
import type { Almacen, Memoria, PerfilHuella } from './tipos.ts'
import { PERFIL_ROBERTO } from './perfil-roberto.ts'

export function memoriaVacia(): Memoria {
  return { hechos: [], resumenes: [], ejemplosEstilo: [], conversacion: null }
}

export type AlmacenEnMemoria = Almacen & {
  // Para inspeccionar en tests: lo ultimo que se guardo.
  memoria(): Memoria
}

export function crearAlmacenEnMemoria(inicial?: {
  perfil?: PerfilHuella
  memoria?: Partial<Memoria>
}): AlmacenEnMemoria {
  const perfil = structuredClone(inicial?.perfil ?? PERFIL_ROBERTO)
  let memoria: Memoria = structuredClone({ ...memoriaVacia(), ...inicial?.memoria })
  return {
    async leerPerfil() {
      return structuredClone(perfil)
    },
    async leerMemoria() {
      return structuredClone(memoria)
    },
    async guardarMemoria(m) {
      memoria = structuredClone(m)
    },
    memoria() {
      return structuredClone(memoria)
    },
  }
}
