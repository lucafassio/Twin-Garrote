import { appendFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { carpetaDatos } from './almacen-archivos.ts'
import type { AlmacenElecciones, RegistroEleccion } from './elecciones.ts'

// Un registro por linea; agregar nunca reescribe las elecciones anteriores. Solo la purga de vencidos
// reescribe el archivo, y solo si hay algo que sacar.
export function crearAlmacenEleccionesEnArchivos(carpeta = carpetaDatos()): AlmacenElecciones {
  const ruta = join(carpeta, 'elecciones.jsonl')
  let escrituras: Promise<void> = Promise.resolve()
  async function leerArchivo(): Promise<RegistroEleccion[]> {
    try {
      const texto = await readFile(ruta, 'utf8')
      return texto.split('\n').filter(Boolean).map((linea) => JSON.parse(linea) as RegistroEleccion)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
  }

  return {
    agregar(registro) {
      const linea = JSON.stringify(registro) + '\n'
      escrituras = escrituras.catch(() => {}).then(async () => {
        await mkdir(carpeta, { recursive: true })
        await appendFile(ruta, linea, 'utf8')
      })
      return escrituras
    },
    async leer() {
      await escrituras
      return leerArchivo()
    },
    quitarAnteriores(limite) {
      // En la misma fila que agregar: un registro nuevo no se pierde en la reescritura.
      escrituras = escrituras.catch(() => {}).then(async () => {
        const registros = await leerArchivo()
        const vigentes = registros.filter((r) => Date.parse(r.hora) >= limite.getTime())
        if (vigentes.length === registros.length) return
        // A un temporal y despues rename: un corte en el medio no deja el archivo a medias.
        const temporal = `${ruta}.tmp`
        await writeFile(temporal, vigentes.map((r) => JSON.stringify(r) + '\n').join(''), 'utf8')
        await rename(temporal, ruta)
      })
      return escrituras
    },
  }
}
