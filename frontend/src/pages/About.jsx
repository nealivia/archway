import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function About() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="bg-dark py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-extrabold text-white mb-2">關於我們</h1>
          <p className="text-gray-400">20 年專業經驗，您最信賴的防水夥伴</p>
        </div>
      </div>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold text-dark mb-6">
              <span className="w-1 h-8 bg-primary inline-block mr-3 align-middle"></span>
              公司簡介
            </h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              松上防水成立於 1991 年，專注於高效能防水材料的銷售與工程施工。
              我們擁有超過 30 年的產業經驗，產品廣泛應用於住宅、商業、工業等各類建築工程。
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              我們的研發團隊持續投入新技術研究，結合環保理念與高性能需求，
              提供符合國際標準的防水解決方案。
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[['ISO 9001', '品質管理認證'], ['SGS 檢驗', '材料安全認證'], ['綠建材', '環保標章'], ['CNS 標準', '符合國家標準']].map(([badge, label]) => (
                <div key={badge} className="flex items-center gap-3 p-3 border border-gray-100 bg-gray-50">
                  <span className="text-primary font-bold text-sm">{badge}</span>
                  <span className="text-gray-500 text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-dark p-10 text-white">
            <h3 className="text-xl font-bold mb-8">核心數據</h3>
            {[['20+', '年產業經驗'], ['500+', '完工工程案例'], ['50+', '材料品項'], ['99%', '客戶滿意度']].map(([num, label]) => (
              <div key={label} className="flex justify-between items-center py-4 border-b border-gray-700 last:border-0">
                <span className="text-gray-400">{label}</span>
                <span className="text-primary font-extrabold text-2xl">{num}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark mb-2">聯絡我們</h2>
            <p className="text-gray-500">填寫表單，我們將於一個工作天內回覆</p>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-6">
              {[['📍', '地址', '台北市中正區和平西路一段136號1樓'], ['📞', '電話', '02-23650047'], ['💬', 'LINE', '@archway'], ['✉️', '信箱', 'archway1991@gmail.com'], ['🕐', '服務時間', '週一至週六 09:00-18:00']].map(([icon, label, value]) => (
                <div key={label} className="flex gap-4">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <div className="text-sm text-gray-400 font-medium">{label}</div>
                    <div className="text-dark font-medium">{value}</div>
                  </div>
                </div>
              ))}
            </div>
            <form className="space-y-4" onSubmit={e => e.preventDefault()}>
              <input type="text" placeholder="您的姓名 *" className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-primary" required />
              <input type="email" placeholder="電子郵件 *" className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-primary" required />
              <input type="tel" placeholder="聯絡電話" className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-primary" />
              <textarea rows={4} placeholder="詢問內容 *" className="w-full border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none" required></textarea>
              <button type="submit" className="btn-primary w-full py-3">送出詢問</button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
