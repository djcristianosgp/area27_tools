import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { 
  Network, Play, Loader2, Power, Globe, Edit2, Check, X, RefreshCw 
} from 'lucide-react';

interface NetworkDevice {
  id: number;
  ipAddress: string;
  macAddress: string | null;
  hostname: string | null;
  vendor: string | null;
  latencyMs: number | null;
  isOnline: boolean;
  lastSeen: string;
  customName: string | null;
}

export const NetworkScannerWidget: React.FC = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState<string>('');

  // Fetch devices
  const { data: devices, isLoading, error, refetch } = useQuery<NetworkDevice[]>({
    queryKey: ['network-devices'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/network/devices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao obter dispositivos da rede.');
      return res.json();
    },
    refetchInterval: 30000 // Refresh list every 30 seconds
  });

  // Trigger scan mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:5000/api/network/scan', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Falha ao iniciar escaneamento.');
      }
      return res.json();
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['network-devices'] });
      }, 5000); // Invalidate after 5 seconds to let the scan progress
    }
  });

  // Wake on Lan mutation
  const wakeMutation = useMutation({
    mutationFn: async (mac: string) => {
      const res = await fetch('http://localhost:5000/api/network/wake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ macAddress: mac })
      });
      if (!res.ok) throw new Error('Erro ao enviar sinal WOL.');
      return res.json();
    }
  });

  // Update Custom Name mutation
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(`http://localhost:5000/api/network/devices/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ customName: name || null })
      });
      if (!res.ok) throw new Error('Erro ao atualizar nome.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-devices'] });
      setEditingId(null);
    }
  });

  const handleStartRename = (device: NetworkDevice) => {
    setEditingId(device.id);
    setEditName(device.customName || '');
  };

  const handleSaveRename = (id: number) => {
    renameMutation.mutate({ id, name: editName });
  };

  const activeCount = devices?.filter(d => d.isOnline).length || 0;

  return (
    <div className="bg-[#1f2833] p-6 rounded-2xl border border-[#45f3ff]/10 h-full flex flex-col justify-between min-h-[450px]">
      <div>
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-950/40 rounded-xl border border-cyan-500/20 text-[#66fcf1]">
              <Network size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-wide text-sm sm:text-base">Scanner de Rede Local</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {activeCount} ativos de {devices?.length || 0} dispositivos mapeados
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition"
              title="Atualizar Tabela"
            >
              <RefreshCw size={14} />
            </button>
            <button
              disabled={scanMutation.isPending}
              onClick={() => scanMutation.mutate()}
              className="flex items-center gap-1.5 bg-[#66fcf1]/10 border border-[#66fcf1]/30 hover:bg-[#66fcf1]/20 text-[#66fcf1] py-1.5 px-3 rounded-lg text-xs font-bold transition disabled:opacity-40"
            >
              {scanMutation.isPending ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Varrendo...
                </>
              ) : (
                <>
                  <Play size={13} />
                  Escanear
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg mb-4">
            Não foi possível carregar a lista de dispositivos.
          </div>
        )}

        {/* Devices Table/List */}
        <div className="bg-[#0b0c10] rounded-xl border border-gray-800 max-h-[280px] overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-xs gap-2">
              <Loader2 size={24} className="animate-spin text-[#66fcf1]" />
              Carregando dispositivos...
            </div>
          ) : !devices || devices.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs">
              Nenhum dispositivo mapeado. Clique em Escanear.
            </div>
          ) : (
            <div className="divide-y divide-gray-900">
              {devices.map((device) => (
                <div key={device.id} className="p-3 flex items-center justify-between text-xs hover:bg-gray-800/10 transition">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Status indicator */}
                    <span className={`h-2 w-2 rounded-full ${device.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-700'}`} />
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {editingId === device.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="bg-gray-900 border border-gray-700 text-white rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-cyan-500"
                              placeholder="Apelido..."
                              autoFocus
                            />
                            <button onClick={() => handleSaveRename(device.id)} className="text-emerald-400 hover:text-emerald-300">
                              <Check size={12} />
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-red-400 hover:text-red-300">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-bold text-white">
                              {device.customName || device.hostname || 'Sem nome'}
                            </span>
                            <button onClick={() => handleStartRename(device)} className="text-gray-500 hover:text-gray-300">
                              <Edit2 size={10} />
                            </button>
                          </>
                        )}
                        {device.latencyMs !== null && device.isOnline && (
                          <span className="text-[10px] text-emerald-400 font-semibold">{device.latencyMs}ms</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 flex flex-wrap gap-x-2 mt-0.5">
                        <span>IP: <strong className="text-gray-400">{device.ipAddress}</strong></span>
                        {device.macAddress && (
                          <span>MAC: <strong className="text-gray-400">{device.macAddress}</strong></span>
                        )}
                        {device.vendor && (
                          <span className="text-cyan-500/80 italic font-medium">({device.vendor})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-1.5 ml-2">
                    {/* Web link shortcut */}
                    <a
                      href={`http://${device.ipAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-gray-900 rounded border border-gray-800 text-gray-400 hover:text-[#66fcf1] transition"
                      title="Abrir no Navegador"
                    >
                      <Globe size={12} />
                    </a>

                    {/* WOL action */}
                    {device.macAddress && (
                      <button
                        onClick={() => wakeMutation.mutate(device.macAddress!)}
                        disabled={wakeMutation.isPending}
                        className="p-1.5 hover:bg-gray-900 rounded border border-gray-800 text-gray-400 hover:text-orange-400 transition disabled:opacity-40"
                        title="Enviar Wake-on-LAN (Ligar)"
                      >
                        <Power size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
