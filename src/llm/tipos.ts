// Tipos del path llm: proveedor, almacen (perfil + memoria) y hechos.
import type { Cercania, LineaHistorial, Opcion } from '@/eventos'

// --- Proveedor ---------------------------------------------------------------

// Un modelo de lenguaje inyectable: recibe el prompt de sistema y el contenido, devuelve texto.
export type Proveedor = {
  nombre: string
  generar(prompt: PromptProveedor): Promise<string>
}

export type PromptProveedor = {
  sistema: string
  usuario: string
  // Opcional: otra forma de salida que la de opciones (la usa el agente de memoria).
  // Sin esto, los proveedores reales piden el esquema de opciones.
  salida?: SalidaProveedor
}

export type SalidaProveedor = {
  nombre: string // 'opciones' | 'memoria'
  esquema: Record<string, unknown> // JSON Schema para la salida estructurada
  maxTokens: number
}

// --- Huella y memoria --------------------------------------------------------

// De donde salio un hecho. 'familia' = lo cargo un familiar: dicho *sobre* el usuario.
export type OrigenHecho = 'deletreo' | 'opcion' | 'fija' | 'interlocutor' | 'familia'

// estable: "Roberto es hincha de River", nunca vence. estado: "Laura esta de viaje", puede tener fin.
// evento: "Laura se opera el jueves", pasa en una fecha.
export type TipoHecho = 'estable' | 'estado' | 'evento'

// Los campos de tiempo son opcionales: una memoria vieja sin ellos se lee como siempre,
// y un hecho sin tipo se trata como estable. Vencer no es invalidar: un hecho vencido sigue
// 'activo'; el vencimiento se deriva de validoHasta y la hora (ver fechas.ts).
export type Hecho = {
  tipo?: TipoHecho
  expresionOriginal?: string // la expresion temporal tal como se dijo ("el jueves")
  fechaEvento?: string // YYYY-MM-DD, el dia del evento en Argentina; la calcula el codigo
  validoDesde?: string // ISO, desde cuando es cierto, si se sabe
  validoHasta?: string // ISO; el final del dia del evento, o del dia del "hasta" de un estado, en Argentina
  id: string
  texto: string
  origen: OrigenHecho
  interlocutor: string | null // quien estaba en la conversacion, si se sabe
  importancia: number // 1 a 10
  fecha: string // ISO
  estado: 'activo' | 'invalidado'
  fechaInvalidacion: string | null // ISO; un hecho invalidado no se borra
  intimo: boolean // salud, familia, plata...: nunca con cercania formal
  reemplazaA?: string // id del hecho que este actualizo (el viejo queda invalidado, con su historia)
  // Saliencia (#36): cuanto pesa por haberse usado en opciones elegidas. Arranca en 1 y sube hasta un
  // tope; una memoria vieja sin estos campos se lee como saliencia 1 y sin uso.
  saliencia?: number
  ultimoUso?: string // ISO de la ultima vez que se eligio una opcion que lo usaba
}

// El perfil que carga la familia en el onboarding. El aprendizaje nunca lo reescribe.
export type PerfilHuella = {
  origen: 'familia'
  markdown: string
}

// Frase real del usuario usada como ejemplo de estilo. Lo deletreado pesa mas que lo elegido.
export type EjemploEstilo = {
  texto: string
  origen: 'deletreo' | 'opcion'
  fecha: string // ISO
}

// Resumen de 2 o 3 lineas de una conversacion cerrada (memoria corta).
export type ResumenConversacion = {
  // Para citarlo como fuente de un bloque. Uno viejo sin id usa el derivado del fin (idResumen en niveles.ts).
  id?: string
  inicio: string // ISO
  fin: string // ISO
  resumen: string
  // ISO. Se descarta (no se borra) cuando se invalida a mano un hecho de esa conversacion:
  // si no, el resumen seguiria contando lo invalidado. Opciones no usa los descartados.
  descartado?: string
}

// La conversacion en curso, para detectar cuando empieza una nueva y para cerrarla con lo suyo.
// cercania, interlocutor y lineas son opcionales: una memoria vieja sin ellos se sigue leyendo.
export type ConversacionActual = {
  inicio: string // ISO
  ultimaActividad: string // ISO del ultimo pedido de opciones
  // Indice del historial del cliente desde donde vienen las lineas de esta conversacion. Al abrirse,
  // donde empezo; despues de una recarga (historial mas corto), se corre al final del historial nuevo.
  desdeLinea: number
  // La del pedido que la abrio; la reemplaza un pedido posterior que traiga una aclarada.
  cercania?: Cercania | null
  // Igual que la cercania.
  interlocutor?: string | null
  // Las lineas de esta conversacion guardadas en el servidor: una recarga del cliente no las pierde.
  lineas?: LineaHistorial[]
  // El ultimo turno del interlocutor (ultimoTurno del ultimo pedido): entra al historial recien con
  // el pedido siguiente. Si la conversacion se cierra antes (por tiempo), se suma al cerrarla.
  turnoPendiente?: string | null
  // Las ultimas opciones mostradas, la mas nueva primero, con los ids de los hechos que uso cada una:
  // al elegir una, se buscan sus hechos aca. Se guardan varias vueltas: un pedido cancelado que termina
  // tarde en el servidor no borra las que estan en pantalla.
  mostradas?: OpcionMostrada[]
}

