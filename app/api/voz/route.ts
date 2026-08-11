import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import Groq from 'groq-sdk'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  const formData = await request.formData()
  const audio = formData.get('audio') as File | null
  const mimeType = formData.get('mimeType') as string | null
  const localId = formData.get('local_id') as string | null
  const language = (formData.get('language') as string) || 'es'

  if (!audio || !mimeType || !localId) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  if (audio.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'AUDIO_TOO_LARGE', message: 'Máximo 25MB' }, { status: 422 })
  }

  if (audio.size < 1024) {
    return NextResponse.json({ error: 'AUDIO_TOO_SHORT', message: 'El audio debe tener al menos 0.5 segundos' }, { status: 422 })
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

    // Preserve original mimeType — Groq accepts webm/opus and mp4/aac directly
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([audio], `audio.${ext}`, { type: mimeType })

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: 'whisper-large-v3-turbo',
      language,
    })

    return NextResponse.json({
      local_id: localId,
      transcription: transcription.text,
      language,
    })
  } catch (err) {
    console.error('[api/voz] Groq error:', err)
    return NextResponse.json(
      { error: 'GROQ_UNAVAILABLE', message: 'Servicio de transcripción no disponible. El audio quedó en cola.', queued: true },
      { status: 502 }
    )
  }
}
