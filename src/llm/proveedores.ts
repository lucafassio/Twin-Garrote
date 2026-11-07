// Eleccion del proveedor por LLM_PROVEEDOR (gateway | anthropic | falso).
// Sin la key que hace falta, queda el falso: la app nunca se rompe por no tener claves.
import { crearProveedorAnthropic, MODELO_ANTHROPIC } from './proveedor-anthropic.ts'
import { crearProveedorFalso } from './proveedor-falso.ts'
import { crearProveedorGateway, MODELO_GATEWAY } from './proveedor-gateway.ts'
import type { NivelRollup, Proveedor } from './tipos.ts'

export type NombreProveedor = 'gateway' | 'anthropic' | 'falso'

type Entorno = Record<string, string | undefined>

export function nombreProveedor(env: Entorno = process.env): NombreProveedor {
  const pedido = env.LLM_PROVEEDOR?.trim().toLowerCase()
  const hayGateway = Boolean(env.AI_GATEWAY_API_KEY)
  const hayAnthropic = Boolean(env.ANTHROPIC_API_KEY)
  if (pedido === 'falso') return 'falso'
  if (pedido === 'gateway') return hayGateway ? 'gateway' : 'falso'
  if (pedido === 'anthropic') return hayAnthropic ? 'anthropic' : 'falso'
  // Sin LLM_PROVEEDOR: el primero que tenga key. El AI Gateway va primero: es el proveedor
  // elegido (ya tiene creditos y da acceso a Haiku y a los modelos de decision). Anthropic directo queda de respaldo.
  if (hayGateway) return 'gateway'
  if (hayAnthropic) return 'anthropic'
  return 'falso'
}

export function elegirProveedor(env: Entorno = process.env, modelo = env.LLM_MODELO || undefined): Proveedor {
  switch (nombreProveedor(env)) {
    case 'gateway':
      return crearProveedorGateway(modelo)
    case 'anthropic':
      return crearProveedorAnthropic(modelo)
    default:
      return crearProveedorFalso()
  }
}

// --- Rollups de los niveles de memoria -----------------------------------------
// Cada uno con su modelo: Haiku para dia y semana, Sonnet para mes y la propuesta de huella.
// Se cambia con LLM_MODELO_DIA, LLM_MODELO_SEMANA, LLM_MODELO_MES y LLM_MODELO_HUELLA:
// 'haiku', 'sonnet' o el id completo del modelo para el proveedor elegido.

type Alias = 'haiku' | 'sonnet'

const MODELO_POR_DEFECTO: Record<NivelRollup, Alias> = { dia: 'haiku', semana: 'haiku', mes: 'sonnet', huella: 'sonnet' }

const IDS: Record<'gateway' | 'anthropic', Record<Alias, string>> = {
  gateway: { haiku: MODELO_GATEWAY, sonnet: 'anthropic/claude-sonnet-5.5' },
  anthropic: { haiku: MODELO_ANTHROPIC, sonnet: 'claude-sonnet-5-5' },
}

export function modeloRollup(nivel: NivelRollup, env: Entorno = process.env): string {
  const pedido = env[`LLM_MODELO_${nivel.toUpperCase()}`]?.trim() || MODELO_POR_DEFECTO[nivel]
  const proveedor = nombreProveedor(env)
  if (proveedor === 'falso') return 'falso'
  return pedido === 'haiku' || pedido === 'sonnet' ? IDS[proveedor][pedido] : pedido
}

export function elegirProveedorRollup(nivel: NivelRollup, env: Entorno = process.env): Proveedor {
  return elegirProveedor(env, modeloRollup(nivel, env))
}
