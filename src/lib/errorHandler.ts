/**
 * Error Handler - معالج أخطاء شامل للتطبيق
 * - ترجمة الأخطاء إلى رسائل عربية واضحة
 * - إعادة محاولة ذكية للعمليات المهمة
 * - تسجيل الأخطاء للتصحيح
 */

export type ErrorCode = 
  | 'network_error'
  | 'timeout'
  | 'auth_failed'
  | 'student_not_found'
  | 'exam_not_found'
  | 'submission_failed'
  | 'server_error'
  | 'offline'
  | 'unknown'

export interface AppError {
  code: ErrorCode
  message: string
  details?: unknown
}

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  network_error: 'خطأ في الاتصال. تحقق من الإنترنت وأعد المحاولة.',
  timeout: 'انتهت مهلة الانتظار. اتصالك بطيء جداً.',
  auth_failed: 'فشل التحقق من هويتك. سجل الدخول مجدداً.',
  student_not_found: 'الطالب غير موجود في النظام.',
  exam_not_found: 'الاختبار غير موجود أو تم حذفه.',
  submission_failed: 'فشل إرسال الاختبار. تحقق من البيانات وأعد المحاولة.',
  server_error: 'خطأ في الخادم. حاول لاحقاً.',
  offline: 'أنت غير متصل بالإنترنت. متابعة الاختبار محفوظة محلياً.',
  unknown: 'حدث خطأ غير متوقع. حاول مجدداً.',
}

export class ErrorHandler {
  /**
   * معالجة خطأ من Supabase أو API
   */
  static handle(error: unknown): AppError {
    // تحقق من الاتصال
    if (!navigator.onLine) {
      return {
        code: 'offline',
        message: ERROR_MESSAGES.offline,
        details: error,
      }
    }

    // معالجة أخطاء Supabase
    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>

      // خطأ قاعدة البيانات
      if ((err as { code?: string }).code === 'PGRST116') {
        return {
          code: 'student_not_found',
          message: ERROR_MESSAGES.student_not_found,
          details: error,
        }
      }

      // خطأ عدم المصادقة
      if (typeof (err as { status?: unknown }).status === 'number' && (err as { status: number }).status === 401) {
        return {
          code: 'auth_failed',
          message: ERROR_MESSAGES.auth_failed,
          details: error,
        }
      }

      // خطأ الخادم
      if (typeof (err as { status?: unknown }).status === 'number' && (err as { status: number }).status >= 500) {
        return {
          code: 'server_error',
          message: ERROR_MESSAGES.server_error,
          details: error,
        }
      }

      // انتهاء الوقت
      if (typeof (err as { message?: unknown }).message === 'string' && (err as { message: string }).message.includes('timeout')) {
        return {
          code: 'timeout',
          message: ERROR_MESSAGES.timeout,
          details: error,
        }
      }
    }

    // خطأ عام
    return {
      code: 'unknown',
      message: ERROR_MESSAGES.unknown,
      details: error,
    }
  }

  /**
   * إعادة محاولة عملية بذكاء
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options?: {
      maxRetries?: number
      delayMs?: number
      backoffMultiplier?: number
      shouldRetry?: (error: AppError) => boolean
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3
    const delayMs = options?.delayMs ?? 500
    const backoffMultiplier = options?.backoffMultiplier ?? 2
    const shouldRetry = options?.shouldRetry ?? (err => err.code !== 'auth_failed')

    let lastError: AppError | null = null
    let delay = delayMs

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = this.handle(error)

        // لا تحاول مجدداً إذا كان الخطأ لا يسمح بذلك
        if (!shouldRetry(lastError)) {
          throw lastError
        }

        // إذا كانت آخر محاولة، ارفع الخطأ
        if (attempt === maxRetries - 1) {
          throw lastError
        }

        // انتظر قبل إعادة المحاولة
        await new Promise(resolve => setTimeout(resolve, delay))
        delay *= backoffMultiplier
      }
    }

    throw lastError
  }

  /**
   * تسجيل خطأ للتصحيح
   */
  static log(error: AppError, context?: string): void {
    const log = {
      timestamp: new Date().toISOString(),
      code: error.code,
      message: error.message,
      context,
      details: error.details,
    }

    // في الإنتاج، أرسل إلى Sentry أو logging service
    console.error('[AppError]', log)

    // احفظ في localStorage للتطوير
    try {
      const logs = JSON.parse(localStorage.getItem('ekhtaberni_error_logs') || '[]')
      logs.push(log)
      if (logs.length > 50) logs.shift() // احفظ آخر 50 خطأ فقط
      localStorage.setItem('ekhtaberni_error_logs', JSON.stringify(logs))
    } catch {
      // تجاهل أخطاء localStorage
    }
  }

  /**
   * الحصول على رسالة خطأ صديقة للمستخدم
   */
  static getUserMessage(error: AppError): string {
    return ERROR_MESSAGES[error.code] || error.message
  }
}

export default ErrorHandler
