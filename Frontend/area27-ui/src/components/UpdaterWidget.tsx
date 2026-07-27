import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { RefreshCw, CheckCircle, AlertTriangle, ExternalLink, Loader2, Info, Download, CheckCircle2 } from 'lucide-react';

interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  changelogUrl?: string;
  releaseNotes?: string;
  publishedAt?: string;
}

interface UpdateProgressStatus {
  isUpdating: boolean;
  progressPercentage: number;
  currentStep: string;
  errorMessage?: string;
  isCompleted: boolean;
}

const API = 'http://localhost:5000';

export const UpdaterWidget: React.FC = () => {
  const { token } = useAuthStore();
  const [showChangelog, setShowChangelog] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const {
    data: update,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<UpdateCheckResult>({
    queryKey: ['updater-check'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/updater/check`, { headers });
      if (!res.ok) throw new Error('Falha ao verificar atualizações');
      return res.json();
    },
    staleTime: 1000 * 60 * 10, // Re-check every 10 min
  });

  // Query to poll update progress status
  const { data: progress } = useQuery<UpdateProgressStatus>({
    queryKey: ['updater-progress'],
    queryFn: async () => {
      const res = await fetch(`${API}/api/updater/progress`, { headers });
      if (!res.ok) throw new Error('Falha ao obter progresso');
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.isUpdating ? 500 : false; // Poll every 500ms when updating
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/updater/apply`, {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error('Erro ao iniciar atualização.');
      return res.json();
    },
  });

  const isUpdating = progress?.isUpdating;
  const percentage = progress?.progressPercentage ?? 0;
  const currentStep = progress?.currentStep ?? '';

  return (
    <div className="bg-[#1f2833] rounded-2xl border border-[#45f3ff]/10 p-6 flex flex-col gap-4 shadow-xl h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <RefreshCw size={20} className={`text-indigo-400 ${isUpdating ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Atualizações do Sistema</h3>
            <p className="text-[10px] text-gray-500">GitHub Releases</p>
          </div>
        </div>

        {/* Badge */}
        {update?.updateAvailable && !isUpdating && (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
            <AlertTriangle size={10} />
            Update disponível
          </span>
        )}

        {isUpdating && (
          <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
            <Loader2 size={10} className="animate-spin" />
            Atualizando... {percentage}%
          </span>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="text-indigo-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-red-400">Erro ao verificar atualizações.</p>
        </div>
      ) : update ? (
        <div className="flex flex-col gap-4 flex-1">
          {/* Version Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0b0c10]/50 rounded-xl p-3 border border-gray-800">
              <p className="text-[10px] text-gray-500 mb-1">Versão Atual</p>
              <p className="text-sm font-bold text-[#66fcf1] font-mono">v{update.currentVersion}</p>
            </div>
            <div className="bg-[#0b0c10]/50 rounded-xl p-3 border border-gray-800">
              <p className="text-[10px] text-gray-500 mb-1">Versão mais recente</p>
              <p className={`text-sm font-bold font-mono ${update.updateAvailable ? 'text-amber-400' : 'text-emerald-400'}`}>
                v{update.latestVersion}
              </p>
            </div>
          </div>

          {/* Status */}
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${
            update.updateAvailable
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-emerald-500/10 border-emerald-500/30'
          }`}>
            {update.updateAvailable ? (
              <AlertTriangle size={16} className="text-amber-400 shrink-0" />
            ) : (
              <CheckCircle size={16} className="text-emerald-400 shrink-0" />
            )}
            <div>
              <p className={`text-xs font-semibold ${update.updateAvailable ? 'text-amber-300' : 'text-emerald-300'}`}>
                {update.updateAvailable ? 'Nova versão disponível!' : 'Sistema atualizado'}
              </p>
              {update.publishedAt && update.updateAvailable && (
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Publicado em: {new Date(update.publishedAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          {/* Animated Progress Bar Panel */}
          {isUpdating && (
            <div className="bg-[#0b0c10]/80 rounded-xl p-4 border border-emerald-500/30 flex flex-col gap-2.5 animate-fadeIn">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin text-emerald-400" />
                  {currentStep}
                </span>
                <span className="font-mono font-bold text-emerald-400">{percentage}%</span>
              </div>

              {/* Outer Bar */}
              <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800 p-0.5">
                {/* Inner Animated Bar */}
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Completion Notice */}
          {progress?.isCompleted && !isUpdating && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{progress.currentStep}</span>
            </div>
          )}

          {/* Changelog Preview */}
          {update.updateAvailable && update.releaseNotes && !isUpdating && (
            <div>
              <button
                onClick={() => setShowChangelog(!showChangelog)}
                className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition font-semibold"
              >
                <Info size={11} />
                {showChangelog ? 'Ocultar' : 'Ver'} changelog
              </button>
              {showChangelog && (
                <div className="mt-2 max-h-32 overflow-y-auto text-[10px] text-gray-300 bg-[#0b0c10]/70 rounded-lg border border-gray-800 p-3 leading-relaxed whitespace-pre-wrap font-mono">
                  {update.releaseNotes}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-auto">
            {update.updateAvailable && !isUpdating && (
              <button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className="flex items-center gap-2 w-full justify-center py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg disabled:opacity-50"
              >
                {applyMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                Instalar Atualização (v{update.latestVersion})
              </button>
            )}

            <button
              onClick={() => refetch()}
              disabled={isFetching || isUpdating}
              className="flex items-center gap-2 flex-1 justify-center py-2 px-3 rounded-lg bg-[#0b0c10] hover:bg-gray-900 border border-gray-800 text-xs text-gray-300 transition disabled:opacity-50"
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
              Verificar agora
            </button>

            {update.changelogUrl && (
              <a
                href={update.changelogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 flex-1 justify-center py-2 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-300 transition"
              >
                <ExternalLink size={12} />
                Ver release
              </a>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
