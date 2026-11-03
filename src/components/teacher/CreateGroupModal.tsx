import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { SubjectTheme } from '../../theme/subjectThemes'

interface CreateGroupModalProps {
  teacherId: string
  theme: SubjectTheme
  isEnglish: boolean
  onClose: () => void
  onCreated: () => void
}

export default function CreateGroupModal({ teacherId, theme, isEnglish, onClose, onCreated }: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError(isEnglish ? 'Group name is required' : 'اسم المجموعة مطلوب')
      return
    }
    setLoading(true)
    setError('')
    const { error: dbError } = await supabase
      .from('groups')
      .insert({ teacher_id: teacherId, name: name.trim(), message: null })
    setLoading(false)
    if (dbError) {
      setError(isEnglish ? 'Failed to create group' : 'فشل إنشاء المجموعة')
    } else {
      onCreated()
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
          dir={isEnglish ? 'ltr' : 'rtl'}
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg"
              style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.bgColor})` }}
            >👥</div>
            <div>
              <h2 className="text-2xl font-black text-gray-800">
                {isEnglish ? 'New Group' : 'مجموعة جديدة'}
              </h2>
              <p className="text-gray-400 text-sm">
                {isEnglish ? 'Add a student group' : 'إضافة مجموعة طلاب'}
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate}>
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                {isEnglish ? 'Group Name' : 'اسم المجموعة'}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={isEnglish ? 'e.g., Grade 10 - Section A' : 'مثال: الصف الأول الثانوي - أ'}
                className="w-full border-2 border-gray-200 rounded-2xl px-5 py-4 focus:outline-none text-lg font-semibold transition-colors"
                onFocus={e => e.target.style.borderColor = theme.bgColor}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                autoFocus
              />
              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-red-500 text-sm mt-2 font-semibold"
                >{error}</motion.p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border-2 border-gray-200 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-colors"
              >
                {isEnglish ? 'Cancel' : 'إلغاء'}
              </button>
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 text-white py-4 rounded-2xl font-black hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.bgColor})` }}
              >
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                      ...
                    </span>
                  : (isEnglish ? 'Create Group' : 'إنشاء المجموعة')
                }
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
