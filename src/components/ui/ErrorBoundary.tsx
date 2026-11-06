import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  title?: string
}

interface ErrorBoundaryState {
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="app-error-boundary" role="alert">
        <strong>{this.props.title ?? 'Bu bölüm yüklenirken hata oluştu'}</strong>
        <p className="app-error-boundary__message">{error.message}</p>
        <p className="app-error-boundary__hint">
          Uygulamayı yeniden başlatın. Sorun devam ederse geliştirici konsolundaki (Ctrl+Shift+I)
          hata metnini paylaşın.
        </p>
      </div>
    )
  }
}
