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

// Completado para deletrear (avisado en #6): una frase entera a partir de lo que lleva deletreado.
// No cambiar la firma. Nunca tira: si falla el fetch o la ruta, devuelve el prefijo tal cual.
export async function completarFrase(prefijo: string, pedido: PedidoOpciones): Promise<string> {
  try {
    const respuesta = await fetch('/api/completar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefijo, pedido }),
    })
    const datos = await respuesta.json().catch(() => null)
    if (!respuesta.ok || !datos || typeof datos.frase !== 'string' || datos.frase.trim() === '') return prefijo
    return datos.frase
  } catch {
    return prefijo
  }
}
