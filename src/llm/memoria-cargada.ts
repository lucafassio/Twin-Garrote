// Memoria cargada para medir latencia (#41): la de un Roberto con un mes de uso. Tiene todo lo que
// entra al prompt de opciones a la vez: huella aprendida aceptada, bloques de dia, semana y mes,
// conversaciones de hoy (enteras y recortadas), hechos con saliencia y frases de estilo.
// Las fechas salen de `ahora`: los bloques caen siempre en ayer, la semana y el mes anteriores.
import type { Bloque, EjemploEstilo, Hecho, Memoria, ResumenConversacion } from './tipos.ts'
import { enArgentina, periodoAnterior, type Corte } from './periodos.ts'

const HORA = 3_600_000
const DIA = 24 * HORA

type HechoSemilla = [texto: string, importancia: number, intimo: boolean, diasAtras: number, saliencia?: number]

const HECHOS: HechoSemilla[] = [
  ['Su nieto Tomas nacio en octubre, es hijo de Laura', 7, true, 20, 2],
  ['Marta lo acompana a todas las consultas medicas', 7, true, 25],
  ['Estuvo internado tres dias en octubre por una neumonia', 8, true, 22],
  ['Es hincha fanatico de River desde chico', 6, false, 30, 1.75],
  ['Le dice "la Flaca" a Marta', 6, true, 15, 1.5],
  ['Laura viene los sabados con los chicos', 6, true, 10, 1.25],
  ['Le gustan las facturas de dulce de leche', 5, false, 12, 1.5],
  ['Trabajo 30 anos como tornero en una fabrica de Avellaneda', 5, false, 30],
  ['Le cuesta tragar los liquidos, los toma con espesante', 7, true, 8],
  ['Usa la silla de ruedas para salir a la vereda', 5, true, 18],
  ['Juan, su hijo, vive en Cordoba y llama los domingos', 6, true, 28],
  ['No le gusta que le hablen como a un chico', 7, false, 26],
  ['Escucha la radio a la tarde, sobre todo programas de tango', 4, false, 14],
  ['Su kinesiologo se llama Pablo y viene martes y jueves', 5, true, 9],
  ['Prefiere el mate amargo, aunque ahora lo toma con espesante', 4, false, 11],
  ['Toma riluzol dos veces por dia', 6, true, 21],
  ['Se enoja cuando River pierde el clasico', 3, false, 6],
  ['Le gustaba arreglar relojes viejos en el taller del fondo', 4, false, 29],
  ['Su perro se llama Toby y duerme al lado de la cama', 4, false, 16],
  ['Mira los partidos con su vecino Ruben', 4, false, 7],
  ['Laura es enfermera en el Hospital Italiano', 5, true, 24],
  ['En la internacion le pusieron una sonda por unos dias', 6, true, 21],
  ['Le gusta que le lean el diario a la manana', 4, false, 13],
  ['Quiere ir a ver a River a la cancha una vez mas', 6, false, 5],
  ['La neumologa es la doctora Gomez', 5, true, 19],
  ['Duerme mejor con la ventana un poco abierta', 3, false, 4],
  ['Le cuesta mas hablar a la noche, cuando esta cansado', 6, true, 3],
  ['Tomas tiene los ojos de Laura, dice Marta', 3, true, 2],
]

function hechos(ahora: Date): Hecho[] {
  return HECHOS.map(([texto, importancia, intimo, diasAtras, saliencia], i) => ({
    id: `hc-${i + 1}`,
    tipo: 'estable',
    texto,
    origen: i % 3 === 0 ? 'familia' : 'interlocutor',
    interlocutor: null,
    importancia,
    fecha: new Date(ahora.getTime() - diasAtras * DIA).toISOString(),
    estado: 'activo',
    fechaInvalidacion: null,
    intimo,
    ...(saliencia ? { saliencia, ultimoUso: new Date(ahora.getTime() - diasAtras * DIA).toISOString() } : {}),
  }))
}

// Tres de las ultimas 5 h (enteros) y tres de 5 a 12 h (solo la primera linea).
const RESUMENES: [horasAtras: number, resumen: string][] = [
  [1, 'Marta le pregunto que queria almorzar y eligio milanesa con pure.\nsegunda linea reciente: pidio que la milanesa sea finita para poder tragarla.'],
  [3, 'Ruben paso a comentar el partido de River del miercoles.\nsegunda linea reciente: quedaron en verlo juntos el domingo.'],
  [4.5, 'Pablo, el kinesiologo, hizo la sesion y le pregunto como dormia.\nsegunda linea reciente: dijo que se desperto dos veces por la tos.'],
  [6, 'Laura llamo para avisar que el sabado viene con Tomas.\nsegunda linea vieja: Roberto pidio que traiga facturas.'],
  [9, 'Marta le leyo el diario y hablaron del aumento de los remedios.\nsegunda linea vieja: Roberto dijo que no se preocupe por la plata.'],
  [11, 'Juan llamo desde Cordoba antes de entrar al trabajo.\nsegunda linea vieja: le conto que el nene empezo natacion.'],
]

function resumenes(ahora: Date): ResumenConversacion[] {
  return RESUMENES.map(([horasAtras, resumen], i) => {
    const fin = new Date(ahora.getTime() - horasAtras * HORA)
    return {
      id: `rc-${i + 1}`,
      inicio: new Date(fin.getTime() - 20 * 60_000).toISOString(),
      fin: fin.toISOString(),
      resumen,
    }
  })
}

