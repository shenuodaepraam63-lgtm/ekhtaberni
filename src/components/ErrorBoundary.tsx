import React from 'react'

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6"
        >
          <div className="max-w-md text-center space-y-4">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
            <p className="text-white/70 text-sm leading-relaxed">
              حاول تحديث الصفحة. لو المشكلة مستمرة، افتح أدوات المطور (F12)
              وانظر إلى تبويب Console لمعرفة التفاصيل.
            </p>
            {this.state.error && (
              <pre className="text-left text-xs bg-black/40 p-3 rounded-lg overflow-auto max-h-32 text-red-300">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold transition-colors"
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
