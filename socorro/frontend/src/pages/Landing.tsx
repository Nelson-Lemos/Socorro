import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Menu, X, MapPin, MessageSquare, ShieldCheck } from 'lucide-react';
import logoUrl from '../assets/logo.jpeg';
import { CATEGORIAS_PRINCIPAIS } from '../constants';

export default function Landing() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const steps = [
    { icon: MapPin, title: 'Peça ajuda', desc: 'Diga o que precisa e onde. Em menos de um minuto pedimos ajuda aos profissionais certos.' },
    { icon: MessageSquare, title: 'Combine o atendimento', desc: 'Escolha um profissional, ou deixe que encontremos a pessoa mais próxima para resolver.' },
    { icon: ShieldCheck, title: 'Resolva e avalie', desc: 'O serviço fica guardado no seu histórico. Avalie como correu para ajudar a comunidade.' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-surface-950 text-surface-900 dark:text-surface-50">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-surface-950/90 backdrop-blur border-b border-surface-200 dark:border-surface-800">
        <nav className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 shrink-0">
              <img src={logoUrl} alt="Socorro!" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-lg font-bold tracking-tight">Socorro<span className="text-brand-600">!</span></span>
            </a>

            <div className="hidden md:flex items-center gap-1">
              <a href="#servicos" className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">Serviços</a>
              <a href="#como-funciona" className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">Como funciona</a>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => navigate('/login')} className="px-5 py-2.5 text-sm font-semibold rounded-xl text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                Entrar
              </button>
              <button onClick={() => navigate('/register')} className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors">
                Criar conta
              </button>
            </div>

            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors" aria-label="Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="md:hidden border-t border-surface-200 dark:border-surface-800">
            <div className="px-4 py-3 space-y-1">
              <a href="#servicos" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">Serviços</a>
              <a href="#como-funciona" onClick={() => setMobileOpen(false)} className="block px-4 py-3 rounded-lg text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">Como funciona</a>
              <div className="pt-2 flex flex-col gap-2">
                <button onClick={() => { navigate('/login'); setMobileOpen(false); }} className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-surface-700 dark:text-surface-200 bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors">Entrar</button>
                <button onClick={() => { navigate('/register'); setMobileOpen(false); }} className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors">Criar conta</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ===== Hero ===== */}
      <section className="pt-20 sm:pt-28 pb-16 sm:pb-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
              Encontre ajuda quando precisar.
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-surface-500 dark:text-surface-400 leading-relaxed">
              Peça um electricista, canalizador, mecânico ou outro profissional.
              Encontramos as pessoas certas perto de si.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row items-start gap-3">
              <button
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-brand-600 text-white font-semibold text-base hover:bg-brand-700 transition-colors"
              >
                Pedir ajuda
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-semibold text-base border border-surface-300 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-900 transition-colors"
              >
                Já tenho conta
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Serviços ===== */}
      <section id="servicos" className="py-16 sm:py-20 bg-surface-50 dark:bg-surface-900/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Serviços</h2>
            <p className="mt-3 text-surface-500 dark:text-surface-400 text-base">
              Profissionais para resolver o seu dia-a-dia.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIAS_PRINCIPAIS.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate('/register')}
                  className="text-left bg-white dark:bg-surface-900 rounded-2xl p-5 border border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-sm transition-all"
                >
                  <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/50 w-fit">
                    <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <h3 className="mt-4 font-semibold text-base">{cat.label}</h3>
                  <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400 leading-relaxed">{cat.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Como funciona ===== */}
      <section id="como-funciona" className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Como funciona</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="p-5 rounded-2xl border border-surface-200 dark:border-surface-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-surface-100 dark:bg-surface-800 w-fit">
                      <Icon className="h-5 w-5 text-surface-600 dark:text-surface-300" />
                    </div>
                    <span className="text-sm font-bold text-surface-400 dark:text-surface-500">{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold text-base">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-surface-500 dark:text-surface-400 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl bg-surface-900 dark:bg-black px-6 py-12 sm:px-14 sm:py-16 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Precisa de ajuda agora?
            </h2>
            <p className="mt-3 text-surface-400 text-base max-w-xl mx-auto">
              Crie uma conta gratuita e peça um profissional em minutos.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-500 transition-colors"
              >
                Criar conta
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-white border border-surface-700 hover:bg-surface-800 transition-colors"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-surface-200 dark:border-surface-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <a href="/" className="flex items-center gap-2.5">
              <img src={logoUrl} alt="Socorro!" className="h-7 w-7 rounded-lg object-cover" />
              <span className="font-bold tracking-tight">Socorro<span className="text-brand-600">!</span></span>
            </a>
            <div className="flex items-center gap-5 text-sm text-surface-500 dark:text-surface-400">
              <a href="#servicos" className="hover:text-surface-900 dark:hover:text-white transition-colors">Serviços</a>
              <button onClick={() => navigate('/login')} className="hover:text-surface-900 dark:hover:text-white transition-colors">Entrar</button>
              <button onClick={() => navigate('/register')} className="hover:text-surface-900 dark:hover:text-white transition-colors">Criar conta</button>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-surface-400 dark:text-surface-500">
            &copy; {new Date().getFullYear()} Socorro!. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}