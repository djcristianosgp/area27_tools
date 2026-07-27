import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Play, Square, RotateCw, FileText, RefreshCw, X } from 'lucide-react';

interface Port {
  privatePort: number;
  publicPort: number;
  type: string;
}

interface Container {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: Port[];
  created: string;
}

export const DockerManagerWidget: React.FC = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [selectedContainerName, setSelectedContainerName] = useState<string>('');
  const [logTail, setLogTail] = useState<number>(200);

  // Fetch containers list
  const { data: containers, isLoading, error, refetch, isRefetching } = useQuery<Container[]>({
    queryKey: ['docker-containers'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/docker/containers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao listar contêineres.');
      return res.json();
    },
    refetchInterval: 10000 // Poll every 10 seconds
  });

  // Action mutation
  const containerAction = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'start' | 'stop' | 'restart' }) => {
      const res = await fetch(`http://localhost:5000/api/docker/containers/${id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Erro ao executar ${action}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docker-containers'] });
    }
  });

  // Fetch container logs
  const { data: logs, isLoading: loadingLogs, refetch: refetchLogs } = useQuery<string[]>({
    queryKey: ['docker-container-logs', selectedContainerId, logTail],
    queryFn: async () => {
      if (!selectedContainerId) return [];
      const res = await fetch(`http://localhost:5000/api/docker/containers/${selectedContainerId}/logs?tail=${logTail}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar logs.');
      return res.json();
    },
    enabled: !!selectedContainerId
  });


  return (
    <div className="bg-[#1f2833] rounded-xl border border-[#45f3ff]/10 p-6 flex flex-col h-full shadow-lg relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#45f3ff]/5 rounded-full filter blur-xl pointer-events-none" />

      {/* Widget Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#45f3ff] animate-pulse" />
            Docker Manager
          </h3>
          <p className="text-xs text-gray-400">Status e controle de contêineres locais</p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="p-2 bg-gray-800/80 hover:bg-gray-700 text-[#45f3ff] rounded-lg border border-gray-700/50 transition duration-200 disabled:opacity-50"
        >
          <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/30 text-red-200 text-xs p-3 rounded-lg mb-4">
          Erro de conexão: {error.message}
        </div>
      )}

      {/* Containers List */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[360px] pr-1 scrollbar-thin">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500 text-sm">Carregando contêineres...</div>
        ) : containers?.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">Nenhum contêiner encontrado.</div>
        ) : (
          containers?.map((c) => (
            <div
              key={c.id}
              className="bg-[#0b0c10]/40 p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white text-sm truncate">{c.name}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      c.state.toLowerCase() === 'running' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-[10px] text-gray-500 font-mono truncate max-w-[120px]">
                    {c.id.substring(0, 12)}
                  </span>
                </div>
                <div className="text-xs text-gray-400 truncate font-mono mb-1">{c.image}</div>
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-[10px] bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700">
                    {c.status}
                  </span>
                  {c.ports.length > 0 &&
                    c.ports.slice(0, 2).map((p, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-[#45f3ff]/5 text-[#45f3ff] px-2 py-0.5 rounded border border-[#45f3ff]/10 font-mono"
                      >
                        {p.publicPort ? `${p.publicPort}->` : ''}
                        {p.privatePort}/{p.type}
                      </span>
                    ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-auto">
                <button
                  onClick={() => { setSelectedContainerId(c.id); setSelectedContainerName(c.name); }}
                  className="p-2 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg border border-gray-700 transition"
                  title="Ver Logs"
                >
                  <FileText size={14} />
                </button>

                {c.state.toLowerCase() === 'running' ? (
                  <button
                    onClick={() => containerAction.mutate({ id: c.id, action: 'stop' })}
                    disabled={containerAction.isPending}
                    className="p-2 bg-red-950/20 hover:bg-red-900/40 text-red-400 rounded-lg border border-red-500/20 transition"
                    title="Parar Contêiner"
                  >
                    <Square size={14} />
                  </button>
                ) : (
                  <button
                    onClick={() => containerAction.mutate({ id: c.id, action: 'start' })}
                    disabled={containerAction.isPending}
                    className="p-2 bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-400 rounded-lg border border-emerald-500/20 transition"
                    title="Iniciar Contêiner"
                  >
                    <Play size={14} />
                  </button>
                )}

                <button
                  onClick={() => containerAction.mutate({ id: c.id, action: 'restart' })}
                  disabled={containerAction.isPending}
                  className="p-2 bg-purple-950/20 hover:bg-purple-900/40 text-purple-400 rounded-lg border border-purple-500/20 transition"
                  title="Reiniciar Contêiner"
                >
                  <RotateCw size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Logs Modal */}
      {selectedContainerId && (
        <div className="fixed inset-0 bg-[#0b0c10]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1f2833] border border-[#45f3ff]/20 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#0b0c10]/40">
              <div>
                <h3 className="font-bold text-white flex items-center gap-2">
                  <FileText size={18} className="text-[#45f3ff]" />
                  Logs de: <span className="text-[#45f3ff]">{selectedContainerName}</span>
                </h3>
                <p className="text-xs text-gray-400">Últimas linhas de saída padrão</p>
              </div>
              <button
                onClick={() => setSelectedContainerId(null)}
                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Options */}
            <div className="p-3 bg-[#0b0c10]/20 border-b border-gray-800 flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Linhas:</label>
                <select
                  value={logTail}
                  onChange={(e) => setLogTail(Number(e.target.value))}
                  className="bg-gray-800 border border-gray-700 text-white rounded text-xs px-2 py-1 focus:outline-none"
                >
                  <option value={50}>50</option>
                  <option value={200}>200</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </select>
              </div>

              <button
                onClick={() => refetchLogs()}
                disabled={loadingLogs}
                className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-xs text-[#45f3ff] rounded-lg border border-gray-700 transition"
              >
                <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} />
                Atualizar Logs
              </button>
            </div>

            {/* Modal Logs Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#0b0c10] text-[#c5c6c7] font-mono text-xs select-text space-y-1 max-h-[50vh]">
              {loadingLogs ? (
                <div className="text-center py-10 text-gray-500">Carregando logs do container...</div>
              ) : logs?.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Nenhum log disponível.</div>
              ) : (
                logs?.map((line, idx) => (
                  <div key={idx} className="whitespace-pre-wrap hover:bg-gray-900 px-1 py-0.5 rounded transition">
                    {line}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-800 bg-[#0b0c10]/40 flex justify-end">
              <button
                onClick={() => setSelectedContainerId(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg border border-gray-700 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
