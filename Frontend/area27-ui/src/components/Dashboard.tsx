import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useDashboardStore } from '../store/dashboardStore';
import { UptimeWidget } from './UptimeWidget';
import { ServerMetricsWidget } from './ServerMetricsWidget';
import { NetworkScannerWidget } from './NetworkScannerWidget';
import { WebTerminalWidget } from './WebTerminalWidget';
import { SslDnsWidget } from './SslDnsWidget';
import { LogOut, Settings, Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';

interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  isEnabled: boolean;
}

export const Dashboard: React.FC = () => {
  const { user, token, logout } = useAuthStore();
  const {
    widgetLayout,
    hiddenWidgets,
    editMode,
    toggleEditMode,
    moveWidget,
    toggleWidgetVisibility,
    setWidgetLayout
  } = useDashboardStore();

  const queryClient = useQueryClient();

  // Fetch registered modules
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
      const data = await response.json();
      
      // Keep widgetLayout synchronized with new modules if they are added
      const activeIds = data.map((m: Module) => m.id);
      const newLayout = [...widgetLayout];
      activeIds.forEach((id: string) => {
        if (!newLayout.includes(id)) {
          newLayout.push(id);
        }
      });
      // Filter out removed ids
      const filteredLayout = newLayout.filter(id => activeIds.includes(id));
      if (JSON.stringify(filteredLayout) !== JSON.stringify(widgetLayout)) {
        setWidgetLayout(filteredLayout);
      }

      return data;
    }
  });

  // Toggle module activation mutation
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== targetId) {
      moveWidget(draggedId, targetId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0b0c10] text-[#66fcf1]">
        <div className="text-xl font-bold animate-pulse">Carregando painel...</div>
      </div>
    );
  }

  // Filter modules based on whether they are enabled
  const enabledModules = modules?.filter((m) => m.isEnabled) || [];
  const visibleWidgets = widgetLayout.filter(
    (id) => enabledModules.some((m) => m.id === id) && !hiddenWidgets.includes(id)
  );

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#c5c6c7] p-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#1f2833] p-4 rounded-xl border border-[#45f3ff]/10 mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#66fcf1] tracking-wide">Area27 Tools</h1>
          <p className="text-xs text-[#c5c6c7]">
            Logado como <span className="text-[#66fcf1] font-semibold">{user?.username}</span> ({user?.role})
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={toggleEditMode}
            className={`flex items-center gap-2 py-2 px-4 rounded-lg transition duration-200 border text-sm font-semibold ${
              editMode
                ? 'bg-purple-950/40 hover:bg-purple-900/60 border-purple-500/30 text-purple-200'
                : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-white'
            }`}
          >
            <Settings size={16} />
            {editMode ? 'Concluir Edição' : 'Customizar Painel'}
          </button>
          
          <button
            onClick={logout}
            className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-200 py-2 px-4 rounded-lg transition duration-200 text-sm font-semibold"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-950/40 border border-red-500 text-red-200 p-4 rounded-lg mb-8">
          Houve um erro ao carregar os módulos. Verifique se o backend está ativo.
        </div>
      )}

      {/* Edit Mode Customization Panel */}
      {editMode && (
        <section className="bg-[#1f2833]/60 border border-[#66fcf1]/20 p-6 rounded-xl mb-8 animate-fadeIn">
          <h3 className="text-lg font-bold text-[#66fcf1] mb-2">Painel de Customização</h3>
          <p className="text-xs text-gray-400 mb-6">
            Ative módulos globais e oculte ou ordene os widgets ativos na sua tela inicial por arrastar ou setas.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules?.map((mod) => {
              const isWidget = mod.id === 'uptime' || mod.id === 'server-metrics' || mod.id === 'network-scanner' || mod.id === 'web-terminal' || mod.id === 'ssl-dns';
              const isHidden = hiddenWidgets.includes(mod.id);
              return (
                <div key={mod.id} className="bg-[#0b0c10]/40 p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{mod.name}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5">{mod.description}</p>
                    </div>
                    <button
                      onClick={() => toggleMutation.mutate(mod.id)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition ${
                        mod.isEnabled
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                          : 'bg-gray-950/40 text-gray-400 border-gray-700/30'
                      }`}
                    >
                      {mod.isEnabled ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>

                  {mod.isEnabled && isWidget && (
                    <div className="mt-4 pt-3 border-t border-gray-900 flex justify-between items-center">
                      <span className="text-xs text-gray-400">Visibilidade do Widget</span>
                      <button
                        onClick={() => toggleWidgetVisibility(mod.id)}
                        className={`flex items-center gap-1 py-1 px-3 rounded text-[10px] border font-bold transition ${
                          !isHidden
                            ? 'bg-[#66fcf1]/10 text-[#66fcf1] border-[#66fcf1]/30'
                            : 'bg-gray-950 text-gray-400 border-gray-800'
                        }`}
                      >
                        {!isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                        {!isHidden ? 'Visível' : 'Oculto'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Customizable Widgets Grid */}
      <main className="space-y-8">
        <div className="border-b border-[#1f2833] pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold text-[#66fcf1]">Módulos de Monitoramento</h2>
            <p className="text-sm text-gray-400">
              {editMode ? 'Arraste os cards para reorganizar ou use os controles' : 'Visão operacional em tempo real'}
            </p>
          </div>
        </div>

        {visibleWidgets.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl">
            <p className="text-gray-500 text-sm">Não há widgets visíveis no dashboard.</p>
            <p className="text-xs text-gray-600 mt-1">
              Certifique-se de que os módulos estão ativados e marcados como visíveis no Painel de Customização.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {visibleWidgets.map((widgetId, index) => {
              const moduleInfo = modules?.find((m) => m.id === widgetId);
              if (!moduleInfo) return null;

              return (
                <div
                  key={widgetId}
                  draggable={editMode}
                  onDragStart={(e) => handleDragStart(e, widgetId)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, widgetId)}
                  className={`relative group transition-all duration-300 ${
                    editMode ? 'cursor-move ring-2 ring-purple-500/30 opacity-90 hover:opacity-100' : ''
                  }`}
                >
                  {/* Edit mode overlay bar */}
                  {editMode && (
                    <div className="absolute top-2 right-2 z-10 flex gap-1 bg-[#0b0c10]/95 p-1 rounded-lg border border-purple-500/30 animate-fadeIn">
                      <button
                        disabled={index === 0}
                        onClick={() => moveWidget(widgetId, visibleWidgets[index - 1])}
                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para esquerda"
                      >
                        <ArrowLeft size={14} />
                      </button>
                      <button
                        disabled={index === visibleWidgets.length - 1}
                        onClick={() => moveWidget(widgetId, visibleWidgets[index + 1])}
                        className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Mover para direita"
                      >
                        <ArrowRight size={14} />
                      </button>
                      <button
                        onClick={() => toggleWidgetVisibility(widgetId)}
                        className="p-1 text-red-400 hover:text-red-300"
                        title="Ocultar Widget"
                      >
                        <EyeOff size={14} />
                      </button>
                    </div>
                  )}

                  {widgetId === 'uptime' && <UptimeWidget />}
                  {widgetId === 'server-metrics' && <ServerMetricsWidget />}
                  {widgetId === 'network-scanner' && <NetworkScannerWidget />}
                  {widgetId === 'web-terminal' && <WebTerminalWidget />}
                  {widgetId === 'ssl-dns' && <SslDnsWidget />}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
