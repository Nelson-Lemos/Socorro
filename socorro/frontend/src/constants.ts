import {
  Zap, Droplets, Snowflake, Wrench, Car, Smartphone, HardHat, Stethoscope,
  ShieldCheck, Sparkles, Utensils, BookOpen, Package, MoreHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface CategoriaDef {
  id: string
  label: string
  desc?: string
  emoji: string
  icon: LucideIcon
  color: string
}

export const CATEGORIAS_PRINCIPAIS: CategoriaDef[] = [
  { id: 'electricidade', label: 'Electricidade', desc: 'Faltas de energia, reparações e instalações', emoji: '⚡', icon: Zap, color: '#F59E0B' },
  { id: 'canalizacao', label: 'Canalização', desc: 'Torneiras, canos e fugas de água', emoji: '🚰', icon: Droplets, color: '#0EA5E9' },
  { id: 'climatizacao', label: 'Climatização', desc: 'Ar-condicionado e ventilação', emoji: '❄️', icon: Snowflake, color: '#06B6D4' },
  { id: 'mecanica', label: 'Mecânica', desc: 'Auxílio mecânico e reparações', emoji: '🚗', icon: Wrench, color: '#8B5CF6' },
]

export const OUTRAS_CATEGORIAS: CategoriaDef[] = [
  { id: 'transporte', label: 'Transporte', emoji: '🚙', icon: Car, color: '#F97316' },
  { id: 'informatica', label: 'Informática', emoji: '💻', icon: Smartphone, color: '#3B82F6' },
  { id: 'construcao', label: 'Construção', emoji: '🏗️', icon: HardHat, color: '#B45309' },
  { id: 'saude', label: 'Saúde', emoji: '🩺', icon: Stethoscope, color: '#DC2626' },
  { id: 'seguranca', label: 'Segurança', emoji: '🛡️', icon: ShieldCheck, color: '#334155' },
  { id: 'limpeza', label: 'Limpeza', emoji: '✨', icon: Sparkles, color: '#14B8A6' },
  { id: 'alimentacao', label: 'Alimentação', emoji: '🍽️', icon: Utensils, color: '#EA580C' },
  { id: 'educacao', label: 'Educação', emoji: '📚', icon: BookOpen, color: '#64748B' },
  { id: 'mudancas', label: 'Mudanças', emoji: '📦', icon: Package, color: '#7C3AED' },
  { id: 'outro', label: 'Outro', emoji: '🛠️', icon: MoreHorizontal, color: '#6B7280' },
]

export const TODAS_CATEGORIAS: CategoriaDef[] = [...CATEGORIAS_PRINCIPAIS, ...OUTRAS_CATEGORIAS]

export function categoriaInfo(label?: string | null): CategoriaDef {
  if (!label) return OUTRAS_CATEGORIAS[OUTRAS_CATEGORIAS.length - 1]
  const l = label.toLowerCase()
  const found = TODAS_CATEGORIAS.find(
    (c) => l === c.label.toLowerCase() || l === c.id || l.includes(c.label.split(' ')[0].toLowerCase()),
  )
  return found || OUTRAS_CATEGORIAS[OUTRAS_CATEGORIAS.length - 1]
}

export const STATUS_PEDIDO: Record<string, { label: string; bg: string; text: string; dot: string; order: number }> = {
  aberto: { label: 'Aberto', bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6', order: 1 },
  procurando: { label: 'A procurar profissional', bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B', order: 2 },
  a_caminho: { label: 'Profissional a caminho', bg: '#FFF7ED', text: '#9A3412', dot: '#F97316', order: 3 },
  chegou: { label: 'Chegou ao local', bg: '#CCFBF1', text: '#115E59', dot: '#14B8A6', order: 4 },
  em_andamento: { label: 'Serviço em andamento', bg: '#F3E8FF', text: '#6B21A8', dot: '#A855F7', order: 5 },
  concluido: { label: 'Concluído', bg: '#D1FAE5', text: '#065F46', dot: '#10B981', order: 6 },
  cancelado: { label: 'Cancelado', bg: '#F3F4F6', text: '#4B5563', dot: '#9CA3AF', order: 7 },
}

export const STATUS_ATENDIMENTO: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  online: { label: 'Disponível', dot: '#10B981', bg: '#D1FAE5', text: '#065F46' },
  ocupado: { label: 'Ocupado', dot: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  offline: { label: 'Offline', dot: '#9CA3AF', bg: '#F3F4F6', text: '#4B5563' },
}

export const URGENCIAS = [
  { id: 'urgente', label: 'Urgente', desc: 'Preciso de ajuda agora', color: '#DC2626' },
  { id: 'moderada', label: 'Moderada', desc: 'Ainda hoje/semanas', color: '#F59E0B' },
  { id: 'planeada', label: 'Planeada', desc: 'Posso agendar', color: '#3B82F6' },
]

/** Comissão da plataforma sobre o valor do serviço (mesmo valor do backend: TAXA_PLATAFORMA = 0.25) */
export const TAXA_PLATAFORMA_PERCENT = 25