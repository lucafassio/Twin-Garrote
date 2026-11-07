// Path voz: manda el aviso de urgencia al celular del contacto.
// Canales en .env.local: Telegram (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID) y/o ntfy.sh (NTFY_TOPIC).
// Recibe { texto }, devuelve { enviados: string[] }.

async function telegram(texto: string): Promise<string> {
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: texto }),
  })
  if (!r.ok) throw new Error(`telegram ${r.status}: ${await r.text()}`)
  return 'telegram'
}

async function ntfy(texto: string): Promise<string> {
  const r = await fetch(`https://ntfy.sh/${process.env.NTFY_TOPIC}`, {
    method: 'POST',
    headers: { Title: 'Parpadeo: urgencia', Priority: '5', Tags: 'rotating_light' },
    body: texto,
  })
  if (!r.ok) throw new Error(`ntfy ${r.status}`)
  return 'ntfy'
}

export async function POST(request: Request) {
  const { texto } = (await request.json().catch(() => ({}))) as { texto?: string }
  if (!texto) return Response.json({ error: 'falta texto' }, { status: 400 })

  const envios: Promise<string>[] = []
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) envios.push(telegram(texto))
  if (process.env.NTFY_TOPIC) envios.push(ntfy(texto))
  if (!envios.length) return Response.json({ error: 'sin canal configurado en .env.local' }, { status: 503 })

  const resultados = await Promise.allSettled(envios)
  const enviados = resultados.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))
  const errores = resultados.flatMap((r) => (r.status === 'rejected' ? [String(r.reason)] : []))
  if (errores.length) console.warn('urgencia:', errores)
  return Response.json({ enviados, errores }, { status: enviados.length ? 200 : 502 })
}
