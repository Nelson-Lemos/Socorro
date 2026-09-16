import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, animate } from 'framer-motion';
import {
  Menu, X, Zap, Shield, CreditCard, Users, ArrowRight, ChevronRight,
  Star, Heart, Stethoscope, Wrench, Sparkles, Monitor, CircuitBoard,
  Plug, HardHat, Droplets,
} from 'lucide-react';
import logoUrl from '../assets/logo.jpeg';
import imgMedico from '../assets/img/medico.jpg';
import imgMecanico from '../assets/img/mecanico.jpg';
import imgLimpeza from '../assets/img/limpeza.jpg';
import imgInformatica from '../assets/img/informatica.jpg';
import imgElectronic from '../assets/img/electronic.jpg';
import imgElectrecista from '../assets/img/electrecista.jpg';
import imgConstrucao from '../assets/img/construção.jpg';
import imgCanalizacao from '../assets/img/canalização.jpg';

const categories = [
  { name: 'Médico', image: imgMedico, icon: Stethoscope, color: 'from-red-500 to-pink-500' },
  { name: 'Mecânico', image: imgMecanico, icon: Wrench, color: 'from-orange-500 to-amber-500' },
  { name: 'Limpeza', image: imgLimpeza, icon: Sparkles, color: 'from-cyan-500 to-blue-500' },
  { name: 'Informática', image: imgInformatica, icon: Monitor, color: 'from-violet-500 to-purple-500' },
  { name: 'Electrónica', image: imgElectronic, icon: CircuitBoard, color: 'from-emerald-500 to-teal-500' },
  { name: 'Electricista', image: imgElectrecista, icon: Plug, color: 'from-yellow-500 to-orange-500' },
  { name: 'Construção', image: imgConstrucao, icon: HardHat, color: 'from-slate-500 to-zinc-500' },
  { name: 'Canalização', image: imgCanalizacao, icon: Droplets, color: 'from-sky-500 to-blue-500' },
];

const features = [
  { icon: Zap, title: 'Resposta Imediata', description: 'Conectamos-te a um profissional em menos de 5 minutos. Urgência não espera.', gradient: 'from-amber-400 to-orange-500' },
  { icon: Shield, title: 'Pagamento Seguro', description: 'Pagamento protegido e garantia de serviço. O teu dinheiro só é liberado quando estiveres satisfeito.', gradient: 'from-emerald-400 to-teal-500' },
  { icon: CreditCard, title: 'Pagamento Angolano', description: 'Paga com Multicaixa Express, Unitel Money, ACH ou cartão bancário. Feito para Angola.', gradient: 'from-blue-400 to-indigo-500' },
  { icon: Users, title: 'Comunidade', description: 'Profissionais verificados pela comunidade. Avaliações reais de pessoas reais.', gradient: 'from-purple-400 to-pink-500' },
];

const stats = [
  { value: 12400, suffix: '+', label: 'Utilizadores' },
  { value: 38000, suffix: '+', label: 'Pedidos' },
  { value: 99.8, suffix: '%', label: 'Uptime' },
  { value: 4.9, suffix: '/5', label: 'Satisfação' },
];

const testimonials = [
  { name: 'Ana Ferreira', role: 'Empresária', text: 'Usei o Socorro quando o meu ar condicionou avariou no meio do verão. Em 10 minutos já tinha um técnico em casa. Incrível!' },
  { name: 'Carlos Mendes', role: 'Motorista', text: 'O mecânico chegou mais rápido do que esperava. Pagamento seguro e preço justo. Recomendo a todos!' },
  { name: 'Maria Santos', role: 'Mãe de família', text: 'Quando precisei de um médico às 3 da manhã, o Socorro foi a minha salvação. Profissionalismo e rapidez.' },
];

const footerLinks = [
  { title: 'Plataforma', links: ['Como funciona', 'Categorias', 'Preços', 'Blog'] },
  { title: 'Empresa', links: ['Sobre nós', 'Carreiras', 'Imprensa', 'Contacto'] },
  { title: 'Legal', links: ['Privacidade', 'Termos', 'Cookies', 'Licenças'] },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, value, {
      duration: 2,
      ease: 'easeOut',
      onUpdate(v) { setDisplayed(v); },
    });
    return () => controls.stop();
  }, [isInView, value]);

  const formatted =
    value >= 1000 && value % 1000 !== 0
      ? displayed.toFixed(1)
      : value >= 1000
        ? Math.round(displayed).toLocaleString()
        : displayed.toFixed(1);

  return <span ref={ref} className="tabular-nums">{formatted}{suffix}</span>;
}

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

