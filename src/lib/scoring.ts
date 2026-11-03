import { Question } from '../types'

export interface ScoreResult {
  autoPoints: number
  autoMax: number
  essayMax: number
  totalMax: number
  auto_score: number
  essay_score: number | null
  total_score: number | null
  pendingEssay: boolean
  perQuestion: Record<string, { correct: boolean | null; points: number; earned: number }>
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
}

export function isAnswerCorrect(question: Question, answer: unknown): boolean {
  if (answer === undefined || answer === null || answer === '') return false

  if (question.type === 'essay') return false

  if (question.type === 'true_false') {
    const expected = question.correct_answer === true || question.correct_answer === 'true'
    const got = answer === true || answer === 'true'
    return expected === got
  }

  if (question.type === 'fill') {
    return normalizeText(answer) === normalizeText(question.correct_answer) && normalizeText(answer) !== ''
  }

  // mcq, match, order — exact trimmed match
  return normalizeText(answer) === normalizeText(question.correct_answer)
}

export function scoreSubmission(
  questions: Question[],
  answers: Record<string, unknown>,
  options?: { forceZero?: boolean; essayScorePoints?: number | null },
): ScoreResult {
  const perQuestion: ScoreResult['perQuestion'] = {}
  let autoPoints = 0
  let autoMax = 0
  let essayMax = 0

  for (const q of questions) {
    if (q.type === 'essay') {
      essayMax += q.points
      perQuestion[q.id] = { correct: null, points: q.points, earned: 0 }
      continue
    }
    autoMax += q.points
    const correct = isAnswerCorrect(q, answers[q.id])
    const earned = correct ? q.points : 0
    autoPoints += earned
    perQuestion[q.id] = { correct, points: q.points, earned }
  }

  const totalMax = autoMax + essayMax
  const pendingEssay = essayMax > 0 && (options?.essayScorePoints === undefined || options?.essayScorePoints === null)

  if (options?.forceZero) {
    return {
      autoPoints: 0,
      autoMax,
      essayMax,
      totalMax,
      auto_score: 0,
      essay_score: essayMax > 0 ? 0 : null,
      total_score: 0,
      pendingEssay: false,
      perQuestion,
    }
  }

  const essayPoints = pendingEssay ? 0 : Number(options?.essayScorePoints || 0)
  const earnedTotal = autoPoints + (pendingEssay ? 0 : essayPoints)
  const percent = (pts: number, max: number) => (max > 0 ? Math.round((pts / max) * 1000) / 10 : 0)

  return {
    autoPoints,
    autoMax,
    essayMax,
    totalMax,
    auto_score: percent(autoPoints, autoMax || totalMax),
    essay_score: pendingEssay ? null : percent(essayPoints, essayMax || 1),
    total_score: pendingEssay ? null : percent(earnedTotal, totalMax),
    pendingEssay,
    perQuestion,
  }
}

export function scoreLabel(score: number | null) {
  if (score === null) return 'قيد التصحيح'
  if (score >= 85) return 'ممتاز'
  if (score >= 75) return 'جيد جداً'
  if (score >= 60) return 'جيد'
  if (score >= 40) return 'مقبول'
  return 'ضعيف'
}

export function scoreColor(score: number | null) {
  if (score === null) return '#f59e0b'
  if (score >= 85) return '#16a34a'
  if (score >= 60) return '#2563eb'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}
