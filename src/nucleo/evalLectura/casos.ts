import type { LineaHistorial } from '@/eventos'
import type { TipoTurno } from '../tipos'

// Casos etiquetados a mano para medir la lectura del turno (espanol rioplatense,
// sin puntuacion como llega de la transcripcion). tipo solo importa si es para el
// usuario y esta completo.
export type Caso = {
  texto: string
  historial?: LineaHistorial[]
  para: boolean
  completo: boolean
  tipo?: TipoTurno
  nota?: string
}

const ROBERTO_FRIO: LineaHistorial[] = [
  { quien: 'interlocutor', texto: '¿Cómo estás, pa?' },
  { quien: 'usuario', texto: 'Tengo un poco de frío.' },
]
const ROBERTO_LAURA: LineaHistorial[] = [
  { quien: 'interlocutor', texto: 'Hola Roberto' },
  { quien: 'usuario', texto: '¿Cómo está Laura?' },
]
const ROBERTO_DALE: LineaHistorial[] = [
  { quien: 'interlocutor', texto: '¿Te traigo el diario?' },
  { quien: 'usuario', texto: 'Dale.' },
]

export const CASOS: Caso[] = [
  // Para Roberto, completas
  { texto: 'che Roberto querés unos mates', para: true, completo: true, tipo: 'siNo' },
  { texto: 'tenés frío', para: true, completo: true, tipo: 'siNo' },
  { texto: 'qué querés comer hoy', para: true, completo: true, tipo: 'abierta' },
  { texto: 'hola Roberto cómo andás', para: true, completo: true, tipo: 'saludo', nota: 'saludo con pregunta' },
  { texto: 'mañana viene Laura a visitarte', para: true, completo: true, tipo: 'comentario' },
  { texto: 'contame cómo dormiste', para: true, completo: true, tipo: 'pedido' },
  { texto: 'querés que te cambie de posición', para: true, completo: true, tipo: 'siNo' },
  { texto: 'a qué hora querés que venga el médico', para: true, completo: true, tipo: 'abierta' },
  { texto: 'papá te traje el diario', para: true, completo: true, tipo: 'comentario' },
  { texto: 'te duele algo', para: true, completo: true, tipo: 'siNo' },
  { texto: 'buen día Roberto', para: true, completo: true, tipo: 'saludo' },
  // Con contexto: siguen la charla sin nombrarlo
  { texto: 'querés que te traiga una manta', historial: ROBERTO_FRIO, para: true, completo: true, tipo: 'siNo' },
  { texto: 'bien bien la operación salió perfecta', historial: ROBERTO_LAURA, para: true, completo: true, tipo: 'comentario', nota: 'sin segunda persona' },
  { texto: 'listo ahora te lo traigo', historial: ROBERTO_DALE, para: true, completo: true, tipo: 'comentario' },
  // Medico, de usted
  { texto: 'señor Roberto vamos a ajustarle la medicación', para: true, completo: true, tipo: 'comentario' },
  { texto: 'le molesta si lo reviso', para: true, completo: true, tipo: 'siNo', nota: 'usted' },
  { texto: 'cómo se siente hoy', para: true, completo: true, tipo: 'abierta', nota: 'usted' },
  // Para Roberto, incompletas
  { texto: 'Roberto', para: true, completo: false },
  { texto: 'che Roberto querés que te', para: true, completo: false },
  { texto: 'mirá lo que pasó con', para: true, completo: false },
  { texto: 'y vos qué opinás de', para: true, completo: false },
  // Charla de la sala, no es para Roberto
  { texto: 'el proyecto está muy bueno la verdad', para: false, completo: true },
  { texto: 'a qué hora terminamos con los jurados', para: false, completo: true },
  { texto: 'pasame el cargador que me quedé sin batería', para: false, completo: true, nota: 'Roberto no puede pasar nada' },
  { texto: 'anotá eso para la planilla', para: false, completo: true },
  { texto: 'cuántos equipos quedan por presentar', para: false, completo: true },
  { texto: 'Juan vení un segundo', para: false, completo: true },
  { texto: 'le preguntamos algo a Roberto', para: false, completo: true, nota: 'hablan de Roberto' },
  // Ruido
  { texto: 'eh', para: false, completo: false },
  { texto: 'sí sí', para: false, completo: false },
  { texto: 'mm bueno', para: false, completo: false },
  { texto: 'ajá', para: false, completo: false },
  { texto: 'la la la', para: false, completo: false },
]
