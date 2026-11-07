import type { LineaHistorial } from '@/eventos'
import type { LecturaTurno } from './tipos'

// Lector con modelo desde el navegador: llama a /api/lectura.
// Si falla, tira; el motor usa la heuristica local.
export async function leerTurnoRemoto(texto: string, historial: LineaHistorial[]): Promise<LecturaTurno> {
  const r = await fetch('/api/lectura', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto, historial }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d?.error ?? `HTTP ${r.status}`)
  return { paraUsuario: d.paraUsuario, completo: d.completo, tipo: d.tipo }
}
