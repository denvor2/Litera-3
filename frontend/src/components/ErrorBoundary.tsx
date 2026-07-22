import React, { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '16px', color: 'var(--ink)' }}>
          <h2 style={{ color: 'var(--accent)', margin: 0 }}>Произошла ошибка</h2>
          <p style={{ margin: 0, color: 'var(--ink-2)' }}>{this.state.error?.message || 'Неизвестная ошибка'}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload() }} style={{ padding: '8px 16px' }}>
            Перезагрузить страницу
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
