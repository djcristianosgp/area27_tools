import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Calendar, Archive, Plus, Trash2, Edit2, MapPin, Users, CheckSquare, Square, CheckCircle, Info } from 'lucide-react';

interface InventoryItem {
  id: number;
  name: string;
  serialNumber?: string;
  category: string;
  location?: string;
  status: string; // "Available", "In Use", "In Maintenance", "Damaged"
}

interface Event {
  id: number;
  name: string;
  date: string;
  location?: string;
  teamMembers?: string;
  status: string; // "Scheduled", "In Progress", "Completed", "Cancelled"
  description?: string;
}

interface ChecklistItem {
  id: number;
  eventId: number;
  inventoryItemId: number;
  isChecked: boolean;
  itemName: string;
  itemCategory: string;
  itemSerialNumber: string;
}

export const InventoryEventsWidget: React.FC = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'inventory' | 'events'>('inventory');
  
  // Selection states
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Form states - Inventory
  const [itemName, setItemName] = useState('');
  const [itemSerial, setItemSerial] = useState('');
  const [itemCategory, setItemCategory] = useState('Camera');
  const [itemLocation, setItemLocation] = useState('');
  const [itemStatus, setItemStatus] = useState('Available');

  // Form states - Event
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventTeam, setEventTeam] = useState('');
  const [eventStatus, setEventStatus] = useState('Scheduled');
  const [eventDesc, setEventDesc] = useState('');

  // Fetch Inventory
  const { data: inventory, isLoading: loadingInv } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/inventory-events/inventory', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao buscar inventário.');
      return res.json();
    }
  });

  // Fetch Events
  const { data: events, isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/inventory-events/events', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao buscar eventos.');
      return res.json();
    }
  });

  // Fetch Event Checklist
  const { data: checklist, isLoading: loadingChecklist } = useQuery<ChecklistItem[]>({
    queryKey: ['event-checklist', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const res = await fetch(`http://localhost:5000/api/inventory-events/events/${selectedEventId}/checklist`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao buscar checklist.');
      return res.json();
    },
    enabled: !!selectedEventId
  });

  // Save Item Mutation
  const saveItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem
        ? `http://localhost:5000/api/inventory-events/inventory/${editingItem.id}`
        : 'http://localhost:5000/api/inventory-events/inventory';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Erro ao salvar item.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsItemModalOpen(false);
      setEditingItem(null);
    }
  });

  // Save Event Mutation
  const saveEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingEvent
        ? `http://localhost:5000/api/inventory-events/events/${editingEvent.id}`
        : 'http://localhost:5000/api/inventory-events/events';
      const method = editingEvent ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Erro ao salvar evento.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEventModalOpen(false);
      setEditingEvent(null);
    }
  });

  // Add to Checklist Mutation
  const addToChecklistMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await fetch(`http://localhost:5000/api/inventory-events/events/${selectedEventId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inventoryItemId: itemId })
      });
      if (!res.ok) throw new Error('Erro ao adicionar item.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-checklist', selectedEventId] });
    }
  });

  // Toggle Checklist Mutation
  const toggleChecklistMutation = useMutation({
    mutationFn: async ({ itemId, isChecked }: { itemId: number; isChecked: boolean }) => {
      const res = await fetch(`http://localhost:5000/api/inventory-events/events/${selectedEventId}/checklist/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ inventoryItemId: itemId, isChecked })
      });
      if (!res.ok) throw new Error('Erro ao alternar checklist.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-checklist', selectedEventId] });
    }
  });

  // Remove from Checklist Mutation
  const removeFromChecklistMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await fetch(`http://localhost:5000/api/inventory-events/events/${selectedEventId}/checklist/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao remover do checklist.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-checklist', selectedEventId] });
    }
  });

  const openAddItemModal = () => {
    setEditingItem(null);
    setItemName('');
    setItemSerial('');
    setItemCategory('Camera');
    setItemLocation('');
    setItemStatus('Available');
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemSerial(item.serialNumber || '');
    setItemCategory(item.category);
    setItemLocation(item.location || '');
    setItemStatus(item.status);
    setIsItemModalOpen(true);
  };

  const openAddEventModal = () => {
    setEditingEvent(null);
    setEventName('');
    setEventDate(new Date().toISOString().substring(0, 16));
    setEventLocation('');
    setEventTeam('');
    setEventStatus('Scheduled');
    setEventDesc('');
    setIsEventModalOpen(true);
  };

  const openEditEventModal = (ev: Event) => {
    setEditingEvent(ev);
    setEventName(ev.name);
    setEventDate(ev.date.substring(0, 16));
    setEventLocation(ev.location || '');
    setEventTeam(ev.teamMembers || '');
    setEventStatus(ev.status);
    setEventDesc(ev.description || '');
    setIsEventModalOpen(true);
  };

  return (
    <div className="bg-[#1f2833] p-6 rounded-xl border border-[#66fcf1]/10 flex flex-col h-full min-h-[500px]">
      
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-4 mb-6 gap-3">
        <div className="flex items-center gap-2">
          {activeTab === 'inventory' ? <Archive className="text-[#66fcf1]" size={20} /> : <Calendar className="text-[#66fcf1]" size={20} />}
          <h2 className="text-lg font-bold text-white">Inventário &amp; Eventos</h2>
        </div>
        
        <div className="flex bg-[#0b0c10] p-1 rounded-lg border border-gray-800 text-xs">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-1.5 px-3 rounded font-bold transition ${
              activeTab === 'inventory' ? 'bg-[#66fcf1] text-[#0b0c10]' : 'text-gray-400 hover:text-white'
            }`}
          >
            Inventário Físico
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`py-1.5 px-3 rounded font-bold transition ${
              activeTab === 'events' ? 'bg-[#66fcf1] text-[#0b0c10]' : 'text-gray-400 hover:text-white'
            }`}
          >
            Gestão de Eventos
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      {activeTab === 'inventory' ? (
        <div className="space-y-4 flex-1 flex flex-col">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Equipamentos e Ativos</span>
            <button
              onClick={openAddItemModal}
              className="flex items-center gap-1 bg-[#66fcf1]/10 hover:bg-[#66fcf1]/20 border border-[#66fcf1]/30 text-[#66fcf1] py-1 px-3 rounded-lg text-xs font-semibold transition"
            >
              <Plus size={14} />
              Novo Equipamento
            </button>
          </div>

          {loadingInv ? (
            <div className="text-center text-gray-500 animate-pulse py-12 flex-1 flex items-center justify-center">
              Carregando inventário...
            </div>
          ) : (
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-850 text-gray-500 font-bold">
                    <th className="py-2 px-3">Nome</th>
                    <th className="py-2 px-3">Categoria</th>
                    <th className="py-2 px-3">Serial</th>
                    <th className="py-2 px-3">Armário/Local</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory?.map((item) => (
                    <tr key={item.id} className="border-b border-gray-900 hover:bg-gray-850/20 text-gray-300">
                      <td className="py-2.5 px-3 font-semibold text-white">{item.name}</td>
                      <td className="py-2.5 px-3">{item.category}</td>
                      <td className="py-2.5 px-3 font-mono">{item.serialNumber || 'N/D'}</td>
                      <td className="py-2.5 px-3">{item.location || 'N/D'}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          item.status === 'Available' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                          item.status === 'In Use' ? 'bg-blue-950 text-blue-400 border border-blue-500/30' :
                          item.status === 'In Maintenance' ? 'bg-yellow-950 text-yellow-400 border border-yellow-500/30' :
                          'bg-red-950 text-red-400 border border-red-500/30'
                        }`}>
                          {item.status === 'Available' ? 'Disponível' :
                           item.status === 'In Use' ? 'Em Uso' :
                           item.status === 'In Maintenance' ? 'Manutenção' : 'Danificado'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right flex justify-end gap-1.5">
                        <button
                          onClick={() => openEditItemModal(item)}
                          className="p-1 text-gray-400 hover:text-white transition"
                        >
                          <Edit2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
          
          {/* Events list */}
          <div className="space-y-4 flex flex-col">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Linha do Tempo dos Eventos</span>
              <button
                onClick={openAddEventModal}
                className="flex items-center gap-1 bg-[#66fcf1]/10 hover:bg-[#66fcf1]/20 border border-[#66fcf1]/30 text-[#66fcf1] py-1 px-3 rounded-lg text-xs font-semibold transition"
              >
                <Plus size={14} />
                Agendar Evento
              </button>
            </div>

            {loadingEvents ? (
              <div className="text-center py-10 text-gray-500 animate-pulse">Carregando eventos...</div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px]">
                {events?.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      selectedEventId === ev.id
                        ? 'bg-[#0b0c10]/80 border-[#66fcf1] shadow-lg shadow-[#66fcf1]/5'
                        : 'bg-[#0b0c10]/40 border-gray-805 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-sm text-white">{ev.name}</h3>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {new Date(ev.date).toLocaleString()}
                        </p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        ev.status === 'Completed' ? 'bg-emerald-950 text-emerald-400' :
                        ev.status === 'In Progress' ? 'bg-blue-950 text-blue-400 animate-pulse' :
                        ev.status === 'Cancelled' ? 'bg-red-950 text-red-400' :
                        'bg-gray-900 text-gray-400 border border-gray-800'
                      }`}>
                        {ev.status === 'Completed' ? 'Concluído' :
                         ev.status === 'In Progress' ? 'Ao Vivo' :
                         ev.status === 'Cancelled' ? 'Cancelado' : 'Agendado'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 text-[11px] text-gray-400 mt-2 border-t border-gray-900 pt-2">
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-[#66fcf1]" />
                          {ev.location}
                        </span>
                      )}
                      {ev.teamMembers && (
                        <span className="flex items-center gap-1">
                          <Users size={12} className="text-[#66fcf1]" />
                          {ev.teamMembers}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-gray-900/40">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditEventModal(ev); }}
                        className="text-[10px] text-gray-500 hover:text-white flex items-center gap-0.5"
                      >
                        <Edit2 size={10} />
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event checklist panel */}
          <div className="bg-[#0b0c10]/40 border border-gray-850 rounded-xl p-4 flex flex-col">
            {selectedEventId ? (
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center border-b border-gray-900 pb-2 mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-[#66fcf1]" />
                      Checklist de Equipamento
                    </h3>
                    <p className="text-[10px] text-gray-500">Separação de carga para transmissão</p>
                  </div>
                </div>

                {loadingChecklist ? (
                  <div className="text-center text-gray-500 py-10 animate-pulse text-xs">Carregando checklist...</div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2 overflow-y-auto max-h-[300px] flex-1">
                      {checklist?.length === 0 ? (
                        <div className="text-center text-gray-600 text-xs py-8">
                          Nenhum item adicionado ao checklist deste evento.
                        </div>
                      ) : (
                        checklist?.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-[#1f2833]/30 p-2 rounded border border-gray-900 hover:border-gray-800"
                          >
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleChecklistMutation.mutate({ itemId: item.inventoryItemId, isChecked: !item.isChecked })}
                                className="text-[#66fcf1] hover:text-[#45f3ff] transition"
                              >
                                {item.isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                              </button>
                              <div>
                                <p className={`text-xs font-semibold ${item.isChecked ? 'line-through text-gray-500' : 'text-white'}`}>
                                  {item.itemName}
                                </p>
                                <span className="text-[9px] text-gray-500 font-mono">
                                  {item.itemCategory} {item.itemSerialNumber && `• SN: ${item.itemSerialNumber}`}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFromChecklistMutation.mutate(item.inventoryItemId)}
                              className="text-red-500 hover:text-red-400 p-1"
                              title="Remover"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add to checklist selection dropdown */}
                    <div className="border-t border-gray-900 pt-3 mt-4 flex gap-2">
                      <select
                        id="addItemSelect"
                        className="flex-1 bg-[#0b0c10] border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="">-- Adicionar Item do Inventário --</option>
                        {inventory?.filter(i => !checklist?.some(c => c.inventoryItemId === i.id)).map(i => (
                          <option key={i.id} value={i.id}>{i.name} ({i.category})</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const select = document.getElementById('addItemSelect') as HTMLSelectElement;
                          if (select && select.value) {
                            addToChecklistMutation.mutate(parseInt(select.value));
                            select.value = '';
                          }
                        }}
                        className="bg-[#66fcf1] text-[#0b0c10] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#45f3ff] transition"
                      >
                        Incluir
                      </button>
                    </div>

                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-600 text-xs py-20 p-4">
                <Info size={32} className="text-gray-700 mb-2" />
                <p>Selecione um evento da lista ao lado para ver e organizar o checklist operacional.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1f2833] border border-[#66fcf1]/30 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-md font-bold text-[#66fcf1] mb-4">
              {editingItem ? 'Editar Item do Inventário' : 'Novo Item do Inventário'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveItemMutation.mutate({ name: itemName, serialNumber: itemSerial || null, category: itemCategory, location: itemLocation || null, status: itemStatus });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Nome do Equipamento</label>
                <input
                  type="text" required value={itemName} onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  placeholder="Ex: Câmera Sony FX3"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Categoria</label>
                  <select
                    value={itemCategory} onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="Camera">Câmera</option>
                    <option value="Lente">Lente</option>
                    <option value="Acessório">Tripé/Acessório</option>
                    <option value="Switch">Mesa de Corte</option>
                    <option value="Cabo">Cabo / Rede</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Número de Série</label>
                  <input
                    type="text" value={itemSerial} onChange={(e) => setItemSerial(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    placeholder="Ex: SN-FX3-99"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Localização de Armário</label>
                  <input
                    type="text" value={itemLocation} onChange={(e) => setItemLocation(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                    placeholder="Ex: Armário A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Status Operacional</label>
                  <select
                    value={itemStatus} onChange={(e) => setItemStatus(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="Available">Disponível</option>
                    <option value="In Use">Em Uso</option>
                    <option value="In Maintenance">Em Manutenção</option>
                    <option value="Damaged">Danificado / Quebrado</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#66fcf1] text-[#0b0c10] hover:bg-[#45f3ff] text-xs font-bold rounded-lg transition">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1f2833] border border-[#66fcf1]/30 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-md font-bold text-[#66fcf1] mb-4">
              {editingEvent ? 'Editar Evento' : 'Agendar Novo Evento'}
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveEventMutation.mutate({ name: eventName, date: new Date(eventDate).toISOString(), location: eventLocation || null, teamMembers: eventTeam || null, status: eventStatus, description: eventDesc || null });
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Nome do Evento</label>
                <input
                  type="text" required value={eventName} onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  placeholder="Ex: Transmissão Estadual - Rodada 4"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Data / Horário</label>
                  <input
                    type="datetime-local" required value={eventDate} onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Status</label>
                  <select
                    value={eventStatus} onChange={(e) => setEventStatus(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="Scheduled">Agendado</option>
                    <option value="In Progress">Ao Vivo / Em Andamento</option>
                    <option value="Completed">Concluído</option>
                    <option value="Cancelled">Cancelado</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Localização</label>
                <input
                  type="text" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  placeholder="Ex: Ginásio Central"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Equipe Escalada</label>
                <input
                  type="text" value={eventTeam} onChange={(e) => setEventTeam(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  placeholder="Ex: Carlos (Mesa), Thiago (Câmera)"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsEventModalOpen(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#66fcf1] text-[#0b0c10] hover:bg-[#45f3ff] text-xs font-bold rounded-lg transition">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
