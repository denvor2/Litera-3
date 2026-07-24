import { useState } from 'react'
import { API_BASE } from '../config'
import './Login.css'

interface LoginProps {
  onLoginSuccess: () => void
  onClose?: () => void
}

export function Login({ onLoginSuccess, onClose }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Ошибка входа')
        setLoading(false)
        return
      }

      const data = await response.json()
      if (data.success) {
        onLoginSuccess()
      } else {
        setError(data.error || 'Ошибка входа')
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка подключения')
    } finally {
      setLoading(false)
    }
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClose) {
      onClose()
    }
  }

  return (
    <>
      {onClose && <div className="login-overlay" onClick={handleOverlayClick} />}
      <div className="login-container">
        <div className="login-box">
          <h1>LitStudio</h1>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="primary" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <p className="help-text">
            Для входа используйте учетные данные администратора
          </p>
        </div>
      </div>
    </>
  )
}
