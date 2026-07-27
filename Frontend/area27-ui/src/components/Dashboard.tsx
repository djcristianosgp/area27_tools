import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Activity, Cpu, Network, LogOut } from 'lucide-react';

interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  isEnabled: boolean;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  Activity,
  Cpu,
  Network
};

export const Dashboard: React.FC = () => {
  const { user, token, logout } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch modules
  const { data: modules, isLoading, error } = useQuery<Module[]>({
    queryKey: ['modules'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5000/api/modules', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Falha ao obter lista de módulos.');
      }
      return response.json();
    }
  });

  // Toggle module mutation
  const toggleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const response = await fetch(`http://localhost:5000/api/modules/${moduleId}/toggle`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao alternar módulo.');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0c10] text-[#66fcf1]">
        <div className="text-xl font-bold animate-pulse">Carregando painel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#c5c6c7] p-6">
      {/* Header */}
      <header className="flex justify-between items-center bg-[#1f2833] p-4 rounded-xl border border-[#45f3ff]/10 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-[#66fcf1] tracking-wide">Area27 Tools</h1>
          <p className="text-xs text-[#c5c6c7]">
            Logado como <span className="text-[#66fcf1] font-semibold">{user?.username}</span> ({user?.role})
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-200 py-2 px-4 rounded-lg transition duration-200"
        >
          <LogOut size={16} />
          Sair
        </button>
      </header>

      {/* Main Grid */}
      <main className="space-y-6">
        <div className="border-b border-[#1f2833] pb-4">
          <h2 className="text-xl font-bold text-[#66fcf1]">Central de Módulos</h2>
          <p className="text-sm text-gray-400">Ative ou desative ferramentas do sistema em tempo real</p>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500 text-red-200 p-4 rounded-lg">
            Houve um erro ao carregar os módulos. Verifique se o backend está ativo.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules?.map((mod) => {
            const IconComponent = iconMap[mod.icon] || Activity;
            return (
              <div
                key={mod.id}
                className={`bg-[#1f2833] p-6 rounded-xl border transition-all duration-300 flex flex-col justify-between ${
                  mod.isEnabled ? 'border-[#66fcf1]/40 shadow-lg shadow-[#66fcf1]/5' : 'border-gray-800 opacity-60'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-[#0b0c10] rounded-lg text-[#66fcf1]">
                      <IconComponent size={24} />
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        mod.isEnabled ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-500/30' : 'bg-gray-950/50 text-gray-400 border border-gray-700/30'
                      }`}
                    >
                      {mod.isEnabled ? 'Ativado' : 'Desativado'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{mod.name}</h3>
                  <p className="text-sm text-gray-400 mb-6">{mod.description}</p>
                </div>

                <div>
                  <button
                    onClick={() => toggleMutation.mutate(mod.id)}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition duration-200 border ${
                      mod.isEnabled
                        ? 'bg-red-950/30 hover:bg-red-900/40 text-red-300 border-red-500/20'
                        : 'bg-[#66fcf1]/10 hover:bg-[#66fcf1]/20 text-[#66fcf1] border-[#66fcf1]/20'
                    }`}
                  >
                    {mod.isEnabled ? 'Desativar Módulo' : 'Ativar Módulo'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
