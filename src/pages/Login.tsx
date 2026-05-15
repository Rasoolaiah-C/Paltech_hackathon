import type { FormEvent } from 'react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LocationState {
  from?: {
    pathname?: string;
  };
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const { loading, login, register, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';

  if (!loading && user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }

      navigate(redirectTo, { replace: true });
    } catch (error) {
      setError((error as Error).message);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Habit Tracker</p>
          <h1>{isRegister ? 'Create account' : 'Welcome back'}</h1>
        </div>

        {error && <p className="form-error">{error}</p>}

        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        <label>
          Password
          <input
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            required
            type="password"
            value={password}
          />
        </label>

        <button className="button" disabled={loading} type="submit">
          {isRegister ? 'Register' : 'Login'}
        </button>

        <button
          className="button button--ghost"
          onClick={() => {
            setError('');
            setIsRegister((current) => !current);
          }}
          type="button"
        >
          {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
        </button>
      </form>
    </main>
  );
}
