const prefix = (examId: string, studentId: string) => `ekhtaberni_exam_${examId}_${studentId}`

export interface ExamDraft {
  answers: Record<string, unknown>
  cheatLog: { type: string; timestamp: string }[]
  cheatWarnings: number
}

export function loadExamDraft(examId: string, studentId: string): ExamDraft | null {
  try {
    const raw = localStorage.getItem(`${prefix(examId, studentId)}_draft`)
    if (!raw) return null
    return JSON.parse(raw) as ExamDraft
  } catch {
    return null
  }
}

export function saveExamDraft(examId: string, studentId: string, draft: ExamDraft) {
  try {
    localStorage.setItem(`${prefix(examId, studentId)}_draft`, JSON.stringify(draft))
  } catch {}
}

export function getOrCreateDeadline(examId: string, studentId: string, durationMins: number | null) {
  const key = `${prefix(examId, studentId)}_deadline`
  try {
    const saved = localStorage.getItem(key)
    if (saved) {
      const n = Number(saved)
      if (!Number.isNaN(n)) return n
    }
  } catch {}
  if (!durationMins || durationMins <= 0) return null
  const deadline = Date.now() + durationMins * 60 * 1000
  try { localStorage.setItem(key, String(deadline)) } catch {}
  return deadline
}

export function clearExamSession(examId: string, studentId: string) {
  const p = prefix(examId, studentId)
  try {
    localStorage.removeItem(`${p}_draft`)
    localStorage.removeItem(`${p}_deadline`)
  } catch {}
}
