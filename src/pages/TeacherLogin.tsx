import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'

export default function TeacherLogin() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center p-4" dir="rtl">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-20 right-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl" />
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, delay: 2 }}
          className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-10 shadow-2xl text-center">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-8xl mb-6"
          >🎓</motion.div>
          
          <h1 className="text-4xl font-black text-white mb-2">دخول المدرس</h1>
          <p className="text-blue-200 mb-10 text-lg">سجّل دخولك بحساب جوجل للبدء</p>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-4 bg-white rounded-2xl py-5 px-6 font-black text-gray-700 hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl text-lg"
          >
            <svg className="w-7 h-7" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            تسجيل الدخول بجوجل
          </motion.button>

          <div className="mt-4 bg-white/10 rounded-2xl p-4 text-right">
            <p className="text-blue-200 text-sm font-bold mb-2">ملاحظة:</p>
            <ul className="text-blue-300 text-sm space-y-1">
              <li>• بعد تسجيل الدخول ستحتاج موافقة الأدمن</li>
              <li>• اشتراك شهري بـ 400 جنيه مصري</li>
            </ul>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10">
            <Link to="/" className="text-blue-300 text-sm hover:text-white transition-colors font-semibold">
              ← العودة للصفحة الرئيسية
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
