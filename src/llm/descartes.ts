// Invalidar un hecho descarta lo que lo cita (#40). Nada de lo que se armo a partir de un hecho
// invalidado a mano sigue dando vueltas:
// - los bloques de dia, semana y mes que lo citan (directo, por el resumen de su conversacion o por
//   un bloque de abajo que lo cita) se descartan y se rehacen en el proximo cierre o con
//   "Consolidar ahora" (ver niveles.ts);
// - la propuesta de huella pendiente que lo cita se descarta y se vuelve a pedir (ver huella.ts);
// - la huella aceptada que lo cita no se borra sola: queda para revisar hasta que la familia la
//   vuelva a aceptar o la descarte.
// Todo sale de las fuentes, no del modelo. Nada se borra: queda la fecha del descarte.
import { idResumen, nivelesDe } from './niveles.ts'
import type { Memoria } from './tipos.ts'

// Marca en `memoria` (la cambia) todo lo que cita alguno de `ids` con la fecha `iso`. Los bloques
// descartados contaminan a los que los citan, nivel por nivel, hasta que no cambia nada.
export function descartarLoQueCita(memoria: Memoria, ids: string[], iso: string): void {
  const citados = new Set(ids)
  const cita = (fuentes: string[]) => fuentes.some((f) => citados.has(f))
  const niveles = nivelesDe(memoria)
  const bloques = [...niveles.dia, ...niveles.semana, ...niveles.mes]
  let cambio = true
  while (cambio) {
    cambio = false
    for (const b of bloques) {
      if (citados.has(b.id) || !cita(b.fuentes)) continue
      citados.add(b.id)
      b.descartado ??= iso
      cambio = true
    }
  }

  const huella = memoria.huellaAprendida
  if (huella?.propuesta && cita(huella.propuesta.fuentes)) huella.propuesta.descartado ??= iso
  if (huella?.aceptada && cita(huella.aceptada.fuentes)) huella.aceptada.paraRevisar ??= iso
}

// Los ids de lo que se invalido o descarto entre dos lecturas de la memoria. Un rollup que corrio
// mientras tanto se armo con eso: si vio alguno, lo que armo se guarda descartado.
export function dejaronDeValer(antes: Memoria, despues: Memoria): Set<string> {
  const ids = new Set<string>()
  const activos = new Set(antes.hechos.filter((h) => h.estado === 'activo').map((h) => h.id))
  for (const h of despues.hechos) if (h.estado === 'invalidado' && activos.has(h.id)) ids.add(h.id)
  const vigentes = new Set(antes.resumenes.filter((r) => !r.descartado).map(idResumen))
  for (const r of despues.resumenes) if (r.descartado && vigentes.has(idResumen(r))) ids.add(idResumen(r))
  const deAntes = nivelesDe(antes)
  const bloquesVigentes = new Set([...deAntes.dia, ...deAntes.semana, ...deAntes.mes].filter((b) => !b.descartado).map((b) => b.id))
  const deDespues = nivelesDe(despues)
  for (const b of [...deDespues.dia, ...deDespues.semana, ...deDespues.mes]) {
    if (b.descartado && bloquesVigentes.has(b.id)) ids.add(b.id)
  }
  return ids
}
