// Proveedor real con key directa de Anthropic. Lee ANTHROPIC_API_KEY del entorno.
import Anthropic from '@anthropic-ai/sdk'
import { ESQUEMA_RESPUESTA, MAX_TOKENS } from './esquema.ts'
import type { Proveedor } from './tipos.ts'

export const MODELO_ANTHROPIC = 'claude-haiku-5-5'

export function crearProveedorAnthropic(modelo = MODELO_ANTHROPIC): Proveedor {
  const cliente = new Anthropic()
  return {
    nombre: `anthropic:${modelo}`,
    async generar({ sistema, usuario }) {
      const mensaje = await cliente.messages.create({
        model: modelo,
        max_tokens: MAX_TOKENS,
        system: sistema,
        messages: [{ role: 'user', content: usuario }],
        output_config: { format: { type: 'json_schema', schema: ESQUEMA_RESPUESTA as never } },
      })
      return mensaje.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    },
  }
}
