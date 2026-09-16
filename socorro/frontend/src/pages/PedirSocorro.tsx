import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pedidosApi } from '../api'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, MapPin, AlertTriangle, Clock, Calendar, Send,
  CheckCircle, Camera, X, Car, Shield, Utensils, BookOpen,
  Package, Wrench, Navigation
} from 'lucide-react'

import imgMedico from '../assets/img/medico.jpg'
import imgLimpeza from '../assets/img/limpeza.jpg'
import imgInformatica from '../assets/img/informatica.jpg'
import imgElectrecista from '../assets/img/electrecista.jpg'
import imgConstrucao from '../assets/img/construção.jpg'
import imgCanalizacao from '../assets/img/canalização.jpg'

const CATEGORIAS = [
  { label: 'Electricidade', image: imgElectrecista },
  { label: 'Canalização', image: imgCanalizacao },
  { label: 'Transporte', image: null, icon: Car },
  { label: 'Informática', image: imgInformatica },
  { label: 'Construção', image: imgConstrucao },
  { label: 'Saúde', image: imgMedico },
  { label: 'Segurança', image: null, icon: Shield },
  { label: 'Limpeza', image: imgLimpeza },
  { label: 'Alimentação', image: null, icon: Utensils },
  { label: 'Educação', image: null, icon: BookOpen },
  { label: 'Mudanças', image: null, icon: Package },
  { label: 'Outro', image: null, icon: Wrench },
]

const URGENCIAS = [
  {
    value: 'urgente',
    label: 'Urgente',
    desc: 'Ajuda imediata necessária',
    icon: AlertTriangle,
    color: 'text-error',
    bg: 'bg-error-light',
    border: 'border-error',
    activeBg: 'bg-error-light/50',
    darkBg: 'dark:bg-error/10',
    darkBorder: 'dark:border-error',
  },
  {
    value: 'moderada',
    label: 'Moderada',
    desc: 'Até 24 horas',
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning-light',
    border: 'border-warning',
    activeBg: 'bg-warning-light/50',
    darkBg: 'dark:bg-warning/10',
    darkBorder: 'dark:border-warning',
  },
  {
    value: 'planeada',
    label: 'Planeada',
    desc: 'Sem urgência',
    icon: Calendar,
    color: 'text-success',
    bg: 'bg-success-light',
    border: 'border-success',
    activeBg: 'bg-success-light/50',
    darkBg: 'dark:bg-success/10',
    darkBorder: 'dark:border-success',
  },
]

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
}

