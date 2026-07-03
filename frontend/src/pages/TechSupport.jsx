import { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const FAQ = [
  {
    category: '施工前準備',
    questions: [
      {
        q: '施工前基面需要怎麼處理？',
        a: '基面必須乾淨、乾燥、無粉塵、無油污、無起砂。舊有疏鬆或剝落的材料需徹底清除，裂縫建議先填補後再進行防水施工。若基面過於乾燥，可先潤濕（飽和面乾）再施工。'
      },
      {
        q: '需要先塗底漆嗎？',
        a: '視材料與基材而定。多數水性防水塗料可免底漆直接施工。混凝土或吸水性強的基面建議先塗界面處理劑（Primer），以提升附著力。詳情請參考各產品技術文件或來電洽詢。'
      },
      {
        q: '下雨天或潮濕環境可以施工嗎？',
        a: '建議在天氣晴朗、氣溫 5–40°C、相對濕度 85% 以下時施工。部分產品（如水泥基防水材）可在潮濕面施工，但不可在積水或雨天進行。具體請參閱各產品說明。'
      }
    ]
  },
  {
    category: '施工方式',
    questions: [
      {
        q: '需要塗幾道？每道之間要等多久？',
        a: '一般建議至少 2 道，且方向交叉（橫向＋縱向）以確保均勻覆蓋。每道需待前一道完全乾燥（表乾，通常 4–8 小時）後再施作。完整乾燥時間依氣溫與濕度不同，通常為 24–72 小時。'
      },
      {
        q: '用刷子、滾筒還是噴塗？',
        a: '三種方式均可，依現場條件與產品特性選擇。刷塗適合細部角隅；滾筒效率高，適合大面積；噴塗速度最快但需專業設備。初次施工建議使用刷塗，確保滲透均勻。'
      },
      {
        q: '防水層施工完多久可以通水或踩踏？',
        a: '一般塗料乾燥後 4–8 小時可輕踩，但完整固化需 7 天。建議 24 小時後再進行淋水測試，7 天後才能恢復正常使用或覆蓋面層材料。'
      }
    ]
  },
  {
    category: '產品選擇',
    questions: [
      {
        q: '屋頂平台和浴室應該用不同的防水材料嗎？',
        a: '是的。屋頂需承受紫外線、溫差大，適合彈性高、耐候性強的防水塗料（如聚氨酯或丙烯酸系）。浴室面積小、需耐長期潮濕，可選用水泥基防水材或衛浴專用彈性防水膠，無毒環保更佳。'
      },
      {
        q: '舊有防水層可以直接覆蓋嗎？',
        a: '視舊有防水層狀況而定。若附著良好、無起鼓或剝落，部分材料可直接覆蓋。若舊層已失效、有積水或大面積開裂，建議先移除再重新施工。不確定時，請來電讓我們的技術人員協助判斷。'
      }
    ]
  }
]

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
          {FAQ.map(section => (
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
