// Tipos del path llm: proveedor, almacen (perfil + memoria) y hechos.
import type { Cercania, LineaHistorial, Opcion } from '@/eventos'

// --- Proveedor ---------------------------------------------------------------

// Un modelo de lenguaje inyectable: recibe el prompt de sistema y el contenido, devuelve texto.
export type Proveedor = {
  nombre: string
  generar(prompt: { sistema: string; usuario: string }): Promise<string>
}

// --- Huella y memoria --------------------------------------------------------

// De donde salio un hecho. 'familia' = lo cargo un familiar: dicho *sobre* el usuario.
export type OrigenHecho = 'deletreo' | 'opcion' | 'fija' | 'interlocutor' | 'familia'

export type Hecho = {
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
}

// La conversacion en curso, para detectar cuando empieza una nueva.
export type ConversacionActual = {
  inicio: string // ISO
  ultimaActividad: string // ISO del ultimo pedido de opciones
  desdeLinea: number // indice del historial donde empezo esta conversacion
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
}
