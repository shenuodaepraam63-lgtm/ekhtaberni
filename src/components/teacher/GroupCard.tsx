import { motion } from 'framer-motion'
import { Group } from '../../types'
import { SubjectTheme } from '../../theme/subjectThemes'

interface GroupCardProps {
  group: Group
  theme: SubjectTheme
  isEnglish: boolean
  isSelected: boolean
  onClick: () => void
}

export default function GroupCard({ group, theme, isEnglish, isSelected, onClick }: GroupCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`text-right w-full bg-white rounded-2xl p-6 shadow-md transition-all hover:shadow-xl border-2 relative overflow-hidden ${
        isSelected ? 'border-current shadow-lg' : 'border-transparent'
      }`}
      style={isSelected ? { borderColor: theme.bgColor } : {}}
    >
      {/* Background accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(90deg, ${theme.color}, ${theme.bgColor})` }}
      />

      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black shadow-md"
          style={{ background: `linear-gradient(135deg, ${theme.color}, ${theme.bgColor})` }}
        >
          {group.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-gray-800 text-lg truncate">{group.name}</h3>
          {isSelected && (
            <span className="text-xs font-bold" style={{ color: theme.bgColor }}>
              {isEnglish ? '● Selected' : '● محدد'}
            </span>
          )}
        </div>
        {isSelected && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
            style={{ background: theme.bgColor }}
          >✓</div>
        )}
      </div>

      {group.message ? (
        <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">{group.message}</p>
      ) : (
        <p className="text-gray-300 text-sm italic">
          {isEnglish ? 'No message set' : 'لا توجد رسالة'}
        </p>
      )}
    </motion.button>
  )
}
