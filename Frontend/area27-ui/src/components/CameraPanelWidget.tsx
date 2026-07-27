import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { Video, Plus, Trash2, Edit2, MapPin, Power, PowerOff } from 'lucide-react';

interface Camera {
  id: number;
  name: string;
  rtspUrl: string;
  mjpegUrl?: string;
  location?: string;
  isActive: boolean;
}

export const CameraPanelWidget: React.FC = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [rtspUrl, setRtspUrl] = useState('');
  const [mjpegUrl, setMjpegUrl] = useState('');
  const [location, setLocation] = useState('');

  // Fetch cameras
  const { data: cameras, isLoading, error } = useQuery<Camera[]>({
    queryKey: ['cameras'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/cameras', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao buscar câmeras.');
      return res.json();
    }
  });

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: async (cameraData: any) => {
      const url = editingCamera 
        ? `http://localhost:5000/api/cameras/${editingCamera.id}`
        : 'http://localhost:5000/api/cameras';
      const method = editingCamera ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(cameraData)
      });
      if (!res.ok) throw new Error('Erro ao salvar câmera.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
      closeModal();
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:5000/api/cameras/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao deletar câmera.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    }
  });

  // Toggle Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (cam: Camera) => {
      const res = await fetch(`http://localhost:5000/api/cameras/${cam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !cam.isActive })
      });
      if (!res.ok) throw new Error('Erro ao alternar status.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    }
  });

  const openAddModal = () => {
    setEditingCamera(null);
    setName('');
    setRtspUrl('');
    setMjpegUrl('');
    setLocation('');
    setIsModalOpen(true);
  };

  const openEditModal = (cam: Camera) => {
    setEditingCamera(cam);
    setName(cam.name);
    setRtspUrl(cam.rtspUrl);
    setMjpegUrl(cam.mjpegUrl || '');
    setLocation(cam.location || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCamera(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name,
      rtspUrl,
      mjpegUrl: mjpegUrl || null,
      location: location || null
    });
  };

  return (
    <div className="bg-[#1f2833] p-6 rounded-xl border border-[#66fcf1]/10 flex flex-col h-full min-h-[400px]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Video className="text-[#66fcf1]" size={20} />
          <h2 className="text-lg font-bold text-white">Painel de Câmeras</h2>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1 bg-[#66fcf1]/10 hover:bg-[#66fcf1]/20 border border-[#66fcf1]/30 text-[#66fcf1] py-1 px-3 rounded-lg text-xs font-semibold transition"
        >
          <Plus size={14} />
          Adicionar Câmera
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm mb-4">Falha ao carregar as câmeras do painel.</div>
      )}

      {isLoading ? (
        <div className="text-gray-400 text-sm flex-1 flex items-center justify-center animate-pulse">
          Carregando transmissões...
        </div>
      ) : cameras?.length === 0 ? (
        <div className="text-gray-500 text-sm flex-1 flex flex-col items-center justify-center border border-dashed border-gray-800 rounded-lg p-8">
          <p>Nenhuma câmera cadastrada.</p>
          <p className="text-xs text-gray-600 mt-1">Clique em "Adicionar Câmera" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {cameras?.map((cam) => (
            <div key={cam.id} className="bg-[#0b0c10]/60 border border-gray-800 rounded-xl overflow-hidden flex flex-col group relative">
              
              {/* Header Bar overlay */}
              <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-[#0b0c10]/90 to-transparent p-3 flex justify-between items-start z-10">
                <div>
                  <h3 className="font-semibold text-xs text-white drop-shadow">{cam.name}</h3>
                  {cam.location && (
                    <span className="text-[10px] text-gray-300 flex items-center gap-0.5 drop-shadow mt-0.5">
                      <MapPin size={10} />
                      {cam.location}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleActiveMutation.mutate(cam)}
                    className={`p-1 rounded-md transition ${
                      cam.isActive ? 'bg-emerald-950/60 text-emerald-400' : 'bg-gray-950/60 text-gray-400'
                    }`}
                    title={cam.isActive ? 'Desativar Câmera' : 'Ativar Câmera'}
                  >
                    {cam.isActive ? <Power size={12} /> : <PowerOff size={12} />}
                  </button>
                  <button
                    onClick={() => openEditModal(cam)}
                    className="p-1 rounded-md bg-blue-950/60 text-blue-400 hover:bg-blue-900/60 transition"
                    title="Editar"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(cam.id)}
                    className="p-1 rounded-md bg-red-950/60 text-red-400 hover:bg-red-900/60 transition"
                    title="Excluir"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Camera Feed Stream Box */}
              <div className="w-full aspect-video bg-black flex items-center justify-center text-xs text-gray-500 relative overflow-hidden">
                {cam.isActive ? (
                  <img
                    src={`http://localhost:5000/api/cameras/${cam.id}/stream`}
                    alt={cam.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // fallback representation if stream has network errors
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        const fallbackText = document.createElement('div');
                        fallbackText.className = "flex flex-col items-center justify-center p-4 text-center";
                        fallbackText.innerHTML = `<p class="text-red-400 font-semibold">Falha no Feed</p><p class="text-[10px] text-gray-600 mt-1">${cam.rtspUrl}</p>`;
                        parent.appendChild(fallbackText);
                      }
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1.5">
                    <PowerOff size={24} className="text-gray-700" />
                    <span>Transmissão Inativa</span>
                  </div>
                )}
                
                {/* RTSP Info tag on hover */}
                <div className="absolute bottom-2 left-2 bg-[#0b0c10]/85 px-2 py-0.5 rounded text-[9px] text-gray-400 border border-gray-800 opacity-0 group-hover:opacity-100 transition-opacity">
                  {cam.rtspUrl}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1f2833] border border-[#66fcf1]/30 p-6 rounded-xl w-full max-w-md shadow-2xl">
            <h3 className="text-md font-bold text-[#66fcf1] mb-4">
              {editingCamera ? 'Editar Câmera' : 'Adicionar Nova Câmera'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Nome da Câmera</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  placeholder="Ex: Câmera Portão A"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Endereço RTSP (Fluxo Principal)</label>
                <input
                  type="text"
                  required
                  value={rtspUrl}
                  onChange={(e) => setRtspUrl(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  placeholder="Ex: rtsp://admin:senha@192.168.1.100/stream"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">URL MJPEG / HTTP (Opcional)</label>
                <input
                  type="text"
                  value={mjpegUrl}
                  onChange={(e) => setMjpegUrl(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  placeholder="Ex: http://192.168.1.100/mjpg/video.mjpg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Localização (Opcional)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  placeholder="Ex: Estúdio 1, Almoxarifado"
                />
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
