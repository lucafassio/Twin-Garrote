'use client'

import { useState } from 'react'
import type { Opcion, PedidoOpciones } from '@/eventos'
import { completarFrase, esPedidoCancelado, pedirOpciones } from '@/llm/cliente'

// Bloque de prueba del corte de pedidos viejos (#23). Usa el cliente real (pedirOpciones y completarFrase):
// turnos seguidos rapido y letras rapidas. En pantalla nunca tiene que quedar una respuesta vieja.

const TURNOS_SEGUIDOS = ['¿Tenés hambre?', '¿Querés agua?', '¿Te abro la ventana?']
const DELETREO = 'tengo frío'
const PAUSA_MS = 250

type Estado = 'ok' | 'cancelado' | 'falla'
type Medicion = { n: number; tipo: 'opciones' | 'completado'; enviado: string; estado: Estado; resultado: string; ms: number }

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function PruebaCorte({ pedido }: { pedido: PedidoOpciones }) {
  const [registro, setRegistro] = useState<Medicion[]>([])
  const [enPantalla, setEnPantalla] = useState<{ turno: string; opciones: Opcion[] } | null>(null)
  const [prefijo, setPrefijo] = useState('')
  const [frase, setFrase] = useState('')

  const anotar = (m: Omit<Medicion, 'n'>) => setRegistro((r) => [{ ...m, n: r.length + 1 }, ...r])

  function pedir(turno: string) {
    const inicio = performance.now()
    pedirOpciones({ ...pedido, ultimoTurno: turno, yaMostradas: [] }).then(
      (o) => {
        setEnPantalla({ turno, opciones: o })
        anotar({ tipo: 'opciones', enviado: turno, estado: 'ok', resultado: o.map((x) => x.texto).join(' | '), ms: ms(inicio) })
      },
      (error) =>
        anotar({
          tipo: 'opciones',
          enviado: turno,
          estado: esPedidoCancelado(error) ? 'cancelado' : 'falla',
          resultado: esPedidoCancelado(error) ? '' : (error instanceof Error ? error.message : String(error)),
          ms: ms(inicio),
        }),
    )
  }

  function completar(p: string) {
    setPrefijo(p)
    const inicio = performance.now()
    completarFrase(p, pedido).then((f) => {
      setFrase(f)
      anotar({ tipo: 'completado', enviado: p, estado: 'ok', resultado: f, ms: ms(inicio) })
    })
  }

  async function turnosSeguidos() {
    for (const turno of TURNOS_SEGUIDOS) {
      pedir(turno)
      await esperar(PAUSA_MS)
    }
  }

  async function letrasRapidas() {
    for (let i = 1; i <= DELETREO.length; i++) {
      completar(DELETREO.slice(0, i))
      await esperar(PAUSA_MS / 2)
    }
  }

  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="text-2xl font-bold">Corte de pedidos viejos</h2>
      <p className="text-sm opacity-70">
        Usa el cliente real. Al terminar, las opciones tienen que ser las de «{TURNOS_SEGUIDOS.at(-1)}» y el completado
        el de «{DELETREO}». Los pedidos viejos de opciones salen como «cancelado», no como falla.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="rounded border px-3 py-1" onClick={turnosSeguidos}>
          {TURNOS_SEGUIDOS.length} turnos seguidos
        </button>
        <button className="rounded border px-3 py-1" onClick={letrasRapidas}>
          Letras rápidas: «{DELETREO}»
        </button>
        <input
          className="flex-1 rounded border bg-transparent p-1"
          placeholder="o deletreá a mano"
          value={prefijo}
          onChange={(e) => completar(e.target.value)}
        />
      </div>
      {enPantalla && (
        <p>
          <span className="text-sm opacity-70">Opciones de «{enPantalla.turno}»:</span>{' '}
          {enPantalla.opciones.map((o) => o.texto).join(' | ')}
        </p>
      )}
      {frase && (
        <p>
          <span className="text-sm opacity-70">Completado:</span> <span className="font-semibold">{frase}</span>
        </p>
      )}
      {registro.length > 0 && (
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>#</th>
              <th>Tipo</th>
              <th>Enviado</th>
              <th>Estado</th>
              <th>Resultado</th>
              <th>ms</th>
            </tr>
          </thead>
          <tbody>
            {registro.map((m) => (
              <tr key={m.n} className={m.estado === 'cancelado' ? 'opacity-50' : m.estado === 'falla' ? 'text-red-600' : ''}>
                <td>{m.n}</td>
                <td>{m.tipo}</td>
                <td>{m.enviado}</td>
                <td>{m.estado}</td>
                <td>{m.resultado}</td>
                <td>{m.ms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

const ms = (inicio: number) => Math.round(performance.now() - inicio)
