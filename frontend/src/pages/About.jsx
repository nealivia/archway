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

      {/* Stores */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark mb-2">門市據點</h2>
            <p className="text-gray-500">歡迎親臨各門市洽詢</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                name: '和平店',
                address: '台北市中正區和平西路一段136號1樓',
                mapUrl: 'https://maps.google.com/?q=台北市中正區和平西路一段136號1樓',
                phone: '02-2365-0047',
                hours: '週一至週六 07:00-19:00'
              },
              {
                name: '板橋店',
                address: '新北市板橋區中山路二段384號1樓',
                mapUrl: 'https://maps.google.com/?q=新北市板橋區中山路二段384號1樓',
                phone: '02-2957-6311',
                hours: '週一至週五 07:00-19:00'
              },
              {
                name: '樹林 Sika 展示店',
                address: '新北市樹林區東興街37號1樓',
                mapUrl: 'https://maps.google.com/?q=新北市樹林區東興街37號1樓',
                phone: '02-8685-8039',
                hours: '週一至週五 08:00-17:00'
              }
            ].map(store => (
              <div key={store.name} className="bg-white border border-gray-200 p-6 rounded-sm hover:shadow-md transition-shadow">
                <h3 className="font-bold text-dark text-lg mb-4 pb-3 border-b border-gray-100">{store.name}</h3>
                <div className="space-y-3">
                  <a href={store.mapUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 text-sm text-gray-600 hover:text-primary transition-colors group">
                    <span className="text-lg mt-0.5">📍</span>
                    <span className="group-hover:underline leading-relaxed">{store.address}</span>
                  </a>
                  <a href={`tel:${store.phone.replace(/-/g, '')}`}
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-primary transition-colors">
                    <span className="text-lg">📞</span>
                    <span>{store.phone}</span>
                  </a>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="text-lg">🕐</span>
                    <span>{store.hours}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-dark mb-2">聯絡我們</h2>
            <p className="text-gray-500">填寫表單，我們將於一個工作天內回覆</p>
          </div>
          <div className="grid md:grid-cols-2 gap-10">
            <div className="space-y-5">
              <a href="https://line.me/R/ti/p/@archway" target="_blank" rel="noopener noreferrer"
                className="flex gap-4 hover:text-primary transition-colors group">
                <span className="text-2xl">💬</span>
                <div>
                  <div className="text-sm text-gray-400 font-medium">LINE</div>
                  <div className="text-dark font-medium group-hover:text-primary">@archway</div>
                </div>
              </a>
              <a href="mailto:archway1991@gmail.com" className="flex gap-4 hover:text-primary transition-colors group">
                <span className="text-2xl">✉️</span>
                <div>
                  <div className="text-sm text-gray-400 font-medium">信箱</div>
                  <div className="text-dark font-medium group-hover:text-primary">archway1991@gmail.com</div>
                </div>
              </a>
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
