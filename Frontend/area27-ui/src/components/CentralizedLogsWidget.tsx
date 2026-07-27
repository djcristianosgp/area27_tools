import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { FileText, Search, RefreshCw, Trash2, Plus, X, AlertCircle } from 'lucide-react';

interface LogSource {
  id: number;
  name: string;
  type: string; // File, Docker, Journal
  path: string;
}

export const CentralizedLogsWidget: React.FC = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedSourceId, setSelectedSourceId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [logLimit, setLogLimit] = useState(100);
  const [isAddingSource, setIsAddingSource] = useState(false);

  // Form states for new source
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('File'); // File, Docker, Journal
  const [newPath, setNewPath] = useState('');

  // Fetch log sources
  const { data: sources, isLoading: loadingSources } = useQuery<LogSource[]>({
    queryKey: ['log-sources'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/logs/sources', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar fontes de log.');
      const data = await res.json();
      
      // Auto-select the first source if none selected
      if (data.length > 0 && selectedSourceId === null) {
        setSelectedSourceId(data[0].id);
      }
      return data;
    }
  });

  // Query logs
  const { data: logLines, isLoading: loadingLogs, error: logsErr, refetch: queryLogs } = useQuery<string[]>({
    queryKey: ['logs-query', selectedSourceId, searchQuery, severityFilter, logLimit],
    queryFn: async () => {
      if (!selectedSourceId) return [];
      const url = `http://localhost:5000/api/logs/query?sourceId=${selectedSourceId}&query=${encodeURIComponent(searchQuery)}&severity=${encodeURIComponent(severityFilter)}&limit=${logLimit}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao carregar logs.');
      }
      return res.json();
    },
    enabled: !!selectedSourceId
  });

  // Create Log Source Mutation
  const createSourceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:5000/api/logs/sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName,
          type: newType,
          path: newPath
        })
      });
      if (!res.ok) throw new Error('Erro ao criar fonte de logs.');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['log-sources'] });
      setSelectedSourceId(data.id);
      setIsAddingSource(false);
      setNewName('');
      setNewPath('');
    }
  });

  // Delete Log Source Mutation
  const deleteSourceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:5000/api/logs/sources/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao remover fonte de logs.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-sources'] });
      setSelectedSourceId(null);
    }
  });

  const getLineColor = (line: string) => {
    const l = line.toUpperCase();
    if (l.includes('ERROR') || l.includes('FAIL') || l.includes('ERR')) return 'text-red-400';
    if (l.includes('WARNING') || l.includes('WARN')) return 'text-yellow-400';
    if (l.includes('INFO')) return 'text-cyan-400';
    return 'text-gray-300';
  };

  return (
    <div className="bg-[#1f2833] rounded-xl border border-[#45f3ff]/10 p-6 flex flex-col h-full shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#45f3ff]/5 rounded-full filter blur-xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
            Logs Centralizados
          </h3>
          <p className="text-xs text-gray-400">Analise e pesquise logs de containers e do host em tempo real</p>
        </div>

        <button
          onClick={() => setIsAddingSource(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#45f3ff]/10 hover:bg-[#45f3ff]/20 text-[#45f3ff] rounded-lg border border-[#45f3ff]/30 text-xs font-bold transition duration-200"
        >
          <Plus size={14} />
          Nova Origem
        </button>
      </div>

      {logsErr && (
        <div className="bg-red-950/40 border border-red-500/30 text-red-200 text-xs p-3 rounded-lg mb-4 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{logsErr.message}</span>
        </div>
      )}

      {/* Main Grid split: left Sources list, right Logs terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Sources list */}
        <div className="lg:col-span-1 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-[#45f3ff] uppercase tracking-wider mb-2">Origens de Logs</h4>
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
              {loadingSources ? (
                <div className="text-xs text-gray-500">Carregando...</div>
              ) : sources?.length === 0 ? (
                <div className="text-xs text-gray-500">Nenhuma origem cadastrada.</div>
              ) : (
                sources?.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSourceId(s.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition flex justify-between items-center ${
                      selectedSourceId === s.id
                        ? 'bg-[#0b0c10]/60 border-[#45f3ff]/40'
                        : 'bg-[#0b0c10]/20 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white block truncate">{s.name}</span>
                      <span className="text-[9px] text-gray-400 font-mono block uppercase">{s.type}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSourceMutation.mutate(s.id);
                      }}
                      className="p-1 text-gray-500 hover:text-red-400 transition"
                      title="Remover Origem"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right column: Log Search filters and Terminal */}
        <div className="lg:col-span-3 flex flex-col h-full space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center bg-[#0b0c10]/30 p-3 rounded-lg border border-gray-800">
            <div className="flex-1 min-w-[150px] relative">
              <input
                type="text"
                placeholder="Pesquisar termo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0b0c10] border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-[#45f3ff]/30 pl-7"
              />
              <Search size={12} className="absolute left-2.5 top-2 text-gray-500" />
            </div>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-[#0b0c10] border border-gray-800 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-[#45f3ff]/30"
            >
              <option value="">Todas Severidades</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>

            <select
              value={logLimit}
              onChange={(e) => setLogLimit(Number(e.target.value))}
              className="bg-[#0b0c10] border border-gray-800 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-[#45f3ff]/30"
            >
              <option value={100}>100 linhas</option>
              <option value={200}>200 linhas</option>
              <option value={500}>500 linhas</option>
            </select>

            <button
              onClick={() => queryLogs()}
              disabled={loadingLogs || !selectedSourceId}
              className="p-1.5 bg-gray-850 hover:bg-gray-800 text-[#45f3ff] border border-gray-700 rounded transition"
              title="Recarregar Logs"
            >
              <RefreshCw size={12} className={loadingLogs ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Terminal output */}
          <div className="bg-[#0b0c10] rounded-xl border border-gray-850 p-4 font-mono text-[10px] text-gray-300 h-[280px] overflow-y-auto space-y-1 select-text scrollbar-thin">
            {loadingLogs ? (
              <div className="text-center py-16 text-gray-500">Consultando fonte de logs...</div>
            ) : logLines?.length === 0 ? (
              <div className="text-center py-16 text-gray-500">Nenhuma linha de log encontrada correspondente aos filtros.</div>
            ) : (
              logLines?.map((line, idx) => (
                <div key={idx} className={`whitespace-pre-wrap hover:bg-gray-900 px-1 py-0.5 rounded transition ${getLineColor(line)}`}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Creation Modal */}
      {isAddingSource && (
        <div className="fixed inset-0 bg-[#0b0c10]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1f2833] border border-[#45f3ff]/20 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#0b0c10]/40">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-[#45f3ff]" />
                Nova Origem de Logs
              </h3>
              <button
                onClick={() => setIsAddingSource(false)}
                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Nome Amigável</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Backend Logs"
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Tipo de Origem</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40"
                >
                  <option value="File">Arquivo de Log Local</option>
                  <option value="Docker">Logs de Container Docker</option>
                  <option value="Journal">Journalctl do Sistema (Apenas Linux)</option>
                </select>
              </div>

              {newType !== 'Journal' && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    {newType === 'File' ? 'Caminho absoluto do arquivo (.log / .txt)' : 'Nome ou ID do container Docker'}
                  </label>
                  <input
                    type="text"
                    value={newPath}
                    onChange={(e) => setNewPath(e.target.value)}
                    placeholder={newType === 'File' ? 'c:/logs/api.log' : 'area27_tools-backend-1'}
                    className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40 font-mono"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#0b0c10]/40 flex justify-end gap-3">
              <button
                onClick={() => setIsAddingSource(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-lg border border-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => createSourceMutation.mutate()}
                disabled={!newName || (newType !== 'Journal' && !newPath) || createSourceMutation.isPending}
                className="px-4 py-2 bg-[#45f3ff]/10 hover:bg-[#45f3ff]/20 text-[#45f3ff] text-xs font-bold rounded-lg border border-[#45f3ff]/30 transition disabled:opacity-50"
              >
                Salvar Origem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
