import { Link } from 'react-router-dom'
import Button from '../components/Button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-hover rounded-xl flex items-center justify-center shadow-glow">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <span className="font-display font-bold text-slate-900 text-base">InvoiceChaser</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-900">Log in</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" className="shadow-glow">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 lg:py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-light text-brand-text rounded-full text-sm font-medium mb-8 animate-pulse-slow">
            <span className="w-2 h-2 bg-brand rounded-full"></span>
            Trusted by 500+ businesses
          </div>
          <h1 className="font-display font-bold text-5xl lg:text-7xl text-slate-900 mb-6 leading-tight">
            Never chase an invoice again
          </h1>
          <p className="text-lg lg:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Automated payment reminders, smart invoicing, and real-time tracking. Get paid faster with InvoiceChaser.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register">
              <Button variant="primary" size="lg" className="shadow-glow hover:scale-105 transition-transform">
                Start Free Trial
              </Button>
            </Link>
            <Button variant="ghost" size="lg" className="group">
              <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2 stroke-current fill-none stroke-2 group-hover:scale-110 transition-transform">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-3xl lg:text-4xl text-slate-900 mb-4">
            Everything you need to get paid
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Powerful features designed to streamline your invoicing workflow and improve cash flow.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="group bg-white p-8 rounded-2xl border border-slate-200 hover:border-brand/30 hover:shadow-glow transition-all duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-brand-light to-brand/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-brand fill-none stroke-2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-xl text-slate-900 mb-3">Automated Reminders</h3>
            <p className="text-slate-600 leading-relaxed">Set it and forget it. Automatic email reminders at the perfect time to maximize payment collection.</p>
          </div>
          <div className="group bg-white p-8 rounded-2xl border border-slate-200 hover:border-brand/30 hover:shadow-glow transition-all duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-accent-light to-accent/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-accent fill-none stroke-2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-xl text-slate-900 mb-3">Smart Invoicing</h3>
            <p className="text-slate-600 leading-relaxed">Create professional invoices in seconds with customizable templates and automatic calculations.</p>
          </div>
          <div className="group bg-white p-8 rounded-2xl border border-slate-200 hover:border-brand/30 hover:shadow-glow transition-all duration-300">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg viewBox="0 0 24 24" className="w-7 h-7 stroke-purple-600 fill-none stroke-2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            </div>
            <h3 className="font-display font-semibold text-xl text-slate-900 mb-3">Multiple Payments</h3>
            <p className="text-slate-600 leading-relaxed">Accept payments via Stripe, Paynow, and more. Global reach with local payment methods.</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-3xl lg:text-4xl text-slate-900 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Choose the plan that fits your business. No hidden fees, cancel anytime.
          </p>
        </div>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-brand/30 hover:shadow-soft transition-all duration-300">
            <h3 className="font-display font-semibold text-lg text-slate-900 mb-2">Basic</h3>
            <div className="font-display font-bold text-4xl text-slate-900 mb-2">$2.99<span className="text-lg text-slate-500 font-normal">/mo</span></div>
            <p className="text-sm text-slate-500 mb-6">Perfect for freelancers</p>
            <ul className="text-sm text-slate-600 space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-brand fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                20 invoices/month
              </li>
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-brand fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                Email reminders
              </li>
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-brand fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                Basic analytics
              </li>
            </ul>
            <Link to="/register" className="block">
              <Button variant="default" className="w-full">Get Started</Button>
            </Link>
          </div>
          <div className="bg-gradient-to-b from-brand to-brand-hover p-8 rounded-2xl border-2 border-brand shadow-glow relative transform hover:scale-105 transition-all duration-300">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-brand font-semibold text-xs px-4 py-1.5 rounded-full shadow-soft">Most Popular</div>
            <h3 className="font-display font-semibold text-lg text-white mb-2">Pro</h3>
            <div className="font-display font-bold text-4xl text-white mb-2">$9.99<span className="text-lg text-white/80 font-normal">/mo</span></div>
            <p className="text-sm text-white/80 mb-6">For growing businesses</p>
            <ul className="text-sm text-white space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                Unlimited invoices
              </li>
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                Full automation
              </li>
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-white fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                Advanced analytics
              </li>
            </ul>
            <Link to="/register" className="block">
              <Button variant="default" className="w-full bg-white text-brand hover:bg-slate-50 border-white">Get Started</Button>
            </Link>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-brand/30 hover:shadow-soft transition-all duration-300">
            <h3 className="font-display font-semibold text-lg text-slate-900 mb-2">Business</h3>
            <div className="font-display font-bold text-4xl text-slate-900 mb-2">$29.99<span className="text-lg text-slate-500 font-normal">/mo</span></div>
            <p className="text-sm text-slate-500 mb-6">For teams & agencies</p>
            <ul className="text-sm text-slate-600 space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-brand fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                Team features
              </li>
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-brand fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                API access
              </li>
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-brand fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                Priority support
              </li>
            </ul>
            <Link to="/register" className="block">
              <Button variant="default" className="w-full">Get Started</Button>
            </Link>
          </div>
          <div className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-brand/30 hover:shadow-soft transition-all duration-300">
            <h3 className="font-display font-semibold text-lg text-slate-900 mb-2">Lifetime</h3>
            <div className="font-display font-bold text-4xl text-slate-900 mb-2">$99<span className="text-lg text-slate-500 font-normal">once</span></div>
            <p className="text-sm text-slate-500 mb-6">Best value</p>
            <ul className="text-sm text-slate-600 space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-brand fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                Pay once, own forever
              </li>
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-brand fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                No subscription
              </li>
              <li className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-brand fill-none stroke-2"><polyline points="20 6 9 17 4 12"/></svg>
                Core features
              </li>
            </ul>
            <Link to="/register" className="block">
              <Button variant="default" className="w-full">Get Started</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-brand to-brand-hover rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <span className="font-display font-bold text-slate-900 text-base">InvoiceChaser</span>
          </div>
          <p className="text-sm text-slate-500">© 2025 InvoiceChaser. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Privacy</a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Terms</a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
