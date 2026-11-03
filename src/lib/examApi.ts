import { supabase } from './supabase'
import { Question } from '../types'
import { CheatEvent } from '../types'
import { scoreSubmission } from './scoring'

export async function submitExamAttempt(params: {
  studentId: string
  examId: string
  answers: Record<string, unknown>
  cheatLog: CheatEvent[]
  forceZero: boolean
  questions: Question[]
}) {
  const scored = scoreSubmission(params.questions, params.answers, { forceZero: params.forceZero })

  const { data: rpcData, error: rpcError } = await supabase.rpc('submit_exam', {
    p_student_id: params.studentId,
    p_exam_id: params.examId,
    p_answers: params.forceZero ? {} : params.answers,
    p_cheat_log: params.cheatLog,
    p_force_zero: params.forceZero,
  })

  if (!rpcError && rpcData) {
    return { ok: true as const, scored, via: 'rpc' as const, data: rpcData }
  }

  const { data: lastSub } = await supabase
    .from('submissions')
    .select('attempt_num')
    .eq('student_id', params.studentId)
    .eq('exam_id', params.examId)
    .order('attempt_num', { ascending: false })
    .limit(1)
    .maybeSingle()

  const attemptNum = ((lastSub?.attempt_num as number) || 0) + 1

  const { error } = await supabase.from('submissions').insert({
    student_id: params.studentId,
    exam_id: params.examId,
    answers: params.forceZero ? {} : params.answers,
    cheat_log: params.cheatLog,
    auto_score: scored.auto_score,
    essay_score: scored.essay_score,
    total_score: scored.total_score,
    attempt_num: attemptNum,
  })

  if (error) return { ok: false as const, scored, error }

  return { ok: true as const, scored, via: 'insert' as const, data: null }
}

export async function gradeSubmission(submissionId: string, essayScorePercent: number, questions: Question[], answers: Record<string, unknown>) {
  const scored = scoreSubmission(questions, answers, { essayScorePoints: (essayScorePercent / 100) * questions.filter(q => q.type === 'essay').reduce((s, q) => s + q.points, 0) })

  const { error: rpcError } = await supabase.rpc('grade_essay_submission', {
    p_submission_id: submissionId,
    p_essay_percent: essayScorePercent,
  })

  if (!rpcError) return { ok: true, scored }

  const { error } = await supabase.from('submissions').update({
    essay_score: essayScorePercent,
    total_score: scored.total_score,
  }).eq('id', submissionId)

  return { ok: !error, scored }
}
