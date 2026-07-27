import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import {
  QrCode, Tv, FileVideo, Download, RefreshCw, Layers, BarChart2,
  Settings, CheckCircle, XCircle, Heart, Eye, ChevronDown
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Rock10Status {
  isOnline: boolean;
  isAuthenticated: boolean;
  totalArenas: number;
  activeArenas: number;
  totalQuadras: number;
  activeQuadras: number;
  totalVideos: number;
  videosThisMonth: number;
  videosThisYear: number;
  totalDownloads: number;
  totalCurtidas: number;
}

interface Rock10Arena {
  id: number;
  nome: string;
  slug: string;
  uf: string;
  cidade: string;
  logoUrl?: string;
  ativo: boolean;
  totalQuadrasAtivas: number;
}

interface ReplayVideo {
  id: string;
  name: string;
  sizeMb: number;
  durationSeconds: number;
  downloads: number;
  curtidas: number;
  createdAt: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  arenaName?: string;
  arenaSlug?: string;
  isVertical: boolean;
}

type Tab = 'replays' | 'dashboard' | 'qr';

const API_BASE = 'http://localhost:5000/api/replays-qr';

// ─── Component ─────────────────────────────────────────────────────────────

export const ReplaysQrWidget: React.FC = () => {
  const { token } = useAuthStore();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('replays');
  const [selectedArena, setSelectedArena] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  // Settings form
  const [settingsUser, setSettingsUser] = useState('');
  const [settingsPass, setSettingsPass] = useState('');
  const [settingsUrl,  setSettingsUrl]  = useState('https://replay.rock10.com.br/api');

  // QR Generator states
  const [qrText,         setQrText]         = useState('');
  const [qrColor,        setQrColor]        = useState('66fcf1');
  const [qrBg,           setQrBg]           = useState('0b0c10');
  const [bulkText,       setBulkText]       = useState('');
  const [singleQrPreview, setSingleQrPreview] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: status, refetch: refetchStatus } = useQuery<Rock10Status>({
    queryKey: ['rock10-status'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/rock10/status`, { headers });
      if (!res.ok) throw new Error('Erro ao carregar status do Rock10.');
      return res.json();
    },
    refetchInterval: 60_000
  });

  const { data: arenas } = useQuery<Rock10Arena[]>({
    queryKey: ['rock10-arenas'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/rock10/arenas`, { headers });
      if (!res.ok) return [];
      return res.json();
    }
  });

  const { data: videos, isLoading: loadingVideos, refetch: refetchVideos } = useQuery<ReplayVideo[]>({
    queryKey: ['rock10-videos', selectedArena],
    queryFn: async () => {
      const params = selectedArena ? `?arenaSlug=${encodeURIComponent(selectedArena)}` : '';
      const res = await fetch(`${API_BASE}/rock10/videos${params}`, { headers });
      if (!res.ok) throw new Error('Erro ao carregar replays do Rock10.');
      return res.json();
    }
  });

  // ─── Mutations ───────────────────────────────────────────────────────────

  const configureMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/rock10/configure`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: settingsUrl, user: settingsUser, pass: settingsPass })
      });
      if (!res.ok) throw new Error('Falha ao salvar configurações.');
      return res.json();
    },
    onSuccess: () => {
      setShowSettings(false);
      qc.invalidateQueries({ queryKey: ['rock10-status'] });
      qc.invalidateQueries({ queryKey: ['rock10-videos'] });
      qc.invalidateQueries({ queryKey: ['rock10-arenas'] });
    }
  });

  const bulkMutation = useMutation({
    mutationFn: async (items: string[]) => {
      const res = await fetch(`${API_BASE}/qr/generate-batch`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, color: qrColor, bg: qrBg })
      });
      if (!res.ok) throw new Error('Erro ao gerar lote.');
      return res.blob();
    },
    onSuccess: (blob) => {
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href  = url;
      link.setAttribute('download', 'qrcodes.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleGenerateSingle = () => {
    if (!qrText) return;
    setSingleQrPreview(`${API_BASE}/qr/generate?text=${encodeURIComponent(qrText)}&color=${qrColor}&bg=${qrBg}`);
  };

  const handleGenerateBulk = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;
    bulkMutation.mutate(lines);
  };

  // ─── UI Helpers ──────────────────────────────────────────────────────────

  const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string }> =
    ({ icon, label, value, sub, accent = 'text-[#66fcf1]' }) => (
      <div className="bg-[#0b0c10]/50 p-4 rounded-xl border border-gray-800 flex items-center gap-3 min-w-0">
        <div className={`shrink-0 ${accent}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider truncate">{label}</p>
          <p className="text-base font-bold text-white leading-tight">{value}</p>
          {sub && <span className="text-[9px] text-gray-500">{sub}</span>}
        </div>
      </div>
    );

  const TabBtn: React.FC<{ id: Tab; icon: React.ReactNode; label: string }> =
    ({ id, icon, label }) => (
      <button
        onClick={() => setActiveTab(id)}
        className={`flex items-center gap-1.5 py-1.5 px-3 rounded text-xs font-bold transition ${
          activeTab === id ? 'bg-[#66fcf1] text-[#0b0c10]' : 'text-gray-400 hover:text-white'
        }`}
      >
        {icon}
        {label}
      </button>
    );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="bg-[#1f2833] p-6 rounded-xl border border-[#66fcf1]/10 flex flex-col h-full min-h-[480px]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-800 pb-4 mb-5 gap-3">
        <div className="flex items-center gap-2">
          <Tv className="text-[#66fcf1]" size={20} />
          <h2 className="text-lg font-bold text-white">Replays Rock10 & QR Codes</h2>
          {status && (
            <span className={`ml-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${status.isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {status.isOnline ? '● Online' : '● Offline'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Settings */}
          <button
            onClick={() => setShowSettings(s => !s)}
            className={`p-1.5 rounded-lg border transition ${showSettings ? 'border-[#66fcf1]/40 text-[#66fcf1]' : 'border-gray-800 text-gray-500 hover:text-gray-300'}`}
            title="Configurações Rock10"
          >
            <Settings size={14} />
          </button>
          {/* Refresh */}
          <button
            onClick={() => { refetchStatus(); refetchVideos(); }}
            className="p-1.5 rounded-lg border border-gray-800 text-gray-500 hover:text-[#66fcf1] transition"
            title="Atualizar"
          >
            <RefreshCw size={14} />
          </button>
          {/* Tabs */}
          <div className="flex bg-[#0b0c10] p-0.5 rounded-lg border border-gray-800">
            <TabBtn id="replays"   icon={<FileVideo size={12} />}  label="Replays"    />
            <TabBtn id="dashboard" icon={<BarChart2 size={12} />}  label="Stats"      />
            <TabBtn id="qr"        icon={<QrCode size={12} />}     label="QR Codes"   />
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-5 bg-[#0b0c10]/60 border border-amber-500/20 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <Settings size={12} /> Configurações de Integração Rock10
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">URL DA API</label>
              <input
                type="text"
                value={settingsUrl}
                onChange={e => setSettingsUrl(e.target.value)}
                className="w-full bg-[#1f2833] border border-gray-700 focus:border-amber-500/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none font-mono"
                placeholder="https://replay.rock10.com.br/api"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">USUÁRIO (CPF / E-MAIL)</label>
              <input
                type="text"
                value={settingsUser}
                onChange={e => setSettingsUser(e.target.value)}
                className="w-full bg-[#1f2833] border border-gray-700 focus:border-amber-500/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                placeholder="123.456.789-00"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 mb-1">SENHA</label>
              <input
                type="password"
                value={settingsPass}
                onChange={e => setSettingsPass(e.target.value)}
                className="w-full bg-[#1f2833] border border-gray-700 focus:border-amber-500/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                placeholder="••••••••"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => configureMutation.mutate()}
                disabled={configureMutation.isPending || !settingsUser || !settingsPass}
                className="w-full bg-amber-500 hover:bg-amber-400 text-[#0b0c10] text-xs font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {configureMutation.isPending ? 'Salvando...' : <><CheckCircle size={12} /> Salvar Credenciais</>}
              </button>
            </div>
          </div>
          {configureMutation.isError && (
            <p className="text-xs text-red-400 flex items-center gap-1"><XCircle size={12} /> {(configureMutation.error as Error).message}</p>
          )}
          {configureMutation.isSuccess && (
            <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> Credenciais salvas! Token JWT será renovado automaticamente.</p>
          )}
        </div>
      )}

      {/* ── Tab: REPLAYS ─────────────────────────────────────────────────── */}
      {activeTab === 'replays' && (
        <div className="space-y-4 flex-1 flex flex-col">

          {/* Arena Filter */}
          {arenas && arenas.length > 0 && (
            <div className="flex items-center gap-2">
              <ChevronDown size={12} className="text-gray-500" />
              <select
                value={selectedArena}
                onChange={e => setSelectedArena(e.target.value)}
                className="flex-1 bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1]/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="">Todas as arenas</option>
                {arenas.map(a => (
                  <option key={a.id} value={a.slug}>{a.nome} – {a.cidade}/{a.uf}</option>
                ))}
              </select>
            </div>
          )}

          {/* Videos List */}
          <div className="flex-1 flex flex-col min-h-0">
            {loadingVideos ? (
              <div className="text-gray-400 text-sm py-16 text-center animate-pulse flex-1 flex items-center justify-center">
                Buscando replays no servidor Rock10...
              </div>
            ) : !videos || videos.length === 0 ? (
              <div className="text-gray-500 text-center py-10 border border-dashed border-gray-800 rounded-lg flex-1 flex items-center justify-center text-xs">
                Nenhum replay encontrado.
              </div>
            ) : (
              <div className="space-y-2 flex-1 overflow-y-auto pr-0.5">
                {videos.map((vid) => (
                  <div key={vid.id} className="bg-[#0b0c10]/60 border border-gray-800 p-3 rounded-lg flex items-center gap-3 hover:border-gray-700 transition group">
                    {/* Thumbnail */}
                    <div className={`shrink-0 rounded overflow-hidden bg-black border border-gray-800 ${vid.isVertical ? 'w-8 h-14' : 'w-16 h-10'}`}>
                      {vid.thumbnailUrl
                        ? <img src={vid.thumbnailUrl} alt="thumb" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-700"><FileVideo size={14} /></div>
                      }
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{vid.name}</p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {vid.arenaName && <span className="text-[#66fcf1]/70">{vid.arenaName} · </span>}
                        {new Date(vid.createdAt).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[9px] text-gray-600 flex items-center gap-0.5"><Download size={9} />{vid.downloads}</span>
                        <span className="text-[9px] text-gray-600 flex items-center gap-0.5"><Heart size={9} />{vid.curtidas}</span>
                        {vid.durationSeconds > 0 && <span className="text-[9px] text-gray-600">{vid.durationSeconds}s</span>}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {vid.videoUrl && (
                        <a
                          href={vid.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 bg-[#66fcf1]/10 hover:bg-[#66fcf1]/20 border border-[#66fcf1]/20 text-[#66fcf1] py-1.5 px-2.5 rounded text-[10px] font-bold transition"
                          title="Ver vídeo"
                        >
                          <Eye size={11} />
                        </a>
                      )}
                      <a
                        href={vid.videoUrl ?? '#'}
                        download
                        className="flex items-center gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 py-1.5 px-2.5 rounded text-[10px] font-bold transition"
                        title="Baixar replay"
                      >
                        <Download size={11} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: DASHBOARD STATS ─────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4 flex-1">
          {!status?.isAuthenticated ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-10">
              <Settings size={32} className="text-gray-700" />
              <p className="text-sm text-gray-400 font-medium">Configure as Credenciais Rock10</p>
              <p className="text-xs text-gray-600 max-w-xs">Clique no ícone de engrenagem no cabeçalho e informe seu usuário e senha para ver as estatísticas ao vivo da plataforma Rock10.</p>
              <button
                onClick={() => setShowSettings(true)}
                className="mt-2 bg-amber-500/80 hover:bg-amber-500 text-[#0b0c10] text-xs font-bold py-2 px-4 rounded-lg transition"
              >
                Configurar agora
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard icon={<Tv size={20} />}       label="Arenas Ativas"     value={status?.activeArenas ?? '—'}  sub={`de ${status?.totalArenas ?? 0} total`} />
                <StatCard icon={<Layers size={20} />}   label="Quadras Ativas"    value={status?.activeQuadras ?? '—'} sub={`de ${status?.totalQuadras ?? 0} total`} accent="text-purple-400" />
                <StatCard icon={<FileVideo size={20} />} label="Vídeos (Total)"   value={status?.totalVideos ?? '—'}   accent="text-blue-400" />
                <StatCard icon={<FileVideo size={20} />} label="Vídeos este Mês"  value={status?.videosThisMonth ?? '—'} sub={`${status?.videosThisYear ?? 0} esse ano`} accent="text-indigo-400" />
                <StatCard icon={<Download size={20} />} label="Downloads Totais"  value={(status?.totalDownloads ?? 0).toLocaleString('pt-BR')} accent="text-emerald-400" />
                <StatCard icon={<Heart size={20} />}    label="Curtidas Totais"   value={(status?.totalCurtidas ?? 0).toLocaleString('pt-BR')} accent="text-pink-400" />
              </div>

              {/* Arenas list */}
              {arenas && arenas.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Arenas Cadastradas</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {arenas.map(a => (
                      <div key={a.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${a.ativo ? 'border-gray-800 bg-[#0b0c10]/40' : 'border-gray-800/50 opacity-50'}`}>
                        <span className="font-semibold text-white">{a.nome}</span>
                        <span className="text-gray-500">{a.cidade}/{a.uf} · {a.totalQuadrasAtivas} quadras</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Tab: QR CODES ───────────────────────────────────────────────── */}
      {activeTab === 'qr' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">

          {/* Form panel */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Configurações Gerais</h3>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'COR DO QR CODE', val: qrColor, setter: setQrColor },
                { label: 'COR DO FUNDO',   val: qrBg,    setter: setQrBg    }
              ].map(({ label, val, setter }) => (
                <div key={label}>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1">{label}</label>
                  <div className="flex gap-2 items-center bg-[#0b0c10] border border-gray-800 rounded-lg px-3 py-1.5">
                    <input type="color" value={`#${val}`} onChange={e => setter(e.target.value.replace('#', ''))}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
                    <input type="text" value={val} onChange={e => setter(e.target.value)}
                      className="w-full bg-transparent text-xs text-white uppercase outline-none" placeholder="Hex" />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-xs font-bold text-gray-400 mb-2">Geração Individual</h4>
              <div className="flex gap-2">
                <input
                  type="text" value={qrText} onChange={e => setQrText(e.target.value)}
                  className="flex-1 bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  placeholder="Cole aqui a URL ou texto..."
                />
                <button onClick={handleGenerateSingle}
                  className="bg-[#66fcf1] text-[#0b0c10] hover:bg-[#45f3ff] text-xs font-bold py-2 px-4 rounded-lg transition">
                  Gerar
                </button>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-4">
              <h4 className="text-xs font-bold text-gray-400 mb-1">Geração em Lote</h4>
              <p className="text-[10px] text-gray-500 mb-2">Uma URL ou texto por linha.</p>
              <textarea
                value={bulkText} onChange={e => setBulkText(e.target.value)} rows={4}
                className="w-full bg-[#0b0c10] border border-gray-800 focus:border-[#66fcf1] rounded-lg p-3 text-xs text-white focus:outline-none font-mono"
                placeholder={"https://exemplo.com/1\nhttps://exemplo.com/2"}
              />
              <button onClick={handleGenerateBulk} disabled={bulkMutation.isPending}
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 text-[#0b0c10] text-xs font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5">
                {bulkMutation.isPending ? 'Compactando...' : <><Download size={14} /> Gerar e Baixar ZIP</>}
              </button>
            </div>
          </div>

          {/* Preview panel */}
          <div className="bg-[#0b0c10]/40 border border-gray-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[260px] relative">
            <h3 className="absolute top-3 left-3 text-[10px] font-bold text-gray-500 uppercase">Preview</h3>
            {singleQrPreview ? (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-[#0b0c10] border border-gray-800 rounded-xl">
                  <img src={singleQrPreview} alt="QR Code Preview" className="w-40 h-40 object-contain" />
                </div>
                <p className="text-[10px] text-gray-500 font-mono select-all truncate max-w-[200px]">{qrText}</p>
                <a href={singleQrPreview} download="qrcode.svg"
                  className="flex items-center gap-1 text-[10px] font-bold text-[#66fcf1] hover:underline">
                  <Download size={12} /> Baixar SVG
                </a>
              </div>
            ) : (
              <div className="text-center text-gray-600 text-xs">
                <QrCode size={40} className="mx-auto text-gray-700 mb-2" />
                <p>Nenhum QR Code gerado.</p>
                <p className="text-[10px] text-gray-700 mt-1">Preencha o campo e clique em "Gerar".</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