export type OpcionMostrada = { texto: string; hechos: string[] }

// Resumen de un periodo cerrado (dia, semana o mes), armado en segundo plano. Cita de que salio.
export type Bloque = {
  id: string // 'dia-2026-11-06': nivel y fecha de inicio en Argentina
  desde: string // ISO, incluido
  hasta: string // ISO, excluido
  texto: string
  // Ids de lo que lo origino: resumenes, bloques del nivel de abajo y hechos.
  // De aca se deriva si cita algo intimo, no del modelo.
  fuentes: string[]
  descartado?: string // ISO
}

export type Niveles = { dia: Bloque[]; semana: Bloque[]; mes: Bloque[] }

// Cada rollup en segundo plano tiene su modelo, elegido por configuracion.
export type NivelRollup = 'dia' | 'semana' | 'mes' | 'huella'

// Huella aprendida (#38): lo que el sistema aprendio del usuario (gustos, personas y como las llama,
// forma de hablar, temas a evitar), propuesto en segundo plano y aceptado o descartado por la familia.
// Nunca toca la huella base (el perfil): va al lado, marcada como aprendida. Todo opcional.
export type PropuestaHuella = {
  texto: string
  fuentes: string[] // ids de bloques y hechos ('frases' = los ejemplos de estilo)
  fecha: string // ISO
}

export type HuellaAceptada = {
  texto: string // a lo sumo TOPE_HUELLA caracteres
  fuentes: string[]
  fechaAceptacion: string // ISO
}

export type HuellaAprendida = {
  propuesta?: PropuestaHuella // pendiente: no entra al prompt
  aceptada?: HuellaAceptada // la unica que entra al prompt
  descartadas?: string[] // textos descartados: no se vuelven a proponer iguales
  ultimaPropuesta?: string // ISO de la ultima propuesta pedida con exito: una por corte de mes
}

export type Memoria = {
  hechos: Hecho[]
  resumenes: ResumenConversacion[]
  ejemplosEstilo: EjemploEstilo[]
  conversacion: ConversacionActual | null
  // La ultima conversacion cerrada por tiempo, con las lineas que se aprendieron. Su cola (la
  // respuesta al ultimo turno) llega recien con el pedido siguiente: ese pedido la completa y la borra.
  cerradaPorTiempo?: ConversacionActual
  // Opcional: una memoria vieja sin niveles se lee como siempre.
  niveles?: Niveles
  // Opcional: una memoria vieja sin huella aprendida se lee como siempre.
  huellaAprendida?: HuellaAprendida
}

// Donde viven el perfil y la memoria. En la app: archivos. En tests: en memoria.
export type Almacen = {
  leerPerfil(): Promise<PerfilHuella>
  leerMemoria(): Promise<Memoria>
  guardarMemoria(memoria: Memoria): Promise<void>
}

// --- Resultado de opciones ---------------------------------------------------

export type Registro = 'formal' | 'casual' | 'intimo'
export const REGISTROS: Registro[] = ['formal', 'casual', 'intimo']

// Que tan seguro esta el modelo del interlocutor probable. No es la cercania.
export type Confianza = 'alta' | 'media' | 'baja'
export const CONFIANZAS: Confianza[] = ['alta', 'media', 'baja']

// Quien habla probablemente, segun el modelo (#46). nombre: una persona de la huella (validado por
// codigo, nunca el usuario) o 'desconocido'. Es solo una propuesta para el chip "¿Habla Laura?": sin
// confirmar no se usa para nombrar ni para atribuir hechos. Confirmado, viaja en
// PedidoOpciones.interlocutor.
export type InterlocutorProbable = { nombre: string; confianza: Confianza }

export const INTERLOCUTOR_DESCONOCIDO = 'desconocido'
// Lo que queda cuando no hay un nombre valido: sin campo, fuera de la huella o el del usuario.
export const SIN_INTERLOCUTOR_PROBABLE: InterlocutorProbable = { nombre: INTERLOCUTOR_DESCONOCIDO, confianza: 'baja' }

export type ResultadoOpciones = {
  opciones: Opcion[] // exactamente 4, la mas probable primero
  registro: Registro
  nuevaConversacion: boolean
  interlocutorProbable: InterlocutorProbable
}

// Lo que recibe el agente de memoria cuando se cierra una conversacion.
export type ConversacionCerrada = {
  inicio: string
  fin: string
  lineas: LineaHistorial[]
  cercania: Cercania | null
  interlocutor?: string | null // quien hablaba, si la interfaz lo aclaro
  // Si es la cola de una conversacion cerrada por tiempo: las primeras yaAprendidas lineas ya se
  // aprendieron y van solo como contexto.
  yaAprendidas?: number
}
