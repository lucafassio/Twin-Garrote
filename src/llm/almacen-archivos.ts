// Almacen en archivos: la implementacion real del almacen, solo lado servidor (usa node:fs).
// En `.data/` (fuera de git): el perfil en markdown y la memoria en JSON.
//   .data/huella.md    el perfil que carga la familia; si no existe, se crea con el de Roberto.
//   .data/memoria.json hechos, resumenes, ejemplos de estilo y la conversacion actual.
// El perfil solo se lee: este almacen no tiene como escribirlo despues de crearlo.
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Almacen, Memoria } from './tipos.ts'
import { memoriaVacia } from './almacen.ts'
import { PERFIL_ROBERTO } from './perfil-roberto.ts'

export const CARPETA_DATOS = '.data'

// En Vercel el proyecto es de solo lectura: solo /tmp se puede escribir (y no dura entre instancias).
export function carpetaDatos(): string {
  return join(process.env.VERCEL ? tmpdir() : process.cwd(), CARPETA_DATOS)
}

export function crearAlmacenEnArchivos(carpeta: string = carpetaDatos()): Almacen {
  const rutaPerfil = join(carpeta, 'huella.md')
  const rutaMemoria = join(carpeta, 'memoria.json')
  // Las escrituras van en fila para que dos guardados no se pisen a mitad de archivo.
  let escrituras: Promise<void> = Promise.resolve()

  async function leer(ruta: string): Promise<string | null> {
    try {
      return await readFile(ruta, 'utf8')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw e
    }
  }

  async function escribir(ruta: string, contenido: string) {
    await mkdir(carpeta, { recursive: true })
    const temporal = `${ruta}.${process.pid}.tmp`
    await writeFile(temporal, contenido, 'utf8')
    await rename(temporal, ruta) // atomico: nunca queda un JSON a medias
  }

  return {
    async leerPerfil() {
      const markdown = await leer(rutaPerfil)
      if (markdown !== null) return { origen: 'familia', markdown }
      // Demo: el perfil de Roberto viene precargado, como si lo hubiera llenado Marta.
      await escribir(rutaPerfil, PERFIL_ROBERTO.markdown)
      return structuredClone(PERFIL_ROBERTO)
    },
    async leerMemoria() {
      await escrituras
      const texto = await leer(rutaMemoria)
      if (texto === null) return memoriaVacia()
      return { ...memoriaVacia(), ...(JSON.parse(texto) as Partial<Memoria>) }
    },
    guardarMemoria(memoria) {
      const contenido = JSON.stringify(memoria, null, 2) + '\n'
      escrituras = escrituras.catch(() => {}).then(() => escribir(rutaMemoria, contenido))
      return escrituras
    },
  }
}
