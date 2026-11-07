// Eleccion del proveedor por LLM_PROVEEDOR (gateway | anthropic | falso).
// Sin la key que hace falta, queda el falso: la app nunca se rompe por no tener claves.
import { crearProveedorAnthropic } from './proveedor-anthropic.ts'
import { crearProveedorFalso } from './proveedor-falso.ts'
import { crearProveedorGateway } from './proveedor-gateway.ts'
import type { Proveedor } from './tipos.ts'

export type NombreProveedor = 'gateway' | 'anthropic' | 'falso'

type Entorno = Record<string, string | undefined>

export function nombreProveedor(env: Entorno = process.env): NombreProveedor {
  const pedido = env.LLM_PROVEEDOR?.trim().toLowerCase()
  const hayGateway = Boolean(env.AI_GATEWAY_API_KEY)
  const hayAnthropic = Boolean(env.ANTHROPIC_API_KEY)
  if (pedido === 'falso') return 'falso'
  if (pedido === 'gateway') return hayGateway ? 'gateway' : 'falso'
  if (pedido === 'anthropic') return hayAnthropic ? 'anthropic' : 'falso'
  // Sin LLM_PROVEEDOR: el primero que tenga key.
  if (hayGateway) return 'gateway'
  if (hayAnthropic) return 'anthropic'
  return 'falso'
}

export function elegirProveedor(env: Entorno = process.env): Proveedor {
  switch (nombreProveedor(env)) {
    case 'gateway':
      return crearProveedorGateway(env.LLM_MODELO || undefined)
    case 'anthropic':
      return crearProveedorAnthropic(env.LLM_MODELO || undefined)
    default:
      return crearProveedorFalso()
  }
}
