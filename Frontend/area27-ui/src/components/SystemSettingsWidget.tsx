import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import {
  Database,
  Server,
  Clock,
  Cpu,
  Globe,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface SystemInfo {
  version: string;
  environment: string;
  uptimeSeconds: number;
  machineName: string;
  osVersion: string;
  databaseProvider: string;
}

const API = 'http://localhost:5000';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon, label, value, accent }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-800/60 last:border-0">
    <div className="flex items-center gap-2 text-gray-500">
      {icon}
      <span className="text-[11px]">{label}</span>
    </div>
    <span className={`text-[11px] font-semibold font-mono ${accent ? 'text-[#66fcf1]' : 'text-gray-200'}`}>
      {value}
    </span>
  </div>
);

export const SystemSettingsWidget: React.FC = () => {
  const { token } = useAuthStore();
  const headers = { Authorization: `Bearer ${token}` };

  const {
    data: info,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<SystemInfo>({
    queryKey: ['system-info'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/updater/info`, { headers });
      if (!res.ok) throw new Error('Falha ao obter informações do sistema');
      return res.json();
    },
    refetchInterval: 30_000, // refresh every 30s for uptime
  });

  const dbColor = info?.databaseProvider === 'PostgreSQL'
    ? 'text-blue-400'
    : 'text-emerald-400';

  const envColor = info?.environment === 'Production'
    ? 'text-emerald-400'
    : 'text-amber-400';

  return (
    <div className="bg-[#1f2833] rounded-2xl border border-[#45f3ff]/10 p-6 flex flex-col gap-4 shadow-xl h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-xl border border-teal-500/20">
            <Server size={20} className="text-teal-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Configurações do Sistema</h3>
            <p className="text-[10px] text-gray-500">Informações de runtime & banco de dados</p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg bg-[#0b0c10] hover:bg-gray-900 border border-gray-800 text-gray-500 hover:text-gray-300 transition"
          title="Atualizar"
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="text-teal-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-red-400">Erro ao carregar informações.</p>
        </div>
      ) : info ? (
        <div className="flex flex-col gap-1 flex-1">
          {/* DB Section */}
          <div className="bg-[#0b0c10]/50 rounded-xl p-4 border border-gray-800 mb-2">
            <div className="flex items-center gap-2 mb-3">
              <Database size={14} className="text-gray-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Banco de Dados</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className={`text-sm font-bold ${dbColor}`}>{info.databaseProvider}</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Conectado
              </span>
            </div>
          </div>

          {/* Runtime Info */}
          <div className="bg-[#0b0c10]/50 rounded-xl p-4 border border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Cpu size={14} className="text-gray-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Runtime</span>
            </div>

            <InfoRow
              icon={<RefreshCw size={12} />}
              label="Versão"
              value={`v${info.version}`}
              accent
            />
            <InfoRow
              icon={<Globe size={12} />}
              label="Ambiente"
              value={
                <span className={envColor}>{info.environment}</span>
              }
            />
            <InfoRow
              icon={<Clock size={12} />}
              label="Uptime"
              value={formatUptime(info.uptimeSeconds)}
            />
            <InfoRow
              icon={<Server size={12} />}
              label="Máquina"
              value={info.machineName}
            />
            <InfoRow
              icon={<Cpu size={12} />}
              label="Sistema Operacional"
              value={info.osVersion.length > 22 ? info.osVersion.substring(0, 22) + '…' : info.osVersion}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
