// Path voz: transcribe una frase del interlocutor con Whisper en Groq (motor "groq" de src/voz).
// Clave en .env: GROQ_API_KEY. Modelo opcional: GROQ_MODELO_TRANSCRIPCION.
// GET  -> { disponible } (si hay clave, para elegir motor sin perder la primera frase).
// POST -> cuerpo audio/wav de una frase; devuelve { texto } ('' si era ruido o alucinacion).

const MODELO = process.env.GROQ_MODELO_TRANSCRIPCION || 'whisper-large-v3-turbo'
const SIN_HABLA = 0.6 // segmentos con mas probabilidad de "no hay habla" se descartan

// Frases que Whisper inventa en espanol cuando escucha ruido o silencio.
const ALUCINACIONES = /amara\.org|subt[ií]tul|suscr[ií]b|gracias por ver|\bm[uú]sica\b|^\W*gracias\W*$/i

type Segmento = { text: string; no_speech_prob?: number }

export async function GET() {
  return Response.json({ disponible: Boolean(process.env.GROQ_API_KEY) })
}

export async function POST(request: Request) {
  if (!process.env.GROQ_API_KEY) return Response.json({ error: 'falta GROQ_API_KEY' }, { status: 503 })
  const audio = await request.arrayBuffer()
  if (!audio.byteLength) return Response.json({ error: 'falta audio' }, { status: 400 })

  const form = new FormData()
  form.append('file', new Blob([audio], { type: 'audio/wav' }), 'frase.wav')
  form.append('model', MODELO)
  form.append('language', 'es')
  form.append('temperature', '0')
  form.append('response_format', 'verbose_json')

  const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  })
  if (!r.ok) return Response.json({ error: `groq ${r.status}: ${await r.text()}` }, { status: 502 })

  const datos = (await r.json()) as { text?: string; segments?: Segmento[] }
  const segmentos = datos.segments ?? [{ text: datos.text ?? '' }]
  const texto = segmentos
    .filter((s) => (s.no_speech_prob ?? 0) < SIN_HABLA)
    .map((s) => s.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return Response.json({ texto: ALUCINACIONES.test(texto) ? '' : texto })
}
