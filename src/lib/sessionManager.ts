/**
 * Session Manager - تدير جلسات الطلاب بطريقة آمنة
 * - لا تخزن معرف الطالب في localStorage
 * - تستخدم الكود فقط (الذي عام وآمن)
 * - تتحقق من صحة الجلسة في كل استعلام
 */

import { supabase } from './supabase'

interface StudentSession {
  code: string
  name: string
  timestamp: number
}

const SESSION_KEY = 'ekhtaberni_student_session'
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000 // 24 ساعة

export class SessionManager {
  /**
   * ✅ SECURITY: إنشء جلسة للطالب باستخدام الكود فقط
   */
  static async createSession(code: string): Promise<{ success: boolean; name?: string; error?: string }> {
    try {
      // تحقق من صحة الكود من قاعدة البيانات
      const { data: student, error } = await supabase
        .from('students')
        .select('id, name, code, is_active')
        .eq('code', code.trim().toUpperCase())
        .eq('is_active', true)
        .single()

      if (error || !student) {
        return { success: false, error: 'الكود غير صحيح أو الطالب غير نشط' }
      }

      // احفظ فقط الكود و اسم الطالب في الجلسة (لا تحفظ معرف الطالب)
      const session: StudentSession = {
        code: student.code,
        name: student.name,
        timestamp: Date.now(),
      }

      // احفظ في sessionStorage فقط (يُحذف عند إغلاق التاب)
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))

      return { success: true, name: student.name }
    } catch (e) {
      return { success: false, error: 'خطأ في التحقق من الجلسة' }
    }
  }

  /**
   * ✅ SECURITY: احصل على الجلسة الحالية
   */
  static getSession(): StudentSession | null {
    try {
      const data = sessionStorage.getItem(SESSION_KEY)
      if (!data) return null

      const session = JSON.parse(data) as StudentSession

      // تحقق من انتهاء الجلسة
      if (Date.now() - session.timestamp > SESSION_TIMEOUT) {
        SessionManager.clearSession()
        return null
      }

      return session
    } catch {
      return null
    }
  }

  /**
   * ✅ SECURITY: احصل على معرف الطالب من الكود الحالي
   */
  static async getStudentIdFromCode(): Promise<string | null> {
    const session = SessionManager.getSession()
    if (!session) return null

    try {
      const { data: student, error } = await supabase
        .from('students')
        .select('id')
        .eq('code', session.code)
        .single()

      if (error || !student) return null
      return student.id
    } catch {
      return null
    }
  }

  /**
   * ✅ SECURITY: احصل على اسم الطالب من الجلسة
   */
  static getStudentName(): string | null {
    const session = SessionManager.getSession()
    return session?.name || null
  }

  /**
   * ✅ SECURITY: احصل على الكود من الجلسة
   */
  static getStudentCode(): string | null {
    const session = SessionManager.getSession()
    return session?.code || null
  }

  /**
   * ✅ SECURITY: تحقق من صحة الجلسة
   */
  static isValidSession(): boolean {
    return SessionManager.getSession() !== null
  }

  /**
   * ✅ SECURITY: احذف الجلسة
   */
  static clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY)
  }

  /**
   * ✅ SECURITY: تحديث timestamp الجلسة (keep-alive)
   */
  static refreshSession(): void {
    const session = SessionManager.getSession()
    if (session) {
      session.timestamp = Date.now()
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }
  }
}

export default SessionManager
