export default function Maintenance() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #2B1010 0%, #3D1010 100%)' }}>
      <div className="text-center">
        <img src="/logo-horizontal.png" alt="松上防水" className="h-16 w-auto object-contain mx-auto mb-8 opacity-90" />
        <div className="text-6xl mb-6">🔧</div>
        <h1 className="text-3xl font-bold text-white mb-4">網站維護中</h1>
        <p className="text-gray-300 text-lg mb-2">我們正在進行系統更新，請稍後再訪。</p>
        <p className="text-gray-400 text-sm">We'll be back shortly.</p>
        <div className="mt-10 text-gray-500 text-sm space-y-1">
          <p>📞 02-23650047</p>
          <p>💬 LINE：@archway</p>
          <p>✉️ archway1991@gmail.com</p>
        </div>
      </div>
    </div>
  )
}
