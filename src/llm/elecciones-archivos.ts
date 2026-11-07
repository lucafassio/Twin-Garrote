import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CARPETA_DATOS } from './almacen-archivos.ts'
import type { AlmacenElecciones, RegistroEleccion } from './elecciones.ts'

// Un registro por linea; agregar nunca reescribe las elecciones anteriores.
export function crearAlmacenEleccionesEnArchivos(carpeta = join(process.cwd(), CARPETA_DATOS)): AlmacenElecciones {
  const ruta = join(carpeta, 'elecciones.jsonl')
  let escrituras: Promise<void> = Promise.resolve()
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
      try {
        const texto = await readFile(ruta, 'utf8')
        return texto.split('\n').filter(Boolean).map((linea) => JSON.parse(linea) as RegistroEleccion)
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
        throw error
      }
    },
  }
}
