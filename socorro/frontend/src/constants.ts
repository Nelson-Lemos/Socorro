import {
  Zap, Droplets, Snowflake, Wrench, Car, Smartphone, HardHat, Stethoscope,
  ShieldCheck, Sparkles, Utensils, BookOpen, Package, MoreHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface CategoriaDef {
  id: string
  label: string
  desc?: string
  icon: LucideIcon
  color: string
  /** Termos associados — usados na pesquisa tolerante a erros (frontend). */
  keywords: string[]
}

export const CATEGORIAS_PRINCIPAIS: CategoriaDef[] = [
  {
    id: 'electricidade', label: 'Electricidade', desc: 'Faltas de energia, reparações e instalações',
    icon: Zap, color: '#F59E0B',
    keywords: ['electricidade', 'eletricidade', 'eletricista', 'electricista', 'energia', 'iluminação', 'iluminacao', 'curto-circuito', 'tomada', 'disjuntor', 'quadro elétrico'],
  },
  {
    id: 'canalizacao', label: 'Canalização', desc: 'Torneiras, canos e fugas de água',
    icon: Droplets, color: '#0EA5E9',
    keywords: ['canalização', 'canalizacao', 'canalizador', 'pipo', 'hidráulica', 'hidraulica', 'fuga', 'fugas de água', 'água', 'torneira', 'esgoto', 'entupimento', 'cano'],
  },
  {
    id: 'climatizacao', label: 'Climatização', desc: 'Ar-condicionado e ventilação',
    icon: Snowflake, color: '#06B6D4',
    keywords: ['climatização', 'climatizacao', 'ar condicionado', 'ac', 'frio', 'frigorista', 'ventilação', 'ventilacao', 'gás', 'gas', 'frigorífico', 'geladeira', 'arcool'],
  },
  {
    id: 'mecanica', label: 'Mecânica', desc: 'Auxílio mecânico e reparações',
    icon: Wrench, color: '#8B5CF6',
    keywords: ['mecânica', 'mecanica', 'mecânico', 'mecanico', 'oficina', 'carro', 'viatura', 'automóvel', 'automovel', 'motor', 'pneus', 'reboque', 'bateria'],
  },
]

export const OUTRAS_CATEGORIAS: CategoriaDef[] = [
  { id: 'transporte', label: 'Transporte', icon: Car, color: '#F97316', keywords: ['transporte', 'táxi', 'taxi', 'mudanças', 'mudancas', 'carga', 'frete', 'entrega', 'logística'] },
  { id: 'informatica', label: 'Informática', icon: Smartphone, color: '#3B82F6', keywords: ['informática', 'informatica', 'computador', 'telemóvel', 'telefone', 'internet', 'rede', 'software', 'wifi', 'impressora'] },
  { id: 'construcao', label: 'Construção', icon: HardHat, color: '#B45309', keywords: ['construção', 'construcao', 'obra', 'pedreiro', 'cimento', 'pintura', 'pintor', 'reabilitação', 'reforma'] },
  { id: 'saude', label: 'Saúde', icon: Stethoscope, color: '#DC2626', keywords: ['saúde', 'saude', 'médico', 'medico', 'enfermeiro', 'clínica', 'clinica', 'fisioterapia', 'cuidados', 'doente'] },
  { id: 'seguranca', label: 'Segurança', icon: ShieldCheck, color: '#334155', keywords: ['segurança', 'seguranca', 'vigilância', 'vigilancia', 'cctv', 'câmara', 'camara', 'alarme', 'guarda'] },
  { id: 'limpeza', label: 'Limpeza', icon: Sparkles, color: '#14B8A6', keywords: ['limpeza', 'limpadora', 'higienização', 'higienizacao', 'jardinagem', 'jardim', 'lavandaria'] },
  { id: 'alimentacao', label: 'Alimentação', icon: Utensils, color: '#EA580C', keywords: ['alimentação', 'alimentacao', 'comida', 'restauração', 'restauracao', 'cozinheiro', 'catering', 'caterin', 'bufete'] },
  { id: 'educacao', label: 'Educação', icon: BookOpen, color: '#64748B', keywords: ['educação', 'educacao', 'ensino', 'professor', 'explicador', 'aulas', 'formação', 'formacao', 'estudos'] },
  { id: 'mudancas', label: 'Mudanças', icon: Package, color: '#7C3AED', keywords: ['mudanças', 'mudancas', 'mudança', 'remoção', 'remocao', 'mobília', 'mobilia', 'transporte de mobílias'] },
  { id: 'outro', label: 'Outro', icon: MoreHorizontal, color: '#6B7280', keywords: ['outro', 'outros', 'diversos', 'geral'] },
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

/* ─────────── Pesquisa tolerante a erros (fuzzy) ─────────── */

/** Minúsculas, sem acentos e sem pontuação. */
export function normalizarTexto(texto: string): string {
  if (!texto) return ''
  return texto
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Distância de edição (Levenshtein) com corte para rapidez. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = curr
  }
  return prev[b.length]
}

/** Rácio de semelhança 0..1, tolerante a erros de escrita e a acentos. */
export function similaridade(a: string, b: string): number {
  const na = normalizarTexto(a)
  const nb = normalizarTexto(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.92
  const dist = levenshtein(na, nb)
  const base = 1 - dist / Math.max(na.length, nb.length)
  // Também compara por tokens (nomes compostos)
  const ta = na.split(' ').filter((t) => t.length >= 2)
  const tb = nb.split(' ').filter((t) => t.length >= 2)
  let melhorToken = 0
  for (const x of ta) {
    for (const y of tb) {
      const d = levenshtein(x, y)
      melhorToken = Math.max(melhorToken, 1 - d / Math.max(x.length, y.length))
    }
  }
  return Math.max(base, melhorToken * 0.95)
}

/**
 * Verifica se um texto corresponde ao termo (tolerante a erros) e devolve
 * uma pontuação 0..1 para ordenação.
 */
export function pontuarCorrespondencia(texto: string, termo: string): number {
  const nt = normalizarTexto(termo)
  if (!nt) return 0
  const nx = normalizarTexto(texto)
  if (!nx) return 0
  if (nx.includes(nt)) return 1
  let melhor = similaridade(nx, nt)
  for (const token of nx.split(' ')) {
    if (token.length < 2) continue
    melhor = Math.max(melhor, similaridade(token, nt))
  }
  return melhor
}

/** Categorias cujo rótulo/descrição/palavras-chave correspondem ao termo. */
export function categoriasCorrespondentes(termo: string, minimo = 0.75): CategoriaDef[] {
  if (!termo.trim()) return []
  return TODAS_CATEGORIAS.filter((c) => {
    const alvo = [c.label, c.desc || '', c.id, ...c.keywords]
    return alvo.some((t) => pontuarCorrespondencia(t, termo) >= minimo)
  })
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