const TEXTOS_BLOQUE: Record<Corte, string> = {
  dia: 'Dia tranquilo. A la manana Marta le leyo el diario y hablaron de la visita de Laura del sabado; Roberto pidio facturas de dulce de leche. Pablo vino a la tarde para la sesion de kinesiologia y noto que le costo mas tragar el agua, asi que siguen con espesante. A la noche miro el partido de River con Ruben y estaba de buen humor porque ganaron. Se canso temprano y le costo hablar despues de las diez.',
  semana:
    'Semana con mucha visita. Laura vino el sabado con los chicos y con Tomas, que ya tiene tres semanas; Roberto lo tuvo en brazos un rato con ayuda de Marta. Juan llamo el domingo desde Cordoba y hablaron de River. El martes y el jueves hizo kinesiologia con Pablo. La doctora Gomez ajusto el espesante porque tosio en dos comidas. Roberto pidio varias veces que no le hablen como a un chico y empezo a decirle "la Flaca" a Marta delante de todos. Quiere ir a la cancha a ver a River antes de fin de ano.',
  mes: 'Octubre fue un mes de cambios grandes. El 4 de octubre nacio Tomas, el primer nieto, hijo de Laura. A mediados de mes Roberto estuvo internado tres dias en el Hospital Italiano por una neumonia; le pusieron una sonda unos dias y volvio a casa el 17. Desde entonces toma los liquidos con espesante y la doctora Gomez lo controla cada dos semanas. Marta lo acompana a todas las consultas. Retomo la kinesiologia con Pablo martes y jueves. Siguio con la radio de tango a la tarde y los partidos de River con Ruben. Juan llama los domingos desde Cordoba.',
}

// Las fuentes de cada bloque, como las dejaria el rollup: resumenes, bloques de abajo y hechos.
const FUENTES_BLOQUE: Record<Corte, (dia: string, semana: string) => string[]> = {
  dia: () => ['rc-4', 'rc-5', 'hc-6', 'hc-7', 'hc-9', 'hc-14', 'hc-20'],
  semana: (dia) => [dia, 'hc-1', 'hc-5', 'hc-6', 'hc-11', 'hc-12', 'hc-24'],
  mes: (_dia, semana) => [semana, 'hc-1', 'hc-2', 'hc-3', 'hc-9', 'hc-16', 'hc-22', 'hc-25'],
}

function bloques(ahora: Date): Memoria['niveles'] {
  const idDe = (c: Corte) => `${c}-${enArgentina(periodoAnterior(c, ahora).desde).slice(0, 10)}`
  const ids: Record<Corte, string> = { dia: idDe('dia'), semana: idDe('semana'), mes: idDe('mes') }
  const bloque = (corte: Corte): Bloque => {
    const p = periodoAnterior(corte, ahora)
    return {
      id: ids[corte],
      desde: p.desde.toISOString(),
      hasta: p.hasta.toISOString(),
      texto: TEXTOS_BLOQUE[corte],
      fuentes: FUENTES_BLOQUE[corte](ids.dia, ids.semana),
    }
  }
  return { dia: [bloque('dia')], semana: [bloque('semana')], mes: [bloque('mes')] }
}

const HUELLA_ACEPTADA = `- A Marta le dice "la Flaca", sobre todo cuando esta de buen humor.
- Su nieto Tomas (hijo de Laura, nacio en octubre) es tema de cada charla con la familia: le gusta que le cuenten novedades y que le muestren fotos.
- Habla corto y directo, con ironia. Usa "che", "dale" y "ni loco". Cuando algo le molesta dice "no me tengas lastima".
- No quiere que le hablen como a un chico ni que decidan por el: prefiere que le pregunten aunque tarde en responder.
- Despues de la internacion de octubre le preocupa tragar: prefiere comidas blandas (pure, milanesa finita, flan) y toma todo con espesante.
- River es su tema de charla con Ruben y con Juan; el clasico lo pone nervioso y no le gusta hablar de una derrota.
- A la tarde escucha tango en la radio y a veces pide un tema de Troilo.
- Con los medicos es respetuoso y va al grano; pregunta por los remedios y cuanto cuestan.
- A la noche se cansa: las respuestas cortas le alcanzan.`

const FRASES: [texto: string, origen: EjemploEstilo['origen']][] = [
  ['ni loco, che', 'deletreo'],
  ['traeme a Tomas', 'deletreo'],
  ['Flaca, no te preocupes', 'deletreo'],
  ['dale, pero despues', 'deletreo'],
  ['Si, dale, me encanta.', 'opcion'],
  ['No me tengas lastima.', 'opcion'],
  ['¿Gano River?', 'opcion'],
  ['Estoy cansado, sigamos manana.', 'opcion'],
  ['Prefiero algo blando.', 'opcion'],
  ['Contame de los chicos.', 'opcion'],
]

export function memoriaCargada(ahora: Date): Memoria {
  return {
    hechos: hechos(ahora),
    resumenes: resumenes(ahora),
    ejemplosEstilo: FRASES.map(([texto, origen], i) => ({
      texto,
      origen,
      fecha: new Date(ahora.getTime() - (i + 1) * DIA).toISOString(),
    })),
    conversacion: null,
    niveles: bloques(ahora),
    huellaAprendida: {
      aceptada: {
        texto: HUELLA_ACEPTADA,
        fuentes: ['hc-1', 'hc-5', 'hc-12', 'hc-3', 'hc-4', 'frases'],
        fechaAceptacion: new Date(ahora.getTime() - 3 * DIA).toISOString(),
      },
    },
  }
}
