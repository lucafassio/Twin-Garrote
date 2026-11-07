// Proveedor falso: responde al instante con opciones fijas, sin claves. Para los demas paths.
import type { Proveedor } from './tipos.ts'

const CON_TURNO = [
  [
    { intencion: 'aceptar', texto: 'Si, dale.' },
    { intencion: 'rechazar', texto: 'No, gracias, todo bien.' },
    { intencion: 'preguntar', texto: '¿Por que me preguntas?' },
    { intencion: 'otra', texto: 'Dejame pensarlo.' },
  ],
  [
    { intencion: 'aceptar', texto: 'Me parece bien, che.' },
    { intencion: 'rechazar', texto: 'Mira, hoy no tengo ganas.' },
    { intencion: 'preguntar', texto: '¿Y vos que pensas?' },
    { intencion: 'otra', texto: 'Todo bien, no te hagas drama.' },
  ],
]

const SIN_TURNO = [
  { intencion: 'otra', texto: 'Che, ¿como salio River?' },
  { intencion: 'otra', texto: 'Tengo un poco de sed.' },
  { intencion: 'preguntar', texto: '¿Que hora es?' },
  { intencion: 'otra', texto: 'Veni, sentate un rato conmigo.' },
]

export function crearProveedorFalso(): Proveedor {
  let vuelta = 0
  return {
    nombre: 'falso',
    async generar({ usuario, salida }) {
      // El agente de memoria: sin modelo no aprende nada, pero tampoco falla.
      if (salida?.nombre === 'memoria') return JSON.stringify({ hechos: [], resumen: '' })
      // El completado: sin modelo no propone nada, y el completado devuelve el prefijo tal cual.
      if (salida?.nombre === 'completado') return JSON.stringify({ frase: '' })
      const sinTurno = usuario.includes('SIN_TURNO')
      const opciones = sinTurno ? SIN_TURNO : CON_TURNO[vuelta++ % CON_TURNO.length]
      return JSON.stringify({ opciones, registro: 'casual', nuevaConversacion: false })
    },
  }
}
