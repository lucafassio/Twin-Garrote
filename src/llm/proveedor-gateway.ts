// Proveedor real por Vercel AI Gateway (AI SDK). Lee AI_GATEWAY_API_KEY del entorno.
import { generateText, jsonSchema, Output } from 'ai'
import { ESQUEMA_RESPUESTA, MAX_TOKENS } from './esquema.ts'
import type { Proveedor } from './tipos.ts'

export const MODELO_GATEWAY = 'anthropic/claude-haiku-5.5'

export function crearProveedorGateway(modelo = MODELO_GATEWAY): Proveedor {
  const esquemaOpciones = jsonSchema<unknown>(ESQUEMA_RESPUESTA as never)
  return {
    nombre: `gateway:${modelo}`,
    async generar({ sistema, usuario, salida }) {
      const esquema = salida ? jsonSchema<unknown>(salida.esquema as never) : esquemaOpciones
      try {
        const { output } = await generateText({
          model: modelo,
          system: sistema,
          prompt: usuario,
          maxOutputTokens: salida?.maxTokens ?? MAX_TOKENS,
          output: Output.object({ schema: esquema }),
        })
        return JSON.stringify(output)
      } catch (error) {
        // Si la salida no valida, devolvemos texto vacio: opciones.ts reintenta una vez.
        if (error instanceof Error && /NoObjectGenerated|No object generated/i.test(error.name + error.message)) {
          return ''
        }
        throw error
      }
    },
  }
}
