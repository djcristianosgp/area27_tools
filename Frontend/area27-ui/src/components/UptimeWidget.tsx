import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Activity, Plus, Trash2, Edit2, Play, Pause } from 'lucide-react';

interface UptimeCheck {
  id: string;
  name: string;
  target: string;
  protocol: string;
  port: number | null;
  checkIntervalSeconds: number;
  isActive: boolean;
  status: string;
  lastChecked: string | null;
  averageLatencyMs: number;
}

interface HistoryPoint {
  id: string;
  timestamp: string;
  isSuccess: boolean;
  latencyMs: number;
}

export const UptimeWidget: React.FC = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCheckId, setSelectedCheckId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [protocol, setProtocol] = useState('HTTP');
  const [port, setPort] = useState<number | ''>('');
  const [interval, setInterval] = useState(60);

  // Fetch checks
  const { data: checks, error } = useQuery<UptimeCheck[]>({
    queryKey: ['uptime-checks'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/uptime/checks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar monitoramentos.');
      return res.json();
    },
    refetchInterval: 10000 // Poll checks every 10s
  });

  // Fetch history for selected check
  const { data: selectedHistory } = useQuery<HistoryPoint[]>({
    queryKey: ['uptime-history', selectedCheckId],
    queryFn: async () => {
      if (!selectedCheckId) return [];
      const res = await fetch(`http://localhost:5000/api/uptime/checks/${selectedCheckId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar histórico.');
      return res.json();
    },
    enabled: !!selectedCheckId,
    refetchInterval: 5000
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:5000/api/uptime/checks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          target,
          protocol,
          port: port === '' ? null : Number(port),
          checkIntervalSeconds: Number(interval)
        })
      });
      if (!res.ok) throw new Error('Erro ao salvar.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uptime-checks'] });
      resetForm();
    }
  });

  // Update mutation (toggle active, etc.)
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UptimeCheck> }) => {
      const res = await fetch(`http://localhost:5000/api/uptime/checks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Erro ao atualizar.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uptime-checks'] });
      setEditingId(null);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`http://localhost:5000/api/uptime/checks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao deletar.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uptime-checks'] });
      if (selectedCheckId) setSelectedCheckId(null);
    }
  });

  const resetForm = () => {
    setName('');
    setTarget('');
    setProtocol('HTTP');
    setPort('');
    setInterval(60);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEditClick = (check: UptimeCheck) => {
    setName(check.name);
    setTarget(check.target);
    setProtocol(check.protocol);
    setPort(check.port ?? '');
    setInterval(check.checkIntervalSeconds);
    setEditingId(check.id);
    setIsAdding(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          name,
          target,
          protocol,
          port: port === '' ? null : Number(port),
          checkIntervalSeconds: Number(interval)
        }
      });
    } else {
      createMutation.mutate();
    }
  };

  // Helper to draw SVG sparkline
  const renderSparkline = (points: HistoryPoint[] | undefined) => {
    if (!points || points.length === 0) return null;
    const height = 30;
    const width = 120;
    const padding = 2;

    const latencies = points.map((p) => (p.isSuccess ? p.latencyMs : 0));
    const maxLat = Math.max(...latencies, 50);
    const minLat = Math.min(...latencies, 0);
    const range = maxLat - minLat || 1;

    const coords = points.map((p, index) => {
      const x = padding + (index / (points.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p.latencyMs - minLat) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    const pathD = `M ${coords.join(' L ')}`;

    return (
      <svg className="h-8 w-28 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <path
          d={pathD}
          fill="none"
          stroke="#66fcf1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-[0_0_2px_#66fcf1]"
        />
      </svg>
    );
  };

  return (
    <div className="bg-[#1f2833] rounded-xl border border-[#45f3ff]/10 shadow-lg p-6 flex flex-col h-full min-h-[380px]">
      {/* Widget Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0b0c10] rounded-lg text-[#66fcf1]">
            <Activity size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Monitoramento de Uptime</h3>
            <p className="text-xs text-gray-400">Verifique a saúde de suas URLs e IPs</p>
          </div>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 bg-[#66fcf1]/10 hover:bg-[#66fcf1]/20 border border-[#66fcf1]/30 text-[#66fcf1] py-1.5 px-3 rounded-lg text-xs font-semibold transition"
          >
            <Plus size={14} /> Adicionar
          </button>
        )}
      </div>

      {/* Adding/Editing Form */}
      {isAdding ? (
        <form onSubmit={handleSave} className="space-y-4 bg-[#0b0c10]/40 p-4 rounded-lg border border-gray-800 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Nome do Alvo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Google"
                className="w-full bg-[#0b0c10] border border-gray-800 text-white rounded-lg py-1.5 px-3 text-sm focus:border-[#66fcf1] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Protocolo</label>
              <select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                className="w-full bg-[#0b0c10] border border-gray-800 text-white rounded-lg py-1.5 px-3 text-sm focus:border-[#66fcf1] focus:outline-none"
              >
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
                <option value="PING">Ping (ICMP)</option>
                <option value="TCP">TCP Port</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Host / URL</label>
              <input
                type="text"
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="Ex: google.com ou 8.8.8.8"
                className="w-full bg-[#0b0c10] border border-gray-800 text-white rounded-lg py-1.5 px-3 text-sm focus:border-[#66fcf1] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {protocol === 'TCP' && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Porta TCP</label>
                <input
                  type="number"
                  required
                  value={port}
                  onChange={(e) => setPort(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="80"
                  className="w-full bg-[#0b0c10] border border-gray-800 text-white rounded-lg py-1.5 px-3 text-sm focus:border-[#66fcf1] focus:outline-none"
                />
              </div>
            )}
            <div className={protocol === 'TCP' ? '' : 'col-span-2'}>
              <label className="block text-xs font-medium text-gray-400 mb-1">Intervalo (segundos)</label>
              <input
                type="number"
                required
                min="10"
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
                className="w-full bg-[#0b0c10] border border-gray-800 text-white rounded-lg py-1.5 px-3 text-sm focus:border-[#66fcf1] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-850 hover:bg-gray-800 text-gray-300 py-1.5 px-3 rounded-lg text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#66fcf1] hover:bg-[#45f3ff] text-black font-semibold py-1.5 px-3 rounded-lg text-xs transition"
            >
              Salvar
            </button>
          </div>
        </form>
      ) : null}

      {/* Error or Empty states */}
      {error && (
        <div className="text-red-400 bg-red-950/20 border border-red-500/20 p-4 rounded-lg text-xs mb-4">
          Erro ao obter dados de Uptime.
        </div>
      )}

      {/* Main List */}
      <div className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1">
        {checks?.length === 0 && !isAdding && (
          <div className="text-center py-10 text-gray-500 text-sm">
            Nenhum alvo cadastrado. Clique em Adicionar acima.
          </div>
        )}

        {checks?.map((check) => (
          <div
            key={check.id}
            onClick={() => setSelectedCheckId(check.id === selectedCheckId ? null : check.id)}
            className={`bg-[#0b0c10]/30 hover:bg-[#0b0c10]/60 p-4 rounded-xl border transition-all cursor-pointer ${
              selectedCheckId === check.id ? 'border-[#66fcf1]' : 'border-gray-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  {check.status === 'Online' ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </>
                  ) : check.status === 'Offline' ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-500"></span>
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{check.name}</h4>
                    <span className="text-[10px] bg-[#1f2833] text-gray-400 px-1.5 py-0.5 rounded font-mono">
                      {check.protocol}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 truncate max-w-[160px] md:max-w-[220px]" title={check.target}>
                    {check.target}
                    {check.port ? `:${check.port}` : ''}
                  </p>
                </div>
              </div>

              {/* Sparkline & Details */}
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Média</p>
                  <p className="text-xs font-bold text-[#66fcf1]">
                    {check.status === 'Online' ? `${check.averageLatencyMs}ms` : '--'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateMutation.mutate({ id: check.id, data: { isActive: !check.isActive } });
                    }}
                    className={`p-1.5 rounded-lg border transition ${
                      check.isActive
                        ? 'text-yellow-400 bg-yellow-950/20 border-yellow-500/20 hover:bg-yellow-950/40'
                        : 'text-emerald-400 bg-emerald-950/20 border-emerald-500/20 hover:bg-emerald-950/40'
                    }`}
                    title={check.isActive ? 'Pausar Monitoramento' : 'Retomar Monitoramento'}
                  >
                    {check.isActive ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick(check);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 bg-[#1f2833] border border-gray-800 hover:text-white hover:bg-gray-800 transition"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(check.id);
                    }}
                    className="p-1.5 rounded-lg text-red-400 bg-red-950/20 border border-red-500/20 hover:bg-red-950/40 hover:text-red-300 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>

            {/* Expandable Chart Details */}
            {selectedCheckId === check.id && selectedHistory && (
              <div className="mt-4 pt-4 border-t border-gray-800 space-y-3 animate-fadeIn">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Latência Recente:</span>
                    <span className="font-bold text-white">{check.averageLatencyMs}ms (média)</span>
                  </div>
                  <span className="text-gray-500 text-[10px]">Últimas 50 checagens</span>
                </div>

                <div className="bg-[#0b0c10] p-3 rounded-lg border border-gray-800 flex items-center justify-between">
                  <div className="flex-1">
                    {selectedHistory.length > 0 ? (
                      <div className="flex justify-center items-center w-full h-10">
                        {renderSparkline(selectedHistory)}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-gray-500 py-2">Coletando logs...</p>
                    )}
                  </div>
                </div>

                {/* History status log */}
                <div className="text-[10px] text-gray-400 grid grid-cols-2 gap-2 max-h-24 overflow-y-auto bg-[#0b0c10]/20 p-2 rounded">
                  {selectedHistory.slice(-5).reverse().map((h) => (
                    <div key={h.id} className="flex justify-between border-b border-gray-850 pb-1">
                      <span className="font-mono text-gray-500">
                        {new Date(h.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="flex items-center gap-1">
                        {h.isSuccess ? (
                          <span className="text-emerald-400">{h.latencyMs}ms</span>
                        ) : (
                          <span className="text-red-400">Falha</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
