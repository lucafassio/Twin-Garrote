import type { Opcion, PedidoOpciones } from '@/eventos'

// STUB del cimiento: el path llm lo reemplaza con el fetch real a /api/opciones.
// No cambiar la firma: el path nucleo-interfaz ya la usa.
export async function pedirOpciones(pedido: PedidoOpciones): Promise<Opcion[]> {
  await new Promise((r) => setTimeout(r, 800))
  if (pedido.ultimoTurno === null) {
    return [
      { intencion: 'otra', texto: 'Che, ¿como salio River?' },
      { intencion: 'otra', texto: 'Tengo un poco de sed.' },
      { intencion: 'preguntar', texto: '¿Que hora es?' },
      { intencion: 'otra', texto: 'Vení, sentate un rato conmigo.' },
    ]
  }
  return [
    { intencion: 'aceptar', texto: 'Si, dale.' },
    { intencion: 'rechazar', texto: 'No, gracias, todo bien.' },
    { intencion: 'preguntar', texto: '¿Por que me preguntas?' },
    { intencion: 'otra', texto: 'Dejame pensarlo.' },
  ]
}
