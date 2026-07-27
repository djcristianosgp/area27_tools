import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Usuário ou senha incorretos.');
      }

      const data = await response.json();
      setAuth(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-height-screen flex items-center justify-center bg-[#0b0c10] py-12 px-4 sm:px-6 lg:px-8" style={{ minHeight: '100vh' }}>
      <div className="max-w-md w-full space-y-8 bg-[#1f2833] p-8 rounded-xl shadow-2xl border border-[#45f3ff]/20">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-[#66fcf1] tracking-tight">
            Area27 Tools
          </h2>
          <p className="mt-2 text-center text-sm text-[#c5c6c7]">
            Entre para gerenciar sua infraestrutura
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/30 border border-red-500 text-red-200 px-4 py-2 rounded text-sm text-center">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#66fcf1] mb-2">Usuário</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded relative block w-full px-3 py-2 border border-[#45f3ff]/30 bg-[#0b0c10] placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-[#66fcf1] focus:border-transparent sm:text-sm"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#66fcf1] mb-2">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded relative block w-full px-3 py-2 border border-[#45f3ff]/30 bg-[#0b0c10] placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-[#66fcf1] focus:border-transparent sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-black bg-[#66fcf1] hover:bg-[#45a29e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1f2833] focus:ring-[#66fcf1] transition duration-200 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
