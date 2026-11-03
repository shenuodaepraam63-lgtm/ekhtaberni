export type TeacherStatus = 'pending' | 'active' | 'rejected'

export type Subject =
  | 'physics' | 'chemistry' | 'biology' | 'philosophy'
  | 'math' | 'science' | 'social' | 'history'
  | 'geography' | 'psychology' | 'english' | 'arabic' | 'other'

export interface Teacher {
  id: string
  user_id: string
  name: string
  phone: string
  subject: Subject
  status: TeacherStatus
  created_at: string
}

export interface Group {
  id: string
  teacher_id: string
  name: string
  message: string | null
  created_at: string
}

export interface Student {
  id: string
  group_id: string
  name: string
  phone: string
  code: string
  is_active: boolean
  created_at: string
}

export type QuestionType = 'mcq' | 'true_false' | 'fill' | 'essay' | 'match' | 'order'
export type ExamStatus = 'draft' | 'scheduled' | 'active' | 'closed'
export type ExamLayout = 1 | 2 | 3 | 4 | 5 | 6

export interface Exam {
  id: string
  teacher_id: string
  title: string
  layout_type: ExamLayout
  scheduled_at: string | null
  duration_mins: number | null
  status: ExamStatus
  created_at: string
}

export interface Question {
  id: string
  exam_id: string
  type: QuestionType
  content: string
  options: string[] | null
  correct_answer: unknown
  points: number
  media_url: string | null
  order_index: number
}

export interface Submission {
  id: string
  student_id: string
  exam_id: string
  answers: Record<string, unknown>
  auto_score: number | null
  essay_score: number | null
  total_score: number | null
  cheat_log: CheatEvent[]
  submitted_at: string
  attempt_num: number
}

export interface CheatEvent {
  type: 'tab_switch' | 'window_blur' | 'fullscreen_exit'
  timestamp: string
}
