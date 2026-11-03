import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

type Step = 'info' | 'pricing' | 'done'

export default function TeacherOnboarding() {
  const { user, refreshTeacher } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('info')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e: { name?: string; phone?: string } = {}
    if (!name.trim()) e.name = 'الاسم مطلوب'
    if (!phone.trim()) e.phone = 'رقم الهاتف مطلوب'
    else if (!/^[0-9+]{10,15}$/.test(phone.trim())) e.phone = 'رقم هاتف غير صحيح'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) setStep('pricing')
  }

  const handleAcceptPricing = async () => {
    if (!user) return
    setLoading(true)
    const { error } = await supabase.from('teachers').insert({
      user_id: user.id,
      name: name.trim(),
      phone: phone.trim(),
      subject: 'other',
      status: 'pending',
    })
    if (!error) {
      await refreshTeacher()
      setStep('done')
      setTimeout(() => navigate('/teacher/pending'), 1500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4" dir="rtl">
      <AnimatePresence mode="wait">
        {step === 'info' && (
          <motion.div key="info" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md"
          >
            <div className="text-5xl text-center mb-4">📋</div>
            <h2 className="text-2xl font-black text-gray-800 text-center mb-2">أكمل بياناتك</h2>
            <p className="text-gray-500 text-center mb-8">هذه البيانات مطلوبة للتحقق من هويتك</p>
            <form onSubmit={handleInfoSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">الاسم الكامل *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={`w-full border-2 rounded-xl px-4 py-3 text-right focus:outline-none focus:border-blue-500 ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="اسمك الكامل"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">رقم الهاتف *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className={`w-full border-2 rounded-xl px-4 py-3 text-right focus:outline-none focus:border-blue-500 ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="01xxxxxxxxx"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-colors">
                التالي ←
              </button>
            </form>
          </motion.div>
        )}

        {step === 'pricing' && (
          <motion.div key="pricing" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
            className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center"
          >
            <div className="text-5xl mb-4">💳</div>
            <h2 className="text-2xl font-black text-gray-800 mb-6">تفاصيل الاشتراك</h2>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-8">
              <p className="text-blue-800 font-bold text-lg mb-2">رسوم الاشتراك الشهري</p>
              <p className="text-5xl font-black text-blue-700 mb-2">400 <span className="text-2xl">جنيه</span></p>
              <p className="text-blue-600 text-sm">يُدفع شهرياً للحصول على الوصول الكامل للمنصة</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('info')} className="flex-1 border-2 border-gray-200 text-gray-600 py-3 rounded-2xl font-bold hover:bg-gray-50 transition-colors">
                رجوع
              </button>
              <button onClick={handleAcceptPricing} disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-2xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'جاري الإرسال...' : 'موافق ✓'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center"
          >
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-black text-gray-800">تم إرسال طلبك!</h2>
            <p className="text-gray-500 mt-2">جاري التوجيه...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
