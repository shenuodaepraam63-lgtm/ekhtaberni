import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function LandingPage() {
  const features = [
    { icon: '🎯', title: 'اختبارات متعددة الأنماط', desc: '6 أنواع مختلفة من عرض الاختبارات' },
    { icon: '🛡️', title: 'نظام أمان متقدم', desc: 'كشف الغش التلقائي وحماية الاختبارات' },
    { icon: '📊', title: 'تحليلات شاملة', desc: 'تقارير دقيقة لأداء الطلاب' },
    { icon: '🎨', title: 'واجهات متخصصة', desc: 'تصميمات مخصصة لكل مادة دراسية' },
    { icon: '⚡', title: 'سرعة وكفاءة', desc: 'تجربة سلسة وأداء ممتاز' },
    { icon: '📱', title: 'متوافق مع الجميع', desc: 'يعمل على كل الأجهزة' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-900 text-white overflow-x-hidden" dir="rtl">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360, scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ rotate: -360, scale: [1, 1.3, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
        />
      </div>

      <div className="relative z-10">
        {/* Hero — slightly shorter on short laptop screens so features peek in */}
        <div className="min-h-[100svh] md:min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-10 sm:mb-14 w-full max-w-3xl"
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-block bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-xl border border-white/10 rounded-2xl px-4 sm:px-6 py-2 mb-6 sm:mb-8"
            >
              <span className="text-xs sm:text-sm font-bold text-purple-200">⚡ نظام اختبارات احترافي متقدم</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-6xl sm:text-8xl md:text-9xl mb-6 sm:mb-8 filter drop-shadow-2xl"
            >
              📝
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-4 sm:mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-blue-100"
            >
              اختبرني
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-lg sm:text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto leading-relaxed font-semibold px-2"
            >
              منصة الاختبارات التعليمية الأكثر تطوراً
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="text-sm sm:text-base md:text-lg text-purple-200 max-w-xl mx-auto leading-relaxed mt-3 px-2"
            >
              حلول ذكية للمدرسين والطلاب مع نظام أمان متقدم وتجربة مستخدم استثنائية
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="flex flex-col sm:flex-row sm:flex-wrap justify-center items-stretch sm:items-center gap-3 sm:gap-4 w-full max-w-xl mb-10"
          >
            <Link
              to="/teacher/login"
              className="group relative w-full sm:w-auto bg-white text-purple-900 px-8 sm:px-10 py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl hover:bg-purple-50 transition-all shadow-2xl hover:shadow-purple-500/50 hover:scale-[1.02] overflow-hidden text-center"
            >
              <span className="relative z-10 inline-flex items-center justify-center gap-2">
                🎓 دخول المدرس
                <span className="group-hover:translate-x-1 transition-transform">←</span>
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link
              to="/student"
              className="group relative w-full sm:w-auto bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-xl border-2 border-white/30 text-white px-8 sm:px-10 py-4 sm:py-5 rounded-2xl font-black text-lg sm:text-xl hover:bg-white/10 transition-all hover:scale-[1.02] overflow-hidden text-center"
            >
              <span className="relative z-10 inline-flex items-center justify-center gap-2">
                👨‍🎓 دخول الطالب
                <span className="group-hover:translate-x-1 transition-transform">←</span>
              </span>
            </Link>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-white/40 text-3xl"
            aria-hidden
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              ↓
            </motion.div>
          </motion.div>
        </div>

        {/* Features Section */}
        <div className="py-16 sm:py-20 px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto"
          >
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-center mb-3 sm:mb-4">لماذا اختبرني؟</h2>
            <p className="text-purple-200 text-center mb-10 sm:mb-16 text-base sm:text-lg">أدوات قوية لتجربة تعليمية متميزة</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {features.map((feature, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 hover:border-purple-400/50 transition-all cursor-default"
                >
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
                  <h3 className="text-lg sm:text-xl font-black mb-2 text-white">{feature.title}</h3>
                  <p className="text-purple-200 leading-relaxed text-sm sm:text-base">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="py-16 sm:py-20 px-4 sm:px-6"
        >
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-xl border border-white/20 rounded-3xl p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-4xl font-black mb-3 sm:mb-4">ابدأ الآن مع اختبرني</h2>
            <p className="text-purple-200 text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
              انضم لآلاف المدرسين والطلاب الذين يستخدمون أفضل منصة اختبارات تعليمية
            </p>
            <Link
              to="/teacher/login"
              className="inline-block w-full sm:w-auto bg-white text-purple-900 px-8 sm:px-10 py-4 rounded-2xl font-black text-lg sm:text-xl hover:bg-purple-50 transition-all shadow-2xl hover:scale-[1.02]"
            >
              ابدأ مجاناً →
            </Link>
          </div>
        </motion.div>

        {/* Footer */}
        <div className="py-8 text-center text-purple-300/60 text-sm border-t border-white/5 px-4">
          <p>© 2024 اختبرني - جميع الحقوق محفوظة</p>
        </div>
      </div>
    </div>
  )
}
