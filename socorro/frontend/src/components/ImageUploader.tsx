import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImagePlus, Loader2, Trash2, Camera, AlertCircle } from 'lucide-react'
import { uploadsApi } from '../api'

/**
 * Dropzone de imagem com pré-visualização, upload automatório e remoção.
 * `onUpload(url)` devolve a URL pública da imagem já guardada no servidor.
 */
export default function ImageUploader({
  value,
  onChange,
  label,
  hint,
  aspect = 'wide',
  rounded = 16,
  iconSize = 24,
}: {
  value: string
  onChange: (url: string) => void
  label: string
  hint?: string
  aspect?: 'wide' | 'square'
  rounded?: number
  iconSize?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const height = aspect === 'square' ? 148 : 128

  async function handleFile(file?: File | null) {
    if (!file) return
    setErro('')
    if (!file.type.startsWith('image/')) {
      setErro('Selecione um ficheiro de imagem (JPG, PNG ou WEBP).')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErro('A imagem não pode exceder 10 MB.')
      return
    }
    setLoading(true)
    try {
      const { url } = await uploadsApi.imagem(file)
      onChange(url)
    } catch {
      setErro('Não foi possível enviar a imagem. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div
        className={`dropzone ${drag ? 'drag' : ''}`}
        style={{ minHeight: height, borderRadius: rounded }}
        onClick={() => !value && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]) }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click() }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
        />

        <AnimatePresence mode="wait">
          {value ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <img src={value} alt={label} className="preview" />
              <div
                style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.62), transparent 55%)',
                }}
              />
              <div style={{ position: 'absolute', left: 12, bottom: 10, color: '#FFF', fontSize: 13, fontWeight: 700 }}>
                {label}
              </div>
              <div style={{ position: 'absolute', right: 10, top: 10, display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}
                  title="Substituir"
                  style={{
                    width: 34, height: 34, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.92)', color: '#DC2626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Camera size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(''); setErro('') }}
                  title="Remover"
                  style={{
                    width: 34, height: 34, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.92)', color: '#6B7280',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {loading ? (
                <Loader2 size={iconSize} className="animate-spin" />
              ) : (
                <ImagePlus size={iconSize} />
              )}
              <p style={{ fontSize: 14, fontWeight: 700 }}>
                {loading ? 'A enviar…' : label}
              </p>
              {hint && <p style={{ fontSize: 12, opacity: 0.85 }}>{hint}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {erro && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#DC2626', marginTop: 6, fontWeight: 600 }}>
          <AlertCircle size={13} /> {erro}
        </p>
      )}
    </div>
  )
}
