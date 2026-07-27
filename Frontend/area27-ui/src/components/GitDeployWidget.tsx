import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { GitBranch, Play, Trash2, Plus, X, Copy } from 'lucide-react';

interface GitRepository {
  id: number;
  name: string;
  localPath: string;
  branch: string;
  webhookToken: string;
  postDeployCmd: string | null;
  lastDeployTime: string | null;
  lastDeployStatus: string;
  lastDeployLog: string | null;
}

export const GitDeployWidget: React.FC = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [branch, setBranch] = useState('main');
  const [postDeployCmd, setPostDeployCmd] = useState('');

  // Fetch repositories
  const { data: repos, isLoading } = useQuery<GitRepository[]>({
    queryKey: ['git-repositories'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/git/repositories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao listar repositórios.');
      return res.json();
    }
  });

  // Create Repo Mutation
  const createRepoMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:5000/api/git/repositories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          localPath,
          branch,
          postDeployCmd: postDeployCmd || null
        })
      });
      if (!res.ok) throw new Error('Erro ao cadastrar repositório.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-repositories'] });
      setIsCreating(false);
      setName('');
      setLocalPath('');
      setBranch('main');
      setPostDeployCmd('');
    }
  });

  // Delete Repo Mutation
  const deleteRepoMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:5000/api/git/repositories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao excluir repositório.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-repositories'] });
      if (selectedRepoId) setSelectedRepoId(null);
    }
  });

  // Trigger manual deploy mutation
  const triggerDeployMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:5000/api/git/repositories/${id}/deploy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao disparar deploy.');
      return res.json();
    },
    onSuccess: () => {
      // Reload repositories after 2 seconds to see log updates
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['git-repositories'] });
      }, 2000);
    }
  });

  const getWebhookUrl = (webhookToken: string) => {
    return `http://localhost:5000/api/git/webhook/${webhookToken}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link do Webhook copiado para a área de transferência!');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'text-emerald-400 border-emerald-500/20 bg-emerald-950/20';
      case 'failed':
        return 'text-red-400 border-red-500/20 bg-red-950/20';
      default:
        return 'text-gray-400 border-gray-800 bg-gray-950/20';
    }
  };

  return (
    <div className="bg-[#1f2833] rounded-xl border border-[#45f3ff]/10 p-6 flex flex-col h-full shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#45f3ff]/5 rounded-full filter blur-xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Git & Deploy Automatizado
          </h3>
          <p className="text-xs text-gray-400">Integração contínua e atualização automática de projetos</p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#45f3ff]/10 hover:bg-[#45f3ff]/20 text-[#45f3ff] rounded-lg border border-[#45f3ff]/30 text-xs font-bold transition duration-200"
        >
          <Plus size={14} />
          Novo Projeto
        </button>
      </div>

      {/* Repos list and Log details split layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left column: List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#45f3ff] uppercase tracking-wider mb-2">Repositórios Monitorados</h4>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Carregando repositórios...</div>
            ) : repos?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">Nenhum repositório cadastrado.</div>
            ) : (
              repos?.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRepoId(selectedRepoId === r.id ? null : r.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    selectedRepoId === r.id
                      ? 'bg-[#0b0c10]/60 border-[#45f3ff]/40'
                      : 'bg-[#0b0c10]/30 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-white text-sm block">{r.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono block truncate max-w-[240px]">
                        {r.localPath} ({r.branch})
                      </span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => triggerDeployMutation.mutate(r.id)}
                        disabled={triggerDeployMutation.isPending}
                        className="p-1 bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-400 rounded transition border border-emerald-500/20"
                        title="Disparar Deploy"
                      >
                        <Play size={12} />
                      </button>

                      <button
                        onClick={() => deleteRepoMutation.mutate(r.id)}
                        className="p-1 bg-red-950/20 hover:bg-red-900/40 text-red-400 rounded transition border border-red-500/20"
                        title="Remover"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-900 text-[10px] font-mono">
                    <div className="text-gray-500">
                      Último deploy: <span className="text-gray-300">{formatDate(r.lastDeployTime)}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded border ${getStatusColor(r.lastDeployStatus)}`}>
                      {r.lastDeployStatus}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Log Details and Webhook Link */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#45f3ff] uppercase tracking-wider mb-2">Detalhes & Webhook</h4>

          {selectedRepoId ? (
            (() => {
              const r = repos?.find((repo) => repo.id === selectedRepoId);
              if (!r) return null;
              return (
                <div className="bg-[#0b0c10]/40 p-4 rounded-xl border border-gray-800 space-y-4">
                  {/* Webhook Url Section */}
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">URL DO WEBHOOK</span>
                    <div className="flex bg-gray-950 p-2 rounded border border-gray-800 justify-between items-center font-mono text-[9px] gap-2">
                      <span className="text-gray-400 truncate">{getWebhookUrl(r.webhookToken)}</span>
                      <button
                        onClick={() => copyToClipboard(getWebhookUrl(r.webhookToken))}
                        className="p-1 hover:bg-gray-800 text-[#45f3ff] rounded transition"
                        title="Copiar Link"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Deploy command if any */}
                  {r.postDeployCmd && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 block mb-1">COMANDO PÓS-DEPLOY</span>
                      <code className="text-[10px] text-purple-400 font-mono bg-purple-950/20 px-2 py-1 rounded block border border-purple-500/10">
                        {r.postDeployCmd}
                      </code>
                    </div>
                  )}

                  {/* Deploy Logs */}
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">LOG DO ÚLTIMO DEPLOY</span>
                    <pre className="text-[9px] text-gray-300 font-mono bg-gray-950 p-3 rounded border border-gray-850 h-[140px] overflow-y-auto whitespace-pre-wrap select-text">
                      {r.lastDeployLog || 'Nenhum deploy realizado ainda.'}
                    </pre>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-800 rounded-xl text-gray-500 text-xs">
              Selecione um projeto para ver o link do webhook e logs de deploy.
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#0b0c10]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1f2833] border border-[#45f3ff]/20 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#0b0c10]/40">
              <h3 className="font-bold text-white flex items-center gap-2">
                <GitBranch size={18} className="text-[#45f3ff]" />
                Adicionar Projeto Git
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Nome do Projeto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Area27 Tools Host"
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Caminho Local do Repositório Git (pasta com .git)</label>
                <input
                  type="text"
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder="c:/AtualDev/Prototipo/area27_tools"
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Branch (ex: main, master)</label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  placeholder="main"
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Comando Pós-Deploy (ex: dotnet publish, docker compose restart)</label>
                <input
                  type="text"
                  value={postDeployCmd}
                  onChange={(e) => setPostDeployCmd(e.target.value)}
                  placeholder="docker compose up --build -d"
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40 font-mono"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#0b0c10]/40 flex justify-end gap-3">
              <button
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg border border-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => createRepoMutation.mutate()}
                disabled={!name || !localPath || createRepoMutation.isPending}
                className="px-4 py-2 bg-[#45f3ff]/10 hover:bg-[#45f3ff]/20 text-[#45f3ff] text-xs font-bold rounded-lg border border-[#45f3ff]/30 transition disabled:opacity-50"
              >
                Cadastrar Projeto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