export default function Landing() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white dark:bg-surface-950 text-surface-900 dark:text-surface-50 overflow-x-hidden">

      {/* ===================== HEADER ===================== */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 inset-x-0 z-50"
      >
        <div className="bg-white/80 dark:bg-surface-950/80 backdrop-blur-xl border-b border-surface-200/60 dark:border-surface-800/60">
          <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <a href="/" className="flex items-center gap-2.5 shrink-0">
                <img src={logoUrl} alt="Socorro!" className="h-9 w-9 rounded-xl object-cover shadow-md ring-2 ring-white dark:ring-surface-800" />
                <span className="text-xl font-bold tracking-tight">Socorro<span className="text-brand-600">!</span></span>
              </a>

              <div className="hidden md:flex items-center gap-1">
                <a href="#categorias" className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-all">Categorias</a>
                <a href="#vantagens" className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-all">Vantagens</a>
                <a href="#testemunhos" className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-all">Testemunhos</a>
              </div>

              <div className="hidden md:flex items-center gap-2.5">
                <button onClick={() => navigate('/login')} className="px-5 py-2.5 text-sm font-semibold rounded-xl text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200">
                  Entrar
                </button>
                <button onClick={() => navigate('/register')} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">
                  Criar conta
                </button>
              </div>

              <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" aria-label="Menu">
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </nav>
        </div>

        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="md:hidden bg-white dark:bg-surface-950 border-b border-surface-200 dark:border-surface-800 overflow-hidden"
          >
            <div className="px-4 py-3 space-y-1">
              <a href="#categorias" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-xl text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">Categorias</a>
              <a href="#vantagens" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-xl text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">Vantagens</a>
              <a href="#testemunhos" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-xl text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">Testemunhos</a>
              <div className="pt-2 flex flex-col gap-2">
                <button onClick={() => { navigate('/login'); setMobileOpen(false); }} className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-surface-700 dark:text-surface-200 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">Entrar</button>
                <button onClick={() => { navigate('/register'); setMobileOpen(false); }} className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors">Criar conta</button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.header>

      {/* ===================== HERO ===================== */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-50/80 via-white to-white dark:from-surface-950 dark:via-surface-950 dark:to-surface-950" />
          <div className="absolute top-[-30%] left-[-15%] h-[700px] w-[700px] rounded-full bg-brand-400/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-orange-400/8 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200/60 dark:border-brand-800/40 text-brand-700 dark:text-brand-300 text-sm font-medium mb-8"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
              </span>
              Plataforma #1 em Angola
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1]"
            >
              Ajuda a qualquer momento,
              <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-brand-600 via-rose-500 to-orange-500 bg-clip-text text-transparent"> em qualquer lugar</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mt-6 text-base sm:text-lg lg:text-xl text-surface-500 dark:text-surface-400 max-w-2xl mx-auto leading-relaxed"
            >
              Conectamos instantaneamente pessoas a profissionais de confiança.
              Médicos, mecânicos, electricistas e muito mais — tudo na palma da tua mão.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={() => navigate('/register')}
                className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-600 text-white font-semibold text-base shadow-xl shadow-brand-600/25 hover:bg-brand-700 hover:shadow-brand-600/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 inline-flex items-center justify-center gap-2"
              >
                Começar agora
                <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-base border-2 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:border-surface-300 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-900 transition-all duration-200"
              >
                Já tenho conta
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.7 }}
              className="mt-16 sm:mt-20"
            >
              <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-3xl mx-auto">
                {categories.map((cat, i) => {
                  const Icon = cat.icon;
                  return (
                    <motion.div
                      key={cat.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.85 + i * 0.05, duration: 0.4 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      onClick={() => navigate('/register')}
                      className="group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-surface-900 border border-surface-200/80 dark:border-surface-800 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-700 transition-all duration-300">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${cat.color}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-surface-700 dark:text-surface-200">{cat.name}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-surface-400 dark:text-surface-500 font-medium">Toca para explorar categorias</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===================== CATEGORIAS ===================== */}
      <section id="categorias" className="py-20 sm:py-28 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 text-xs font-semibold tracking-wide uppercase mb-4">Categorias</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Encontre o profissional<br />
              <span className="bg-gradient-to-r from-brand-600 to-orange-500 bg-clip-text text-transparent">certo para si</span>
            </h2>
            <p className="mt-4 text-surface-500 dark:text-surface-400 text-base sm:text-lg">
              De médicos a canalizadores, temos profissionais verificados em todas as categorias.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"
          >
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <motion.div
                  key={cat.name}
                  variants={itemVariants}
                  whileHover={{ y: -6 }}
                  className="group relative rounded-2xl overflow-hidden cursor-pointer shadow-md ring-1 ring-black/5 dark:ring-white/5 hover:shadow-xl transition-all duration-300"
                  onClick={() => navigate('/register')}
                >
                  <div className="relative h-52 sm:h-60 overflow-hidden">
                    <img src={cat.image} alt={cat.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5">
                      <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${cat.color} shadow-lg mb-2`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white">{cat.name}</h3>
                      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        <span className="text-xs text-white/80 font-medium">Explorar</span>
                        <ChevronRight className="h-3.5 w-3.5 text-white/80" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ===================== VANTAGENS ===================== */}
      <section id="vantagens" className="py-20 sm:py-28 relative">
        <div className="absolute inset-0 -z-10 bg-surface-50/60 dark:bg-surface-900/40" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 text-xs font-semibold tracking-wide uppercase mb-4">Vantagens</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Porquê escolher
              <span className="bg-gradient-to-r from-brand-600 to-orange-500 bg-clip-text text-transparent"> Socorro!</span>
            </h2>
            <p className="mt-4 text-surface-500 dark:text-surface-400 text-base sm:text-lg">
              Construído para Angola, pensado para a tua tranquilidade.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
          >
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  variants={itemVariants}
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-surface-900 rounded-2xl p-6 sm:p-7 border border-surface-200/60 dark:border-surface-800/60 shadow-sm hover:shadow-lg hover:border-surface-300 dark:hover:border-surface-700 transition-all duration-300"
                >
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feat.gradient} shadow-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mt-5 text-lg font-bold tracking-tight">{feat.title}</h3>
                  <p className="mt-2.5 text-surface-500 dark:text-surface-400 leading-relaxed text-sm">{feat.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ===================== NUMEROS ===================== */}
      <section className="py-20 sm:py-28 bg-surface-900 dark:bg-black relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-full max-w-4xl bg-gradient-to-r from-transparent via-brand-500/40 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-900/15 via-transparent to-transparent" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/70 text-xs font-semibold tracking-wide uppercase mb-4">Números</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Números que falam por si
            </h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10"
          >
            {stats.map((stat) => (
              <motion.div key={stat.label} variants={itemVariants} className="text-center">
                <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-white to-surface-400 bg-clip-text text-transparent">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <p className="mt-3 text-surface-400 text-sm sm:text-base font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===================== TESTEMUNHOS ===================== */}
      <section id="testemunhos" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-14"
          >
            <span className="inline-block px-3 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 text-xs font-semibold tracking-wide uppercase mb-4">Testemunhos</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              O que dizem os
              <span className="bg-gradient-to-r from-brand-600 to-orange-500 bg-clip-text text-transparent"> nossos utilizadores</span>
            </h2>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6"
          >
            {testimonials.map((review) => (
              <motion.div
                key={review.name}
                variants={itemVariants}
                whileHover={{ y: -3 }}
                className="bg-white dark:bg-surface-900 rounded-2xl p-6 sm:p-7 border border-surface-200/60 dark:border-surface-800/60 shadow-sm hover:shadow-lg transition-all duration-300"
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-surface-600 dark:text-surface-400 leading-relaxed text-sm mb-5">
                  &ldquo;{review.text}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-surface-100 dark:border-surface-800">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {review.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{review.name}</p>
                    <p className="text-xs text-surface-400 dark:text-surface-500">{review.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6 }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-rose-600 to-orange-500" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4djZoLTZ2LTZoNnptLTEyIDEydjZoLTZ2LTZoNnptMTItMTJ2Nmg2di02aC02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

            <div className="relative px-6 py-14 sm:px-14 sm:py-20 text-center">
              <motion.h2
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight"
              >
                Pronto para pedir ajuda?
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-4 text-base sm:text-lg text-white/80 max-w-xl mx-auto"
              >
                Junta-te a milhares de angolanos que já confiam no Socorro! para os seus momentos de necessidade.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.45, duration: 0.5 }}
                className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
              >
                <button
                  onClick={() => navigate('/register')}
                  className="group w-full sm:w-auto px-8 py-4 rounded-2xl bg-white text-brand-600 font-semibold text-base shadow-xl hover:bg-surface-50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 inline-flex items-center justify-center gap-2"
                >
                  Criar conta grátis
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-semibold text-base border-2 border-white/30 text-white hover:bg-white/10 transition-all duration-200"
                >
                  Entrar na plataforma
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10">
            <div className="col-span-2 md:col-span-1">
              <a href="/" className="flex items-center gap-2.5 mb-4">
                <img src={logoUrl} alt="Socorro!" className="h-8 w-8 rounded-lg object-cover" />
                <span className="text-lg font-bold tracking-tight">Socorro<span className="text-brand-600">!</span></span>
              </a>
              <p className="text-sm text-surface-400 dark:text-surface-500 leading-relaxed max-w-xs">
                A plataforma de ajuda de emergência mais confiável de Angola.
              </p>
              <div className="flex items-center gap-1 mt-4 text-sm text-surface-400 dark:text-surface-500">
                Feito com <Heart className="h-3.5 w-3.5 text-brand-500 fill-brand-500 mx-0.5" /> em Angola
              </div>
            </div>
            {footerLinks.map((group) => (
              <div key={group.title}>
                <h4 className="text-sm font-semibold tracking-tight mb-4 text-surface-900 dark:text-white">{group.title}</h4>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-surface-400 dark:text-surface-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-surface-100 dark:border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-surface-400 dark:text-surface-500">
              &copy; {new Date().getFullYear()} Socorro!. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-4 text-xs text-surface-400 dark:text-surface-500">
              <a href="#" className="hover:text-surface-600 dark:hover:text-surface-300 transition-colors">Privacidade</a>
              <a href="#" className="hover:text-surface-600 dark:hover:text-surface-300 transition-colors">Termos</a>
              <a href="#" className="hover:text-surface-600 dark:hover:text-surface-300 transition-colors">Contacto</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
