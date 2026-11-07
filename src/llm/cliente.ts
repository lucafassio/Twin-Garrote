import type { Opcion, PedidoOpciones } from '@/eventos'

// Cliente del navegador: pide las opciones a /api/opciones.
// No cambiar la firma: el path nucleo-interfaz ya la usa. Si falla, tira error y el nucleo
// queda "sin conexion" con las opciones fijas.
export async function pedirOpciones(pedido: PedidoOpciones): Promise<Opcion[]> {
  const respuesta = await fetch('/api/opciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pedido),
  })
  const datos = await respuesta.json().catch(() => null)
  if (!respuesta.ok || !datos || !Array.isArray(datos.opciones)) {
    throw new Error(datos?.error ?? `Fallo /api/opciones (${respuesta.status})`)
  }
  return datos.opciones as Opcion[]
}
