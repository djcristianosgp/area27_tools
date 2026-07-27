import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Play, Trash2, Calendar, CheckCircle2, AlertTriangle, Plus, X, ToggleLeft, ToggleRight } from 'lucide-react';

interface BackupTask {
  id: number;
  name: string;
  cronExpression: string;
  backupType: string;
  sourcePath: string | null;
  destinationType: string;
  destinationSettings: string | null;
  isActive: boolean;
  lastRun: string | null;
  nextRun: string | null;
  createdAt: string;
}

interface BackupLog {
  id: number;
  taskId: number;
  startTime: string;
  endTime: string | null;
  isSuccess: boolean;
  message: string | null;
  fileDetails: string | null;
}

export const BackupCronWidget: React.FC = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [cronExpression, setCronExpression] = useState('0 0 * * *'); // Daily midnight
  const [backupType, setBackupType] = useState('Folder'); // Folder, Database, Command
  const [sourcePath, setSourcePath] = useState('');
  const [destinationType, setDestinationType] = useState('Local');

  // Fetch tasks
  const { data: tasks, isLoading } = useQuery<BackupTask[]>({
    queryKey: ['backup-tasks'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/backup-cron/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao listar tarefas.');
      return res.json();
    }
  });

  // Fetch logs
  const { data: logs, isLoading: loadingLogs } = useQuery<BackupLog[]>({
    queryKey: ['backup-logs', selectedTaskId],
    queryFn: async () => {
      const url = selectedTaskId 
        ? `http://localhost:5000/api/backup-cron/logs?taskId=${selectedTaskId}`
        : 'http://localhost:5000/api/backup-cron/logs';
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao obter logs de backup.');
      return res.json();
    }
  });

  // Add Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:5000/api/backup-cron/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          cronExpression,
          backupType,
          sourcePath: sourcePath || null,
          destinationType,
          destinationSettings: null
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao criar tarefa.');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-tasks'] });
      setIsCreating(false);
      setName('');
      setSourcePath('');
    }
  });

  // Toggle active/inactive
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await fetch(`http://localhost:5000/api/backup-cron/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive })
      });
      if (!res.ok) throw new Error('Erro ao atualizar tarefa.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-tasks'] });
    }
  });

  // Delete Task
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:5000/api/backup-cron/tasks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao excluir tarefa.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-tasks'] });
      if (selectedTaskId) setSelectedTaskId(null);
    }
  });

  // Trigger task immediately
  const triggerTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:5000/api/backup-cron/tasks/${id}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao executar tarefa.');
      return res.json();
    },
    onSuccess: () => {
      // Reload tasks after a second to show status/last run updates
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['backup-tasks'] });
        queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
      }, 1000);
    }
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  return (
    <div className="bg-[#1f2833] rounded-xl border border-[#45f3ff]/10 p-6 flex flex-col h-full shadow-lg relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-[#45f3ff]/5 rounded-full filter blur-xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
            Backups & Agendador (Cron)
          </h3>
          <p className="text-xs text-gray-400">Rotinas agendadas de proteção de dados e automação</p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-[#45f3ff]/10 hover:bg-[#45f3ff]/20 text-[#45f3ff] rounded-lg border border-[#45f3ff]/30 text-xs font-bold transition duration-200"
        >
          <Plus size={14} />
          Nova Tarefa
        </button>
      </div>

      {createTaskMutation.error && (
        <div className="bg-red-950/40 border border-red-500/30 text-red-200 text-xs p-3 rounded-lg mb-4">
          Erro: {createTaskMutation.error.message}
        </div>
      )}

      {/* Main Layout: Split into Tasks and History log */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left Side: Active Tasks */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#45f3ff] uppercase tracking-wider mb-2">Tarefas Agendadas</h4>
          
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Carregando tarefas...</div>
            ) : tasks?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">Nenhuma tarefa agendada criada.</div>
            ) : (
              tasks?.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTaskId(selectedTaskId === t.id ? null : t.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    selectedTaskId === t.id
                      ? 'bg-[#0b0c10]/60 border-[#45f3ff]/40'
                      : 'bg-[#0b0c10]/30 border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-white text-sm block">{t.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {t.backupType} • {t.cronExpression}
                      </span>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleTaskMutation.mutate({ id: t.id, isActive: !t.isActive })}
                        className="text-gray-400 hover:text-white transition"
                        title={t.isActive ? 'Desativar Tarefa' : 'Ativar Tarefa'}
                      >
                        {t.isActive ? (
                          <ToggleRight className="text-[#45f3ff]" size={20} />
                        ) : (
                          <ToggleLeft className="text-gray-600" size={20} />
                        )}
                      </button>

                      <button
                        onClick={() => triggerTaskMutation.mutate(t.id)}
                        disabled={triggerTaskMutation.isPending}
                        className="p-1 bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-400 rounded transition border border-emerald-500/20"
                        title="Executar Agora"
                      >
                        <Play size={12} />
                      </button>

                      <button
                        onClick={() => deleteTaskMutation.mutate(t.id)}
                        className="p-1 bg-red-950/20 hover:bg-red-900/40 text-red-400 rounded transition border border-red-500/20"
                        title="Remover"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-gray-900 text-[10px] text-gray-500 font-mono">
                    <div>
                      Última execução: <span className="text-gray-300 block">{formatDate(t.lastRun)}</span>
                    </div>
                    <div>
                      Próxima execução: <span className="text-gray-300 block">{formatDate(t.nextRun)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Execution Logs */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#45f3ff] uppercase tracking-wider mb-2">
            {selectedTaskId 
              ? `Histórico: ${tasks?.find(t => t.id === selectedTaskId)?.name}`
              : 'Histórico Geral de Execuções'
            }
          </h4>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {loadingLogs ? (
              <div className="text-center py-8 text-gray-500 text-sm">Carregando histórico...</div>
            ) : logs?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">Nenhum log de execução encontrado.</div>
            ) : (
              logs?.map((l) => (
                <div
                  key={l.id}
                  className="bg-[#0b0c10]/40 p-3 rounded-lg border border-gray-800 flex items-start gap-3"
                >
                  {l.isSuccess ? (
                    <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0 font-mono text-[10px]">
                    <div className="flex justify-between text-gray-400 mb-1">
                      <span>Log #{l.id}</span>
                      <span>{formatDate(l.startTime)}</span>
                    </div>
                    <p className={`font-bold ${l.isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                      {l.isSuccess ? 'Sucesso' : 'Falha'}
                    </p>
                    <p className="text-gray-300 mt-1 truncate">{l.message}</p>
                    {l.fileDetails && (
                      <p className="text-gray-400 mt-0.5 break-all bg-gray-900/60 p-1.5 rounded">{l.fileDetails}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#0b0c10]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1f2833] border border-[#45f3ff]/20 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#0b0c10]/40">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Calendar size={18} className="text-[#45f3ff]" />
                Nova Tarefa Agendada
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
                <label className="block text-xs font-bold text-gray-400 mb-1">Nome da Tarefa</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Backup Diário da Pasta Dev"
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Expressão Cron (Minutos Hora Dia Mês DiaSemana)</label>
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="*/5 * * * * (a cada 5 minutos)"
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Tipo de Backup</label>
                <select
                  value={backupType}
                  onChange={(e) => setBackupType(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40"
                >
                  <option value="Folder">Diretório / Pasta (ZIP)</option>
                  <option value="Database">Banco de Dados SQLite interno</option>
                  <option value="Command">Executar Comando Shell</option>
                </select>
              </div>

              {(backupType === 'Folder' || backupType === 'Command') && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    {backupType === 'Folder' ? 'Caminho absoluto da pasta de origem' : 'Comando shell a ser executado'}
                  </label>
                  <input
                    type="text"
                    value={sourcePath}
                    onChange={(e) => setSourcePath(e.target.value)}
                    placeholder={backupType === 'Folder' ? 'C:/Projetos/dados' : 'docker restart db_container'}
                    className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-400 mb-1">Destino do Backup</label>
                <select
                  value={destinationType}
                  onChange={(e) => setDestinationType(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-[#45f3ff]/40"
                >
                  <option value="Local">Diretório Local do Servidor (pasta /Backups)</option>
                  <option value="S3">Nuvem AWS S3 (Simulado)</option>
                  <option value="FTP">Servidor FTP externo (Simulado)</option>
                </select>
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
                onClick={() => createTaskMutation.mutate()}
                disabled={!name || !cronExpression || createTaskMutation.isPending}
                className="px-4 py-2 bg-[#45f3ff]/10 hover:bg-[#45f3ff]/20 text-[#45f3ff] text-xs font-bold rounded-lg border border-[#45f3ff]/30 transition disabled:opacity-50"
              >
                Salvar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
