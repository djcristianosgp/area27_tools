import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Cpu, HardDrive, Thermometer } from 'lucide-react';

interface CurrentMetrics {
  cpuUsage: number;
  ramTotalBytes: number;
  ramUsedBytes: number;
  diskTotalBytes: number;
  diskUsedBytes: number;
  temperature: number;
}

interface MetricPoint {
  timestamp: string;
  cpuUsage: number;
  ramUsagePercent: number;
}

export const ServerMetricsWidget: React.FC = () => {
  const { token } = useAuthStore();

  // Fetch current metrics every 3 seconds
  const { data: current, error: currentErr } = useQuery<CurrentMetrics>({
    queryKey: ['server-metrics-current'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/server-metrics/current', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao obter métricas atuais.');
      return res.json();
    },
    refetchInterval: 3000
  });

  // Fetch metrics history every 3 seconds
  const { data: history, error: historyErr } = useQuery<MetricPoint[]>({
    queryKey: ['server-metrics-history'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/server-metrics/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao obter histórico.');
      return res.json();
    },
    refetchInterval: 3000
  });

  // Helpers
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getPercentage = (used: number, total: number): number => {
    if (!total) return 0;
    return Math.round((used / total) * 100);
  };

  // Helper to draw the real-time history chart in SVG
  const renderHistoryChart = (points: MetricPoint[] | undefined) => {
    if (!points || points.length === 0) {
      return (
        <div className="flex items-center justify-center h-40 text-gray-500 text-xs">
          Coletando histórico...
        </div>
      );
    }

    const height = 140;
    const width = 450;
    const padding = 15;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;

    const maxPoints = 15;
    const gridLinesCount = 4;

    // Convert values to X, Y
    const getCoords = (val: number, index: number) => {
      const x = padding + (index / (maxPoints - 1)) * chartWidth;
      const y = padding + chartHeight - (val / 100) * chartHeight;
      return { x, y };
    };

    const cpuCoords = points.map((p, idx) => getCoords(p.cpuUsage, idx));
    const ramCoords = points.map((p, idx) => getCoords(p.ramUsagePercent, idx));

    const cpuPath = cpuCoords.length > 0 ? `M ${cpuCoords.map((c) => `${c.x},${c.y}`).join(' L ')}` : '';
    const ramPath = ramCoords.length > 0 ? `M ${ramCoords.map((c) => `${c.x},${c.y}`).join(' L ')}` : '';

    // Shaded areas under paths
    const cpuAreaPath = cpuCoords.length > 0 
      ? `${cpuPath} L ${cpuCoords[cpuCoords.length - 1].x},${height - padding} L ${cpuCoords[0].x},${height - padding} Z`
      : '';
    
    const ramAreaPath = ramCoords.length > 0 
      ? `${ramPath} L ${ramCoords[ramCoords.length - 1].x},${height - padding} L ${ramCoords[0].x},${height - padding} Z`
      : '';

    return (
      <svg className="w-full h-40 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#66fcf1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#66fcf1" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {Array.from({ length: gridLinesCount + 1 }).map((_, i) => {
          const y = padding + (i / gridLinesCount) * chartHeight;
          const label = Math.round(100 - (i / gridLinesCount) * 100);
          return (
            <g key={i} className="opacity-10">
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="white" strokeWidth="1" strokeDasharray="3,3" />
              <text x={padding - 5} y={y + 3} fill="white" fontSize="8" textAnchor="end">{label}%</text>
            </g>
          );
        })}

        {/* Shaded Areas */}
        {cpuAreaPath && <path d={cpuAreaPath} fill="url(#cpuGrad)" />}
        {ramAreaPath && <path d={ramAreaPath} fill="url(#ramGrad)" />}

        {/* Lines */}
        {cpuPath && (
          <path
            d={cpuPath}
            fill="none"
            stroke="#66fcf1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_2px_rgba(102,252,241,0.5)]"
          />
        )}
        {ramPath && (
          <path
            d={ramPath}
            fill="none"
            stroke="#a855f7"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-[0_0_2px_rgba(168,85,247,0.5)]"
          />
        )}

        {/* Interactive dots for last point */}
        {cpuCoords.length > 0 && (
          <circle
            cx={cpuCoords[cpuCoords.length - 1].x}
            cy={cpuCoords[cpuCoords.length - 1].y}
            r="4"
            fill="#66fcf1"
            className="animate-pulse"
          />
        )}
        {ramCoords.length > 0 && (
          <circle
            cx={ramCoords[ramCoords.length - 1].x}
            cy={ramCoords[ramCoords.length - 1].y}
            r="4"
            fill="#a855f7"
            className="animate-pulse"
          />
        )}
      </svg>
    );
  };

  const cpuPercent = current?.cpuUsage ?? 0;
  const ramPercent = current ? getPercentage(current.ramUsedBytes, current.ramTotalBytes) : 0;
  const diskPercent = current ? getPercentage(current.diskUsedBytes, current.diskTotalBytes) : 0;

  return (
    <div className="bg-[#1f2833] rounded-xl border border-[#45f3ff]/10 shadow-lg p-6 flex flex-col h-full min-h-[380px]">
      {/* Widget Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0b0c10] rounded-lg text-[#66fcf1]">
            <Cpu size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Métricas do Servidor</h3>
            <p className="text-xs text-gray-400">Status de CPU, RAM e Disco em tempo real</p>
          </div>
        </div>
      </div>

      {currentErr || historyErr ? (
        <div className="text-red-400 bg-red-950/20 border border-red-500/20 p-4 rounded-lg text-xs mb-4">
          Erro ao obter métricas de hardware do servidor.
        </div>
      ) : null}

      {/* Grid status cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* CPU */}
        <div className="bg-[#0b0c10]/40 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Uso de CPU</span>
            <h4 className="text-xl font-black text-white mt-1">{cpuPercent}%</h4>
          </div>
          <div className="relative flex items-center justify-center">
            {/* Simple circular indicator */}
            <svg className="w-12 h-12 transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="#0b0c10" strokeWidth="4" fill="transparent" />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="#66fcf1"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={125.6}
                strokeDashoffset={125.6 - (125.6 * cpuPercent) / 100}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute text-[8px] font-bold text-gray-400">CPU</span>
          </div>
        </div>

        {/* RAM */}
        <div className="bg-[#0b0c10]/40 p-4 rounded-xl border border-gray-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Memória RAM</span>
            <h4 className="text-xl font-black text-white mt-1">{ramPercent}%</h4>
            <span className="text-[9px] text-gray-400 block font-mono">
              {current ? formatBytes(current.ramUsedBytes) : '0 GB'} / {current ? formatBytes(current.ramTotalBytes) : '0 GB'}
            </span>
          </div>
          <div className="relative flex items-center justify-center">
            <svg className="w-12 h-12 transform -rotate-90">
              <circle cx="24" cy="24" r="20" stroke="#0b0c10" strokeWidth="4" fill="transparent" />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="#a855f7"
                strokeWidth="4"
                fill="transparent"
                strokeDasharray={125.6}
                strokeDashoffset={125.6 - (125.6 * ramPercent) / 100}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute text-[8px] font-bold text-gray-400">RAM</span>
          </div>
        </div>
      </div>

      {/* Disk and Temp row */}
      <div className="space-y-4 mb-6">
        {/* Disk bar */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="flex items-center gap-1.5 text-gray-400">
              <HardDrive size={14} /> Espaço em Disco
            </span>
            <span className="font-bold text-white">
              {diskPercent}% ({current ? formatBytes(current.diskUsedBytes) : '0 GB'} / {current ? formatBytes(current.diskTotalBytes) : '0 GB'})
            </span>
          </div>
          <div className="w-full bg-[#0b0c10] h-2 rounded-full overflow-hidden border border-gray-800">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${diskPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Temperature */}
        <div className="flex justify-between items-center text-xs bg-[#0b0c10]/20 p-3 rounded-lg border border-gray-800/40">
          <span className="flex items-center gap-1.5 text-gray-400">
            <Thermometer size={14} /> Temperatura do Sistema
          </span>
          <span className={`font-bold flex items-center gap-1 text-sm ${
            (current?.temperature ?? 0) > 75 ? 'text-rose-400' : (current?.temperature ?? 0) > 60 ? 'text-yellow-400' : 'text-[#66fcf1]'
          }`}>
            {current?.temperature ?? '--'} °C
          </span>
        </div>
      </div>

      {/* Time-series Chart */}
      <div className="flex-1 flex flex-col justify-end">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-semibold text-white">Histórico (Último minuto)</span>
          <div className="flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1 text-[#66fcf1]">
              <span className="h-1.5 w-3 bg-[#66fcf1] rounded-sm"></span> CPU
            </span>
            <span className="flex items-center gap-1 text-[#a855f7]">
              <span className="h-1.5 w-3 bg-[#a855f7] rounded-sm"></span> RAM
            </span>
          </div>
        </div>
        <div className="bg-[#0b0c10] p-3 rounded-xl border border-gray-800">
          {renderHistoryChart(history)}
        </div>
      </div>
    </div>
  );
};