export default function PedirSocorro() {
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gettingLocation, setGettingLocation] = useState(false)

  const [form, setForm] = useState({
    titulo: '',
    categoria: '',
    descricao: '',
    localizacao: '',
    latitude: 0,
    longitude: 0,
    urgencia: '',
  })

  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreview, setPhotoPreview] = useState<string[]>([])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const goNext = () => {
    setDirection(1)
    setStep(s => s + 1)
  }

  const goBack = () => {
    if (step > 1) {
      setDirection(-1)
      setStep(s => s - 1)
    } else {
      nav('/dashboard')
    }
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      set('localizacao', 'Luanda, Angola')
      return
    }
    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('latitude', pos.coords.latitude)
        set('longitude', pos.coords.longitude)
        set('localizacao', `Luanda (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`)
        setGettingLocation(false)
      },
      () => {
        set('localizacao', 'Luanda, Angola')
        setGettingLocation(false)
      }
    )
  }

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newPhotos = Array.from(files).slice(0, 4 - photos.length)
    setPhotos(prev => [...prev, ...newPhotos])
    newPhotos.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPhotoPreview(prev => [...prev, ev.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handlePhotoRemove = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreview(prev => prev.filter((_, i) => i !== index))
  }

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      await pedidosApi.criar({
        titulo: form.titulo,
        categoria: form.categoria,
        descricao: form.descricao,
        localizacao: form.localizacao,
        latitude: form.latitude || undefined,
        longitude: form.longitude || undefined,
        urgencia: form.urgencia,
      })
      setSuccess(true)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Erro ao criar pedido')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSuccess(false)
    setStep(1)
    setDirection(1)
    setForm({ titulo: '', categoria: '', descricao: '', localizacao: '', latitude: 0, longitude: 0, urgencia: '' })
    setPhotos([])
    setPhotoPreview([])
  }

  const selectedUrgencia = URGENCIAS.find(u => u.value === form.urgencia)

  if (success) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-full max-w-sm text-center flex flex-col items-center gap-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-24 h-24 rounded-full bg-success/10 dark:bg-success/20 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.4 }}
            >
              <CheckCircle size={48} className="text-success" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center gap-3"
          >
            <h2 className="text-2xl font-extrabold text-surface-900 dark:text-surface-50">
              Pedido Enviado!
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed max-w-xs">
              O teu pedido foi publicado. Prestadores da tua área vão receber notificação e poderão responder em breve.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex flex-col gap-3 w-full"
          >
            <button
              onClick={() => nav('/dashboard')}
              className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl transition-all duration-200 active:scale-[0.98]"
            >
              Voltar ao Início
            </button>
            <button
              onClick={resetForm}
              className="w-full py-4 px-6 bg-transparent border-2 border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 font-semibold rounded-2xl hover:bg-brand-50 dark:hover:bg-brand-950 transition-all duration-200"
            >
              Criar outro pedido
            </button>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between px-4 py-3.5">
          <button
            onClick={goBack}
            className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 flex items-center justify-center transition-colors duration-200"
          >
            <ChevronLeft size={20} className="text-surface-600 dark:text-surface-300" />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-base font-bold text-surface-900 dark:text-surface-50">
              Pedir Socorro
            </h1>
            <span className="text-xs font-medium text-surface-400 dark:text-surface-500">
              Passo {step} de 3
            </span>
          </div>
          <div className="w-10" />
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-surface-100 dark:bg-surface-800">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-500 to-brand-600"
            initial={{ width: 0 }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        </div>
      </header>

      {/* Step content */}
      <div className="flex-1 overflow-hidden max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="px-4 py-6 flex flex-col gap-8"
          >
            {/* STEP 1 — Category & Urgency */}
            {step === 1 && (
              <>
                {/* Urgency Section */}
                <section className="flex flex-col gap-3">
                  <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">
                    Qual é a urgência?
                  </h2>
                  <div className="flex flex-col gap-3">
                    {URGENCIAS.map(u => {
                      const Ic = u.icon
                      const active = form.urgencia === u.value
                      return (
                        <motion.button
                          key={u.value}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => set('urgencia', u.value)}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left ${
                            active
                              ? `${u.border} ${u.activeBg} ${u.darkBg} ${u.darkBorder}`
                              : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-600'
                          }`}
                        >
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            active ? `${u.bg} ${u.darkBg}` : 'bg-surface-100 dark:bg-surface-800'
                          }`}>
                            <Ic size={20} className={active ? u.color : 'text-surface-400 dark:text-surface-500'} />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-sm font-bold ${active ? u.color : 'text-surface-900 dark:text-surface-50'}`}>
                              {u.label}
                            </span>
                            <span className="text-xs text-surface-500 dark:text-surface-400">
                              {u.desc}
                            </span>
                          </div>
                          {active && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="ml-auto w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0"
                            >
                              <CheckCircle size={14} className="text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </section>

                {/* Category Section */}
                <section className="flex flex-col gap-3">
                  <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">
                    Categoria
                  </h2>

                  {/* Image categories — 2 column grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {CATEGORIAS.filter(c => c.image).map(c => {
                      const active = form.categoria === c.label
                      return (
                        <motion.button
                          key={c.label}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => set('categoria', c.label)}
                          className={`relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                            active
                              ? 'border-brand-600 dark:border-brand-500 ring-2 ring-brand-600/30 dark:ring-brand-500/30'
                              : 'border-transparent hover:border-surface-300 dark:hover:border-surface-600'
                          }`}
                        >
                          <img
                            src={c.image || undefined}
                            alt={c.label}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <span className="text-sm font-bold text-white drop-shadow-sm">
                              {c.label}
                            </span>
                          </div>
                          {active && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center shadow-lg"
                            >
                              <CheckCircle size={16} className="text-white" />
                            </motion.div>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Icon-only categories — 4 column grid */}
                  <div className="grid grid-cols-4 gap-2.5">
                    {CATEGORIAS.filter(c => !c.image).map(c => {
                      const Ic = c.icon!
                      const active = form.categoria === c.label
                      return (
                        <motion.button
                          key={c.label}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => set('categoria', c.label)}
                          className={`flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border-2 transition-all duration-200 ${
                            active
                              ? 'border-brand-600 dark:border-brand-500 bg-brand-50 dark:bg-brand-950/50'
                              : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-600'
                          }`}
                        >
                          <Ic
                            size={22}
                            className={active ? 'text-brand-600 dark:text-brand-400' : 'text-surface-400 dark:text-surface-500'}
                          />
                          <span className={`text-[11px] font-semibold leading-tight text-center ${
                            active ? 'text-brand-600 dark:text-brand-400' : 'text-surface-600 dark:text-surface-400'
                          }`}>
                            {c.label}
                          </span>
                        </motion.button>
                      )
                    })}
                  </div>
                </section>

                {/* Continue button */}
                <button
                  disabled={!form.urgencia || !form.categoria}
                  onClick={goNext}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-base transition-all duration-200 ${
                    form.urgencia && form.categoria
                      ? 'bg-brand-600 hover:bg-brand-700 text-white active:scale-[0.98] shadow-lg shadow-brand-600/20'
                      : 'bg-surface-200 dark:bg-surface-800 text-surface-400 dark:text-surface-600 cursor-not-allowed'
                  }`}
                >
                  Continuar
                </button>
              </>
            )}

            {/* STEP 2 — Details + Photos */}
            {step === 2 && (
              <>
                <section className="flex flex-col gap-5">
                  <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">
                    Descreve o problema
                  </h2>

                  {/* Title */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                        Título do pedido
                      </label>
                      <span className={`text-xs font-medium ${
                        form.titulo.length >= 90
                          ? 'text-error'
                          : 'text-surface-400 dark:text-surface-500'
                      }`}>
                        {form.titulo.length}/100
                      </span>
                    </div>
                    <input
                      placeholder='Ex: "Fuga de água urgente no prédio"'
                      value={form.titulo}
                      onChange={e => set('titulo', e.target.value)}
                      maxLength={100}
                      className="w-full px-4 py-3.5 bg-white dark:bg-surface-900 border-2 border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-surface-50 placeholder-surface-400 dark:placeholder-surface-600 outline-none focus:border-brand-500 dark:focus:border-brand-500 transition-colors duration-200"
                    />
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-surface-700 dark:text-surface-300">
                        Descrição detalhada
                      </label>
                      <span className={`text-xs font-medium ${
                        form.descricao.length >= 450
                          ? 'text-error'
                          : 'text-surface-400 dark:text-surface-500'
                      }`}>
                        {form.descricao.length}/500
                      </span>
                    </div>
                    <textarea
                      placeholder="Descreve bem o problema para receberes ajuda mais rápida..."
                      value={form.descricao}
                      onChange={e => set('descricao', e.target.value)}
                      maxLength={500}
                      rows={5}
                      className="w-full px-4 py-3.5 bg-white dark:bg-surface-900 border-2 border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-surface-50 placeholder-surface-400 dark:placeholder-surface-600 outline-none focus:border-brand-500 dark:focus:border-brand-500 transition-colors duration-200 resize-none"
                    />
                  </div>
                </section>

                {/* Photos */}
                <section className="flex flex-col gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">
                      Fotos
                    </h2>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                      Adiciona fotos do problema para ajudar o prestador (opcional)
                    </p>
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <AnimatePresence mode="popLayout">
                      {photoPreview.map((src, i) => (
                        <motion.div
                          key={src}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          className="relative aspect-square rounded-xl overflow-hidden border-2 border-surface-200 dark:border-surface-700"
                        >
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handlePhotoRemove(i)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors"
                          >
                            <X size={12} className="text-white" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {photos.length < 4 && (
                      <label className="aspect-square rounded-xl border-2 border-dashed border-surface-300 dark:border-surface-600 hover:border-brand-400 dark:hover:border-brand-500 bg-surface-50 dark:bg-surface-800/50 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors duration-200">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={handlePhotoAdd}
                        />
                        <Camera size={22} className="text-surface-400 dark:text-surface-500" />
                        <span className="text-[10px] font-medium text-surface-400 dark:text-surface-500">
                          Adicionar
                        </span>
                      </label>
                    )}
                  </div>
                </section>

                {/* Continue button */}
                <button
                  disabled={!form.titulo || !form.descricao}
                  onClick={goNext}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-base transition-all duration-200 ${
                    form.titulo && form.descricao
                      ? 'bg-brand-600 hover:bg-brand-700 text-white active:scale-[0.98] shadow-lg shadow-brand-600/20'
                      : 'bg-surface-200 dark:bg-surface-800 text-surface-400 dark:text-surface-600 cursor-not-allowed'
                  }`}
                >
                  Continuar
                </button>
              </>
            )}

            {/* STEP 3 — Location & Review */}
            {step === 3 && (
              <>
                {/* Location */}
                <section className="flex flex-col gap-3">
                  <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">
                    Localização
                  </h2>
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500" />
                      <input
                        placeholder="Ex: Luanda, Maianga, Rua 15"
                        value={form.localizacao}
                        onChange={e => set('localizacao', e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-surface-900 border-2 border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-surface-50 placeholder-surface-400 dark:placeholder-surface-600 outline-none focus:border-brand-500 dark:focus:border-brand-500 transition-colors duration-200"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={gettingLocation}
                      className="flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors py-1"
                    >
                      <Navigation size={15} className={gettingLocation ? 'animate-spin' : ''} />
                      {gettingLocation ? 'A obter localização...' : 'Usar localização actual'}
                    </button>
                  </div>
                </section>

                {/* Review Summary */}
                <section className="flex flex-col gap-3">
                  <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50">
                    Revisão do pedido
                  </h2>
                  <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-800">
                    {[
                      { label: 'Urgência', value: selectedUrgencia?.label, color: selectedUrgencia?.color },
                      { label: 'Categoria', value: form.categoria },
                      { label: 'Título', value: form.titulo },
                      {
                        label: 'Descrição',
                        value: form.descricao?.length > 80
                          ? form.descricao.substring(0, 80) + '...'
                          : form.descricao,
                      },
                      { label: 'Localização', value: form.localizacao },
                      {
                        label: 'Fotos',
                        value: photos.length > 0 ? `${photos.length} foto(s)` : 'Nenhuma',
                      },
                    ].map(r => (
                      <div key={r.label} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-surface-500 dark:text-surface-400 font-medium">
                          {r.label}
                        </span>
                        <span className={`text-sm font-semibold text-right max-w-[60%] ${
                          r.color || 'text-surface-900 dark:text-surface-50'
                        }`}>
                          {r.value || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-3 p-4 bg-error-light dark:bg-error/10 border border-error/20 dark:border-error/30 rounded-xl">
                        <AlertTriangle size={18} className="text-error flex-shrink-0" />
                        <span className="text-sm font-medium text-error">{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit */}
                <button
                  disabled={!form.localizacao || loading}
                  onClick={submit}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5 transition-all duration-200 ${
                    form.localizacao && !loading
                      ? 'bg-brand-600 hover:bg-brand-700 text-white active:scale-[0.98] shadow-lg shadow-brand-600/20'
                      : 'bg-surface-200 dark:bg-surface-800 text-surface-400 dark:text-surface-600 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      A enviar...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      Enviar Pedido
                    </>
                  )}
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
