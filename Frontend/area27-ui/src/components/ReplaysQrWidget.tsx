import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { QrCode, Tv, FileVideo, HardDrive, Download, RefreshCw, Layers } from 'lucide-react';

interface ReplayVideo {
  id: string;
  name: string;
  sizeMb: number;
  durationSeconds: number;
  createdAt: string;
  thumbnailUrl?: string;
}

interface Rock10Status {
  isOnline: boolean;
  diskUsedGb: number;
  diskTotalGb: number;
  diskFreeGb: number;
  diskPercentUsed: number;
  activeQueueCount: number;
  connectedCameras: string[];
}

export const ReplaysQrWidget: React.FC = () => {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'replays' | 'qr'>('replays');

  // QR Generator states
  const [qrText, setQrText] = useState('');
  const [qrColor, setQrColor] = useState('66fcf1');
  const [qrBg, setQrBg] = useState('0b0c10');
  const [bulkText, setBulkText] = useState('');
  const [singleQrPreview, setSingleQrPreview] = useState<string | null>(null);

  // Fetch Rock10 Status
  const { data: status, refetch: refetchStatus } = useQuery<Rock10Status>({
    queryKey: ['rock10-status'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/replays-qr/rock10/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar status do Rock10.');
      return res.json();
    }
  });

  // Fetch Replay Videos
  const { data: videos, isLoading: loadingVideos, refetch: refetchVideos } = useQuery<ReplayVideo[]>({
    queryKey: ['rock10-videos'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/replays-qr/rock10/videos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar replays do Rock10.');
      return res.json();
    }
  });

  // Bulk QR Mutation
  const bulkMutation = useMutation({
    mutationFn: async (items: string[]) => {
      const res = await fetch('http://localhost:5000/api/replays-qr/qr/generate-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          items,
          color: qrColor,
          bg: qrBg
        })
      });
      if (!res.ok) throw new Error('Erro ao gerar lote.');
      return res.blob();
    },
    onSuccess: (blob) => {
      // Trigger browser file download for ZIP
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'qrcodes.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  });

  const handleGenerateSingle = () => {
    if (!qrText) return;
    const url = `http://localhost:5000/api/replays-qr/qr/generate?text=${encodeURIComponent(qrText)}&color=${qrColor}&bg=${qrBg}`;
    setSingleQrPreview(url);
  };

  const handleGenerateBulk = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    bulkMutation.mutate(lines);
  };

  return (
    <div className="bg-[#1f2833] p-6 rounded-xl border border-[#66fcf1]/10 flex flex-col h-full min-h-[450px]">
      
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-4 mb-6 gap-3">
        <div className="flex items-center gap-2">
          {activeTab === 'replays' ? <Tv className="text-[#66fcf1]" size={20} /> : <QrCode className="text-[#66fcf1]" size={20} />}
          <h2 className="text-lg font-bold text-white">Replays &amp; QR Codes</h2>
        </div>
        <div className="flex bg-[#0b0c10] p-1 rounded-lg border border-gray-800 text-xs">
          <button
            onClick={() => setActiveTab('replays')}
            className={`py-1.5 px-3 rounded font-bold transition ${
              activeTab === 'replays' ? 'bg-[#66fcf1] text-[#0b0c10]' : 'text-gray-400 hover:text-white'
            }`}
          >
            Replays (Rock10)
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`py-1.5 px-3 rounded font-bold transition ${
              activeTab === 'qr' ? 'bg-[#66fcf1] text-[#0b0c10]' : 'text-gray-400 hover:text-white'
            }`}
          >
            Gerador de QR Code
          </button>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'replays' ? (
        <div className="space-y-6 flex-1 flex flex-col">
          
          {/* Status summary */}
          {status && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0b0c10]/40 p-4 rounded-xl border border-gray-800 flex items-center gap-3">
                <HardDrive className="text-[#66fcf1]" size={24} />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Armazenamento Rock10</p>
                  <p className="text-sm font-bold text-white">
                    {status.diskUsedGb.toFixed(0)} GB / {status.diskTotalGb.toFixed(0)} GB
                  </p>
                  <span className="text-[9px] text-gray-400">({status.diskPercentUsed}% Usado)</span>
                </div>
              </div>

              <div className="bg-[#0b0c10]/40 p-4 rounded-xl border border-gray-800 flex items-center gap-3">
                <FileVideo className="text-emerald-400" size={24} />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Gravações na Fila</p>
                  <p className="text-sm font-bold text-white">{status.activeQueueCount} Ativas</p>
                  <span className="text-[9px] text-emerald-500">Sistema Online</span>
                </div>
              </div>

              <div className="bg-[#0b0c10]/40 p-4 rounded-xl border border-gray-800 flex items-center gap-3">
                <Layers className="text-purple-400" size={24} />
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Câmeras Conectadas</p>
                  <p className="text-sm font-bold text-white">{status.connectedCameras.length} Câmeras</p>
                  <span className="text-[9px] text-gray-400" title={status.connectedCameras.join(', ')}>
                    {status.connectedCameras[0]}...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Videos Grid */}
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Fila de Replays Salvos</h3>
              <button
                onClick={() => { refetchStatus(); refetchVideos(); }}
                className="text-gray-400 hover:text-[#66fcf1] transition p-1"
                title="Atualizar Replays"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {loadingVideos ? (
              <div className="text-gray-400 text-sm py-20 text-center animate-pulse flex-1 flex items-center justify-center">
                Buscando arquivos no servidor Rock10...
              </div>
            ) : videos?.length === 0 ? (
              <div className="text-gray-500 text-center py-10 border border-dashed border-gray-800 rounded-lg flex-1 flex items-center justify-center">
                Nenhum replay salvo encontrado no diretório do Rock10.
              </div>
            ) : (
              <div className="space-y-3 flex-1">
                {videos?.map((vid) => (
                  <div key={vid.id} className="bg-[#0b0c10]/60 border border-gray-800 p-3 rounded-lg flex items-center justify-between hover:border-gray-700 transition">
                    <div className="flex items-center gap-3">
                      <img
                        src={vid.thumbnailUrl}
                        alt="Replay Preview"
                        className="w-14 h-10 object-cover rounded bg-black border border-gray-800"
                      />
                      <div>
                        <p className="text-xs font-semibold text-white">{vid.name}</p>
                        <p className="text-[10px] text-gray-500">
                          Duração: {vid.durationSeconds}s • Tamanho: {vid.sizeMb} MB • {new Date(vid.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-1 bg-[#66fcf1]/10 hover:bg-[#66fcf1]/20 border border-[#66fcf1]/20 text-[#66fcf1] py-1.5 px-3 rounded text-[10px] font-bold transition"
                      onClick={() => alert(`Iniciando download do replay: ${vid.name}`)}
                    >
                      <Download size={12} />
                      Baixar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
          
          {/* Form Generation Panel */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Configurações Gerais</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">COR DO QR CODE</label>
                <div className="flex gap-2 items-center bg-[#0b0c10] border border-gray-800 rounded-lg px-3 py-1.5">
                  <input
                    type="color"
                    value={`#${qrColor}`}
                    onChange={(e) => setQrColor(e.target.value.replace('#', ''))}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                    className="w-full bg-transparent text-xs text-white uppercase outline-none"
                    placeholder="Hex"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-500 mb-1">COR DO FUNDO</label>
                <div className="flex gap-2 items-center bg-[#0b0c10] border border-gray-800 rounded-lg px-3 py-1.5">
                  <input
                    type="color"
                    value={`#${qrBg}`}
                    onChange={(e) => setQrBg(e.target.value.replace('#', ''))}
                    className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={qrBg}
                    onChange={(e) => setQrBg(e.target.value)}
                    className="w-full bg-transparent text-xs text-white uppercase outline-none"
                    placeholder="Hex"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-xs font-bold text-gray-400 mb-2">Geração Individual</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrText}
                  onChange={(e) => setQrText(e.target.value)}
                  className="flex-1 bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  placeholder="Cole aqui a URL ou texto..."
                />
                <button
                  onClick={handleGenerateSingle}
                  className="bg-[#66fcf1] text-[#0b0c10] hover:bg-[#45f3ff] text-xs font-bold py-2 px-4 rounded-lg transition"
                >
                  Gerar
                </button>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-xs font-bold text-gray-400 mb-1">Geração em Lote (Linhagem/URLs)</h4>
              <p className="text-[10px] text-gray-500 mb-2">Insira uma URL ou texto por linha.</p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={4}
                className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg p-3 text-xs text-white focus:outline-none font-mono"
                placeholder="https://exemplo.com/1&#10;https://exemplo.com/2&#10;https://exemplo.com/3"
              />
              <button
                onClick={handleGenerateBulk}
                disabled={bulkMutation.isPending}
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-[#0b0c10] text-xs font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {bulkMutation.isPending ? 'Compactando...' : (
                  <>
                    <Download size={14} />
                    Gerar e Baixar ZIP do Lote
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-[#0b0c10]/40 border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[250px] relative">
            <h3 className="absolute top-3 left-3 text-[10px] font-bold text-gray-500 uppercase">Preview de Saída</h3>
            {singleQrPreview ? (
              <div className="flex flex-col items-center gap-4 animate-scaleUp">
                <div className="p-3 bg-[#0b0c10] border border-gray-800 rounded-xl">
                  <img
                    src={singleQrPreview}
                    alt="QR Code Preview"
                    className="w-40 h-40 object-contain"
                  />
                </div>
                <p className="text-[10px] text-gray-500 font-mono select-all truncate max-w-[200px]">
                  {qrText}
                </p>
                <a
                  href={singleQrPreview}
                  download="qrcode.svg"
                  className="flex items-center gap-1 text-[10px] font-bold text-[#66fcf1] hover:underline"
                >
                  <Download size={12} />
                  Baixar Imagem Individual
                </a>
              </div>
            ) : (
              <div className="text-center text-gray-600 text-xs">
                <QrCode size={40} className="mx-auto text-gray-700 mb-2" />
                <p>Nenhum QR Code gerado.</p>
                <p className="text-[10px] text-gray-700 mt-1">Preencha o campo de texto e clique em "Gerar".</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
