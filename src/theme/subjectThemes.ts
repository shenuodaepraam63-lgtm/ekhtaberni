import { Subject } from '../types'

export interface SubjectTheme {
  label: string
  labelEn: string
  color: string
  bgColor: string
  lightBg: string
  icon: string
  lang: 'ar' | 'en'
}

export const subjectThemes: Record<Subject, SubjectTheme> = {
  physics: {
    label: 'فيزياء', labelEn: 'Physics',
    color: '#1e3a8a', bgColor: '#1e40af', lightBg: '#dbeafe',
    icon: '⚛️', lang: 'ar',
  },
  chemistry: {
    label: 'كيمياء', labelEn: 'Chemistry',
    color: '#166534', bgColor: '#15803d', lightBg: '#dcfce7',
    icon: '🧪', lang: 'ar',
  },
  biology: {
    label: 'أحياء', labelEn: 'Biology',
    color: '#14532d', bgColor: '#16a34a', lightBg: '#f0fdf4',
    icon: '🧬', lang: 'ar',
  },
  math: {
    label: 'رياضيات', labelEn: 'Mathematics',
    color: '#581c87', bgColor: '#7e22ce', lightBg: '#f3e8ff',
    icon: '📐', lang: 'ar',
  },
  philosophy: {
    label: 'فلسفة', labelEn: 'Philosophy',
    color: '#713f12', bgColor: '#92400e', lightBg: '#fef3c7',
    icon: '🏛️', lang: 'ar',
  },
  science: {
    label: 'علوم', labelEn: 'Science',
    color: '#0e7490', bgColor: '#0891b2', lightBg: '#cffafe',
    icon: '🔬', lang: 'ar',
  },
  social: {
    label: 'دراسات اجتماعية', labelEn: 'Social Studies',
    color: '#9a3412', bgColor: '#ea580c', lightBg: '#ffedd5',
    icon: '👥', lang: 'ar',
  },
  history: {
    label: 'تاريخ', labelEn: 'History',
    color: '#78350f', bgColor: '#92400e', lightBg: '#fef3c7',
    icon: '📜', lang: 'ar',
  },
  geography: {
    label: 'جغرافيا', labelEn: 'Geography',
    color: '#075985', bgColor: '#0284c7', lightBg: '#e0f2fe',
    icon: '🌍', lang: 'ar',
  },
  psychology: {
    label: 'علم نفس', labelEn: 'Psychology',
    color: '#9d174d', bgColor: '#be185d', lightBg: '#fdf2f8',
    icon: '🧠', lang: 'ar',
  },
  english: {
    label: 'English', labelEn: 'English',
    color: '#991b1b', bgColor: '#dc2626', lightBg: '#fee2e2',
    icon: '🇬🇧', lang: 'en',
  },
  arabic: {
    label: 'لغة عربية', labelEn: 'Arabic',
    color: '#78350f', bgColor: '#b45309', lightBg: '#fef9c3',
    icon: '📖', lang: 'ar',
  },
  other: {
    label: 'أخرى', labelEn: 'Other',
    color: '#1f2937', bgColor: '#374151', lightBg: '#f3f4f6',
    icon: '📚', lang: 'ar',
  },
}
