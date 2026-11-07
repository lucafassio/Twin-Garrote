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
}

export type Memoria = {
  hechos: Hecho[]
  resumenes: ResumenConversacion[]
  ejemplosEstilo: EjemploEstilo[]
  conversacion: ConversacionActual | null
}

// Donde viven el perfil y la memoria. En la app: archivos. En tests: en memoria.
export type Almacen = {
  leerPerfil(): Promise<PerfilHuella>
  leerMemoria(): Promise<Memoria>
  guardarMemoria(memoria: Memoria): Promise<void>
}

// --- Resultado de opciones ---------------------------------------------------

export type Registro = 'formal' | 'casual' | 'intimo'

export type ResultadoOpciones = {
  opciones: Opcion[] // exactamente 4, la mas probable primero
  registro: Registro
  nuevaConversacion: boolean
}

// Lo que recibe el agente de memoria cuando se cierra una conversacion.
export type ConversacionCerrada = {
  inicio: string
  fin: string
  lineas: LineaHistorial[]
  cercania: Cercania | null
  interlocutor?: string | null // quien hablaba, si la interfaz lo aclaro
}
