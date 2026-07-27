import { create } from 'zustand';

interface DashboardState {
  widgetLayout: string[];
  hiddenWidgets: string[];
  editMode: boolean;
  toggleEditMode: () => void;
  moveWidget: (draggedId: string, targetId: string) => void;
  toggleWidgetVisibility: (widgetId: string) => void;
  setWidgetLayout: (layout: string[]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => {
  // Load initial settings from localStorage if available
  const savedLayout = localStorage.getItem('dashboard_layout');
  const savedHidden = localStorage.getItem('dashboard_hidden');

  const initialLayout = savedLayout ? JSON.parse(savedLayout) : ['server-metrics', 'uptime'];
  const initialHidden = savedHidden ? JSON.parse(savedHidden) : [];

  return {
    widgetLayout: initialLayout,
    hiddenWidgets: initialHidden,
    editMode: false,
    
    toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),
    
    moveWidget: (draggedId, targetId) => {
      set((state) => {
        const layout = [...state.widgetLayout];
        const draggedIndex = layout.indexOf(draggedId);
        const targetIndex = layout.indexOf(targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          // Swap or splice
          layout.splice(draggedIndex, 1);
          layout.splice(targetIndex, 0, draggedId);
          
          localStorage.setItem('dashboard_layout', JSON.stringify(layout));
          return { widgetLayout: layout };
        }
        return {};
      });
    },

    toggleWidgetVisibility: (widgetId) => {
      set((state) => {
        const isHidden = state.hiddenWidgets.includes(widgetId);
        const hiddenWidgets = isHidden
          ? state.hiddenWidgets.filter((id) => id !== widgetId)
          : [...state.hiddenWidgets, widgetId];

        localStorage.setItem('dashboard_hidden', JSON.stringify(hiddenWidgets));
        return { hiddenWidgets };
      });
    },

    setWidgetLayout: (layout) => {
      localStorage.setItem('dashboard_layout', JSON.stringify(layout));
      set({ widgetLayout: layout });
    }
  };
});
