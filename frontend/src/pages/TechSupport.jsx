import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/client'

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left py-5 flex items-start justify-between gap-4 group">
        <span className={`text-sm font-medium leading-relaxed transition-colors ${open ? 'text-primary' : 'text-dark group-hover:text-primary'}`}>
          {q}
        </span>
        <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 transition-transform text-gray-400 ${open ? 'rotate-45 text-primary' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      {open && (
        <div className="pb-5 text-sm text-gray-500 leading-relaxed -mt-1">
          {a}
        </div>
      )}
    </div>
  )
}

export default function TechSupport() {
  const [faq, setFaq] = useState([])

  useEffect(() => {
    api.get('/faqs').then(r => setFaq(r.data || [])).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-gray-50 pt-10 pb-10 md:pt-16 md:pb-14 px-6 border-b border-gray-200">
        <div className="max-w-3xl mx-auto">
          <div className="section-eyebrow">ARCHWAY 松上防水</div>
          <h1 className="text-4xl md:text-5xl font-bold text-dark tracking-tight mb-3">技術支援</h1>
          <p className="text-base md:text-lg text-gray-500 leading-relaxed">
            常見施工問題解答。找不到答案？直接來電，我們的技術人員隨時為您服務。
          </p>
        </div>
      </section>

      {/* FAQ */}
      <div className="flex-1 py-12 md:py-20 px-6">
        <div className="max-w-3xl mx-auto space-y-10">
          {faq.map(section => (
            <div key={section.category}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 pb-3 border-b border-gray-100">
                {section.category}
              </h2>
              <div>
                {section.questions.map((item, i) => (
                  <AccordionItem key={i} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <section className="bg-dark py-14 md:py-20 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <div className="text-gray-400 text-sm mb-3">遇到比較複雜的問題？</div>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-2">
            直接找我們的技術團隊
          </h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
            30 年施工經驗，免費電話諮詢，快速評估您的防水需求
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="tel:0223650047"
              className="btn-primary inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              02-2365-0047
            </a>
            <Link to="/about#contact"
              className="text-sm text-gray-400 hover:text-white transition-colors">
              或填寫線上詢問表單 ›
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
