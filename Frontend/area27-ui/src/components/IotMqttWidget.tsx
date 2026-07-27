import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Cpu, Plus, Trash2, Edit2, Lightbulb, Thermometer, HelpCircle } from 'lucide-react';

interface IotDevice {
  id: number;
  deviceName: string;
  topic: string;
  payloadType: string; // "Switch", "Sensor", "Text"
  lastValue?: string;
  lastUpdated: string;
}

export const IotMqttWidget: React.FC = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<IotDevice | null>(null);

  // Form fields
  const [deviceName, setDeviceName] = useState('');
  const [topic, setTopic] = useState('');
  const [payloadType, setPayloadType] = useState('Switch');

  // Fetch IoT Devices (Poll every 3 seconds for live telemetry updates)
  const { data: devices, isLoading, error } = useQuery<IotDevice[]>({
    queryKey: ['iot-devices'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/iot/devices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar dispositivos IoT.');
      return res.json();
    },
    refetchInterval: 3000
  });

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (deviceData: any) => {
      const url = editingDevice
        ? `http://localhost:5000/api/iot/devices/${editingDevice.id}`
        : 'http://localhost:5000/api/iot/devices';
      const method = editingDevice ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(deviceData)
      });
      if (!res.ok) throw new Error('Erro ao salvar dispositivo.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iot-devices'] });
      closeModal();
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:5000/api/iot/devices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao excluir dispositivo.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iot-devices'] });
    }
  });

  // Publish Payload Mutation (Toggling Switch)
  const publishMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: string }) => {
      const res = await fetch(`http://localhost:5000/api/iot/devices/${id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ payload })
      });
      if (!res.ok) throw new Error('Erro ao publicar comando.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['iot-devices'] });
    }
  });

  const openAddModal = () => {
    setEditingDevice(null);
    setDeviceName('');
    setTopic('');
    setPayloadType('Switch');
    setIsModalOpen(true);
  };

  const openEditModal = (dev: IotDevice) => {
    setEditingDevice(dev);
    setDeviceName(dev.deviceName);
    setTopic(dev.topic);
    setPayloadType(dev.payloadType);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDevice(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      deviceName,
      topic,
      payloadType
    });
  };

  const handleToggle = (dev: IotDevice) => {
    const nextPayload = dev.lastValue === 'ON' ? 'OFF' : 'ON';
    publishMutation.mutate({ id: dev.id, payload: nextPayload });
  };

  return (
    <div className="bg-[#1f2833] p-6 rounded-xl border border-[#66fcf1]/10 flex flex-col h-full min-h-[400px]">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Cpu className="text-[#66fcf1]" size={20} />
          <h2 className="text-lg font-bold text-white">Painel IoT (MQTT)</h2>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1 bg-[#66fcf1]/10 hover:bg-[#66fcf1]/20 border border-[#66fcf1]/30 text-[#66fcf1] py-1 px-3 rounded-lg text-xs font-semibold transition"
        >
          <Plus size={14} />
          Adicionar Tópico
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm mb-4">Falha ao se conectar com os tópicos do Broker.</div>
      )}

      {isLoading ? (
        <div className="text-gray-400 text-sm flex-1 flex items-center justify-center animate-pulse">
          Sincronizando com Broker MQTT...
        </div>
      ) : devices?.length === 0 ? (
        <div className="text-gray-500 text-sm flex-1 flex flex-col items-center justify-center border border-dashed border-gray-800 rounded-lg p-8">
          <p>Nenhum dispositivo cadastrado no MQTT.</p>
          <p className="text-xs text-gray-600 mt-1 font-sans">Cadastre chaves ou leitores de telemetria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
          {devices?.map((dev) => {
            const isSwitch = dev.payloadType === 'Switch';
            const isSensor = dev.payloadType === 'Sensor';
            
            return (
              <div key={dev.id} className="bg-[#0b0c10]/60 border border-gray-800 p-4 rounded-xl flex flex-col justify-between relative group hover:border-[#66fcf1]/20 transition-all">
                
                {/* Actions overlay */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(dev)}
                    className="p-1 text-gray-500 hover:text-white transition"
                    title="Editar"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(dev.id)}
                    className="p-1 text-red-500 hover:text-red-400 transition"
                    title="Remover"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="mb-4">
                  <span className="text-[9px] text-[#66fcf1] font-mono tracking-wider uppercase font-semibold">
                    {dev.payloadType}
                  </span>
                  <h3 className="font-bold text-sm text-white mt-0.5">{dev.deviceName}</h3>
                  <p className="text-[10px] text-gray-500 font-mono truncate mt-0.5" title={dev.topic}>
                    {dev.topic}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-900">
                  {/* Status Indicator */}
                  <div className="flex items-center gap-1.5">
                    {isSwitch && (
                      <Lightbulb size={16} className={dev.lastValue === 'ON' ? 'text-yellow-400' : 'text-gray-600'} />
                    )}
                    {isSensor && <Thermometer size={16} className="text-[#66fcf1]" />}
                    {!isSwitch && !isSensor && <HelpCircle size={16} className="text-gray-500" />}

                    <span className="text-[10px] text-gray-400">
                      Modificado {new Date(dev.lastUpdated).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Widget Control */}
                  {isSwitch ? (
                    <button
                      onClick={() => handleToggle(dev)}
                      disabled={publishMutation.isPending}
                      className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        dev.lastValue === 'ON' ? 'bg-[#66fcf1]' : 'bg-gray-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#0b0c10] shadow ring-0 transition duration-200 ease-in-out ${
                          dev.lastValue === 'ON' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  ) : (
                    <div className="text-right">
                      <span className="text-base font-extrabold text-white">
                        {dev.lastValue || 'N/D'}
                      </span>
                      {isSensor && <span className="text-xs text-gray-400 ml-0.5">°C</span>}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1f2833] border border-[#66fcf1]/30 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-md font-bold text-[#66fcf1] mb-4">
              {editingDevice ? 'Editar Configuração IoT' : 'Cadastrar Novo Tópico IoT'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Nome do Dispositivo</label>
                <input
                  type="text"
                  required
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  placeholder="Ex: Ar Condicionado Copa"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Tópico MQTT</label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  placeholder="Ex: casa/sala/temperatura"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Tipo de Dado (Payload)</label>
                <select
                  value={payloadType}
                  onChange={(e) => setPayloadType(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                >
                  <option value="Switch">Switch (Liga/Desliga - ON/OFF)</option>
                  <option value="Sensor">Sensor de Leitura (Ex: Temperatura)</option>
                  <option value="Text">Texto Genérico (Ex: Logs, Mensagem)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-4 py-2 bg-[#66fcf1] text-[#0b0c10] hover:bg-[#45f3ff] text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
