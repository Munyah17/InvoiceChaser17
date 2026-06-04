import { Link } from 'react-router-dom'
import Button from '../components/Button'
import { useTheme } from '../context/ThemeContext'

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-neutral-950/80 backdrop-blur-lg border-b border-neutral-200 dark:border-neutral-800/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-white to-neutral-300 rounded-xl flex items-center justify-center shadow-lg">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-neutral-950 dark:fill-white">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <span className="font-display font-bold text-neutral-950 dark:text-white text-base">InvoiceChaser</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-neutral-950 dark:text-white hover:text-neutral-600 dark:hover:text-neutral-300 font-medium border border-neutral-800">Log in</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" className="font-semibold">Get Started</Button>
            </Link>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-24">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-900/50 text-neutral-600 dark:text-neutral-300 rounded-full text-sm font-semibold mb-6 border border-neutral-300 dark:border-neutral-700/50">
            <span className="w-2 h-2 bg-neutral-950 dark:bg-white rounded-full animate-pulse"></span>
            Trusted by 500+ businesses
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-7xl text-neutral-950 dark:text-white mb-6 leading-tight tracking-tight">
            <span className="whitespace-nowrap">Stop chasing payments.</span><br/>
            <span className="text-neutral-500 dark:text-neutral-300 whitespace-nowrap">Start getting paid.</span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-neutral-600 dark:text-neutral-300 mb-10 max-w-2xl leading-relaxed mx-auto px-2 sm:px-0">
            Automated payment reminders, smart invoicing, and real-time tracking. Join 500+ businesses that get paid on time, every time.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="font-semibold w-full sm:w-auto">
                Get Started Free
              </Button>
            </Link>
            <a href="#how-it-works" className="text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
              See How It Works →
            </a>
          </div>
          <div className="mt-12 sm:mt-16 grid grid-cols-3 gap-4 sm:gap-8 max-w-xl mx-auto">
            <div>
              <div className="text-2xl sm:text-4xl font-bold text-neutral-950 dark:text-white mb-1">60%</div>
              <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Faster payments</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-bold text-neutral-950 dark:text-white mb-1">500+</div>
              <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Businesses</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-bold text-neutral-950 dark:text-white mb-1">$2M+</div>
              <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">Invoices processed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Illustrative Feature Cards */}
      <section className="px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-neutral-950 dark:text-white mb-4 tracking-tight">
            Everything you need to get paid
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto px-2">
            Powerful tools designed to streamline your invoicing and improve cash flow.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 sm:w-8 sm:h-8">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            ), title: 'Auto Reminders', desc: 'Never chase a payment again with smart automated reminders.' },
            { icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 sm:w-8 sm:h-8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            ), title: 'Smart Invoicing', desc: 'Create professional invoices in seconds with templates.' },
            { icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 sm:w-8 sm:h-8">
                <path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>
              </svg>
            ), title: 'Real-time Tracking', desc: 'Track status, history, and overdue accounts live.' },
            { icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 sm:w-8 sm:h-8">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            ), title: 'Global Payments', desc: 'Accept Stripe, Paynow, EcoCash, and bank transfers.' },
            { icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 sm:w-8 sm:h-8">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            ), title: 'PDF Export', desc: 'Download and share professional PDF invoices anywhere.' },
            { icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 sm:w-8 sm:h-8">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            ), title: 'Customer Portal', desc: 'Let clients view and pay invoices from a branded portal.' },
          ].map((card, i) => (
            <div key={i} className="bg-neutral-50 dark:bg-neutral-900 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
              <div className="text-neutral-950 dark:text-white mb-3 sm:mb-4">
                {card.icon}
              </div>
              <h3 className="font-semibold text-neutral-950 dark:text-white mb-1 sm:mb-2 text-sm sm:text-base">{card.title}</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20 bg-neutral-100 dark:bg-neutral-900/30 rounded-3xl border border-neutral-200 dark:border-neutral-800/50">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-neutral-950 dark:text-white mb-4 tracking-tight">
            How It Works
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto px-2">
            From invoice to payment in three simple steps.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-neutral-900 rounded-2xl border border-neutral-700 flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <span className="font-display font-bold text-xl text-white">1</span>
            </div>
            <h3 className="font-semibold text-neutral-950 dark:text-white mb-2 text-base sm:text-lg">Create Invoice</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">Generate professional invoices in seconds with customizable templates.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-neutral-900 rounded-2xl border border-neutral-700 flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <span className="font-display font-bold text-xl text-white">2</span>
            </div>
            <h3 className="font-semibold text-neutral-950 dark:text-white mb-2 text-base sm:text-lg">Set Reminders</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">Configure automatic reminders at the perfect intervals.</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-neutral-900 rounded-2xl border border-neutral-700 flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <span className="font-display font-bold text-xl text-white">3</span>
            </div>
            <h3 className="font-semibold text-neutral-950 dark:text-white mb-2 text-base sm:text-lg">Get Paid</h3>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">Accept payments via Stripe, Paynow, or bank transfer.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-neutral-950 dark:text-white mb-4 tracking-tight">
            Built for serious businesses
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto px-2">
            Powerful features designed to streamline your invoicing workflow and improve cash flow.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          <div className="bg-neutral-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-neutral-800">
            <h3 className="font-semibold text-white mb-2 text-base sm:text-lg">Automated Reminders</h3>
            <p className="text-neutral-300 text-sm">Set it and forget it. Automatic email reminders at the perfect time to maximize payment collection.</p>
          </div>
          <div className="bg-neutral-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-neutral-800">
            <h3 className="font-semibold text-white mb-2 text-base sm:text-lg">Smart Invoicing</h3>
            <p className="text-neutral-300 text-sm">Create professional invoices in seconds with customizable templates and automatic calculations.</p>
          </div>
          <div className="bg-neutral-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-neutral-800">
            <h3 className="font-semibold text-white mb-2 text-base sm:text-lg">Multiple Payments</h3>
            <p className="text-neutral-300 text-sm">Accept payments via Stripe, Paynow, and more. Global reach with local payment methods.</p>
          </div>
          <div className="bg-neutral-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-neutral-800">
            <h3 className="font-semibold text-white mb-2 text-base sm:text-lg">BOQ/BOM Engine</h3>
            <p className="text-neutral-300 text-sm">Smart material estimation with price suggestions and location-based pricing within 150km radius.</p>
          </div>
          <div className="bg-neutral-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-neutral-800">
            <h3 className="font-semibold text-white mb-2 text-base sm:text-lg">Quotation & Proforma</h3>
            <p className="text-neutral-300 text-sm">Generate professional quotations and proforma invoices with PDF export.</p>
          </div>
          <div className="bg-neutral-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-neutral-800">
            <h3 className="font-semibold text-white mb-2 text-base sm:text-lg">Real-time Tracking</h3>
            <p className="text-neutral-300 text-sm">Track invoice status, payment history, and overdue accounts in real-time.</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-neutral-950 dark:text-white mb-4 tracking-tight">
            Loved by businesses worldwide
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto px-2">
            See what our customers have to say about InvoiceChaser.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <svg key={i} viewBox="0 0 24 24" className="w-5 h-5 fill-white stroke-none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
            <p className="text-white mb-6 leading-relaxed">"InvoiceChaser has transformed how we handle payments. Our overdue rate dropped by 60% in the first month."</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center text-white font-bold border border-neutral-700">SM</div>
              <div>
                <div className="font-semibold text-white">Sarah Mitchell</div>
                <div className="text-sm text-neutral-300">CEO, TechStart Inc</div>
              </div>
            </div>
          </div>
          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <svg key={i} viewBox="0 0 24 24" className="w-5 h-5 fill-white stroke-none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
            <p className="text-white mb-6 leading-relaxed">"The automated reminders are a game-changer. I used to spend hours chasing payments. Now it happens automatically."</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center text-white font-bold border border-neutral-700">JC</div>
              <div>
                <div className="font-semibold text-white">James Chen</div>
                <div className="text-sm text-neutral-300">Freelance Designer</div>
              </div>
            </div>
          </div>
          <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800">
            <div className="flex items-center gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <svg key={i} viewBox="0 0 24 24" className="w-5 h-5 fill-white stroke-none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
            <p className="text-white mb-6 leading-relaxed">"Simple, elegant, and effective. InvoiceChaser does exactly what it promises. Best investment for our business."</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center text-white font-bold border border-neutral-700">EK</div>
              <div>
                <div className="font-semibold text-white">Emily Kim</div>
                <div className="text-sm text-neutral-300">Founder, Creative Studio</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-neutral-950 dark:text-white mb-4 tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto px-2">
            Choose the plan that fits your business. No hidden fees, cancel anytime.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 lg:gap-10 max-w-6xl mx-auto">
          <div className="bg-neutral-900 p-6 sm:p-8 rounded-2xl border border-neutral-800">
            <h3 className="font-display font-semibold text-lg text-white mb-2">Starter</h3>
            <div className="font-display font-bold text-3xl sm:text-4xl text-white mb-2">$4.99<span className="text-lg text-neutral-300 font-normal">/mo</span></div>
            <p className="text-sm text-neutral-300 mb-6">For freelancers</p>
            <ul className="text-sm text-white space-y-3 mb-8">
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>100 invoices/month</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>Email reminders</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>PDF export</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>Basic analytics</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>Customer management</li>
            </ul>
            <Link to="/register?plan=starter" className="block">
              <Button variant="default" className="w-full font-medium bg-white text-black hover:bg-neutral-200 border-white text-center justify-center">Get Started</Button>
            </Link>
          </div>
          <div className="bg-neutral-100 dark:bg-neutral-900/50 p-6 sm:p-8 rounded-2xl border-2 border-neutral-200 dark:border-white relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-neutral-950 dark:bg-white dark:text-neutral-950 font-semibold text-xs px-4 py-1.5 rounded-full whitespace-nowrap">Most Popular</div>
            <h3 className="font-display font-semibold text-lg text-neutral-950 dark:text-white mb-2">Professional</h3>
            <div className="font-display font-bold text-3xl sm:text-4xl text-neutral-950 dark:text-white mb-2">$11.99<span className="text-lg text-neutral-500 dark:text-neutral-300 font-normal">/mo</span></div>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">For growing businesses</p>
            <ul className="text-sm text-neutral-700 dark:text-neutral-200 space-y-3 mb-8">
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-400 fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>Unlimited invoices</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-400 fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>Full automation</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-400 fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>BOQ/BOM Engine</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-400 fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>API access</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-400 fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>Advanced analytics</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-neutral-400 fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>Priority support</li>
            </ul>
            <Link to="/register?plan=professional" className="block">
              <Button variant="default" className="w-full bg-white text-neutral-950 hover:bg-neutral-200 border-white font-semibold text-center justify-center">Get Started</Button>
            </Link>
          </div>
          <div className="bg-neutral-900 p-6 sm:p-8 rounded-2xl border border-neutral-800">
            <h3 className="font-display font-semibold text-lg text-white mb-2">Business</h3>
            <div className="font-display font-bold text-3xl sm:text-4xl text-white mb-2">$29.99<span className="text-lg text-neutral-300 font-normal">/mo</span></div>
            <p className="text-sm text-neutral-300 mb-6">For teams & agencies</p>
            <ul className="text-sm text-white space-y-3 mb-8">
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>Multi-user access (5 users)</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>White-label invoices</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>Team collaboration</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>Custom branding</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>Priority support</li>
              <li className="flex items-center gap-2"><svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>SLA guarantee</li>
            </ul>
            <Link to="/register?plan=business" className="block">
              <Button variant="default" className="w-full font-medium bg-white text-black hover:bg-neutral-200 border-white text-center justify-center">Get Started</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Lifetime Pricing removed - moved to PlansPage */}

      {/* FAQ */}
      <section id="faq" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-neutral-950 dark:text-white mb-4 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 max-w-2xl mx-auto px-2">
            Got questions? We've got answers.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
          <div className="bg-neutral-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-neutral-800">
            <h3 className="font-semibold text-white mb-2 text-sm sm:text-base">How does the free trial work?</h3>
            <p className="text-neutral-300 text-sm">Start with a 14-day free trial. No credit card required. Cancel anytime during the trial.</p>
          </div>
          <div className="bg-neutral-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-neutral-800">
            <h3 className="font-semibold text-white mb-2 text-sm sm:text-base">Can I switch plans later?</h3>
            <p className="text-neutral-300 text-sm">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
          </div>
          <div className="bg-neutral-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-neutral-800">
            <h3 className="font-semibold text-white mb-2 text-sm sm:text-base">What payment methods do you accept?</h3>
            <p className="text-neutral-300 text-sm">We accept Stripe, Paynow (for Zimbabwe), and major credit cards. All payments are secure.</p>
          </div>
          <div className="bg-neutral-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-neutral-800">
            <h3 className="font-semibold text-white mb-2 text-sm sm:text-base">Is my data secure?</h3>
            <p className="text-neutral-300 text-sm">Absolutely. We use industry-standard encryption and security measures. Your data is stored securely on Supabase.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="bg-neutral-100 dark:bg-neutral-900/50 rounded-3xl p-8 sm:p-12 text-center border border-neutral-300 dark:border-neutral-700/50">
          <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-neutral-950 dark:text-white mb-4 tracking-tight">
            Ready to get paid faster?
          </h2>
          <p className="text-neutral-600 dark:text-neutral-300 mb-6 sm:mb-8 text-base sm:text-lg max-w-2xl mx-auto">
            Join 500+ businesses already using InvoiceChaser to automate their invoicing and get paid on time.
          </p>
          <Link to="/register" className="inline-block w-full sm:w-auto">
            <Button variant="default" size="lg" className="w-full sm:w-auto bg-white text-neutral-950 hover:bg-neutral-200 border-2 border-black font-semibold text-center justify-center">
              Get Started Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 border-t border-neutral-200 dark:border-neutral-800/50">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-neutral-950 dark:fill-white">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <span className="font-display font-bold text-neutral-950 dark:text-white text-base">InvoiceChaser</span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 text-center">© 2026 InvoiceChaser. All rights reserved.</p>
          <div className="flex items-center gap-4 sm:gap-6">
            <a href="#" className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors font-medium">Privacy</a>
            <a href="#" className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors font-medium">Terms</a>
            <a href="#" className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors font-medium">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
