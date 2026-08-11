'use client'

import { useRef, useState } from 'react'
import { Camera, Upload, X, Image } from 'lucide-react'

const MAX_BYTES = 2 * 1024 * 1024  // 2 MB
const QUALITY   = 0.7
const MAX_DIM   = 1920

interface PhotoCaptureProps {
  onCapture: (blob: Blob, previewUrl: string) => void
  onClear?: () => void
  label?: string
  disabled?: boolean
}

export function PhotoCapture({ onCapture, onClear, label = 'Foto', disabled = false }: PhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setCompressing(true)
    const blob = await compressImage(file)
    const url = URL.createObjectURL(blob)
    setPreview(url)
    onCapture(blob, url)
    setCompressing(false)

    // Reset input so the same file can be re-selected after clearing
    e.target.value = ''
  }

  function handleClear() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    onClear?.()
  }

  if (preview) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-gray-200">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="Vista previa" className="w-full object-cover max-h-64" />
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
          aria-label="Eliminar foto"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        disabled={disabled || compressing}
        className="sr-only"
        id="photo-capture-input"
      />

      <div className="flex gap-2">
        {/* Camera button (mobile: opens camera) */}
        <label
          htmlFor="photo-capture-input"
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
            disabled || compressing
              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
              : 'border-blue-300 text-blue-600 hover:border-blue-500 hover:bg-blue-50/30'
          }`}
        >
          {compressing ? (
            <>
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Comprimiendo…</span>
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
            </>
          )}
        </label>

        {/* Gallery fallback (desktop / file picker) */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || compressing}
          className="px-3.5 py-3.5 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors disabled:cursor-not-allowed"
          aria-label="Seleccionar desde galería"
          title="Seleccionar archivo"
        >
          <Upload className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[10px] text-gray-400 text-center">
        Máx. 2 MB · JPEG o PNG
      </p>
    </div>
  )
}

// ── Canvas compression ────────────────────────────────────────────

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height)
        width  = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('canvas context')); return }

      ctx.drawImage(img, 0, 0, width, height)

      // Try quality 0.7 first; step down if still > MAX_BYTES
      tryCompress(canvas, QUALITY, resolve, reject)
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('image load failed'))
    }

    img.src = objectUrl
  })
}

function tryCompress(
  canvas: HTMLCanvasElement,
  quality: number,
  resolve: (b: Blob) => void,
  reject: (e: Error) => void,
): void {
  canvas.toBlob(
    (blob) => {
      if (!blob) { reject(new Error('toBlob failed')); return }
      if (blob.size <= MAX_BYTES || quality <= 0.2) {
        resolve(blob)
      } else {
        tryCompress(canvas, quality - 0.1, resolve, reject)
      }
    },
    'image/jpeg',
    quality,
  )
}
