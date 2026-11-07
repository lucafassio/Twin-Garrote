import { connection } from 'next/server'
import { crearAlmacenEleccionesEnArchivos } from '@/llm/elecciones-archivos'
import { EleccionInvalida, registrarEleccion, resumirElecciones } from '@/llm/elecciones'

const almacen = crearAlmacenEleccionesEnArchivos()

export async function GET() {
  await connection()
  return Response.json(await resumirElecciones(almacen))
}

export async function POST(request: Request) {
  let cuerpo: unknown
  try {
    cuerpo = await request.json()
  } catch {
    return Response.json({ error: 'El cuerpo no es JSON' }, { status: 400 })
  }
  try {
    return Response.json(await registrarEleccion(almacen, cuerpo))
  } catch (error) {
    if (error instanceof EleccionInvalida) return Response.json({ error: error.message }, { status: 400 })
    return Response.json({ error: 'No se pudo registrar la eleccion' }, { status: 500 })
  }
}
