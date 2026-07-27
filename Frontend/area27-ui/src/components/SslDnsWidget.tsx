import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { 
  ShieldCheck, ShieldAlert, Search, Trash2, Plus, Loader2, RefreshCw
} from 'lucide-react';

interface SslDomain {
  id: number;
  domain: string;
  port: number;
  issuer: string | null;
  expirationDate: string | null;
  lastChecked: string;
  isValid: boolean;
  errorMessage: string | null;
}

interface DnsAnswer {
  name: string;
  type: number;
  ttl: number;
  data: string;
}

interface DnsResolveResponse {
  Answer?: DnsAnswer[];
  Status: number;
}

export const SslDnsWidget: React.FC = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  // Add Domain state
  const [newDomain, setNewDomain] = useState('');
  const [newPort, setNewPort] = useState(443);

  // DNS query state
  const [dnsDomain, setDnsDomain] = useState('');
  const [dnsType, setDnsType] = useState('A');
  const [dnsResults, setDnsResults] = useState<DnsAnswer[] | null>(null);
  const [dnsSearching, setDnsSearching] = useState(false);
  const [dnsError, setDnsError] = useState<string | null>(null);

  // Fetch monitored domains
  const { data: domains, isLoading } = useQuery<SslDomain[]>({
    queryKey: ['ssl-domains'],
    queryFn: async () => {
      const res = await fetch('http://localhost:5000/api/ssldns/domains', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao obter domínios.');
      return res.json();
    }
  });

  // Add domain mutation
  const addDomainMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('http://localhost:5000/api/ssldns/domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ domain: newDomain, port: newPort })
      });
      if (!res.ok) throw new Error('Erro ao adicionar domínio.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssl-domains'] });
      setNewDomain('');
      setNewPort(443);
    }
  });

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:5000/api/ssldns/domains/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao remover domínio.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssl-domains'] });
    }
  });

  // Re-check SSL mutation
  const checkDomainMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`http://localhost:5000/api/ssldns/domains/${id}/check`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao verificar SSL.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ssl-domains'] });
    }
  });

  // Handle DNS query
  const handleDnsResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dnsDomain.trim()) return;

    setDnsSearching(true);
    setDnsError(null);
    setDnsResults(null);

    try {
      const res = await fetch(
        `http://localhost:5000/api/ssldns/dns/resolve?domain=${encodeURIComponent(dnsDomain)}&type=${dnsType}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Falha na consulta DNS.');

      const data: DnsResolveResponse = await res.json();
      if (data.Answer) {
        setDnsResults(data.Answer);
      } else {
        setDnsResults([]);
      }
    } catch (err: any) {
      setDnsError(err.message);
    } finally {
      setDnsSearching(false);
    }
  };

  const getDaysRemaining = (expDateStr: string | null): number => {
    if (!expDateStr) return 0;
    const diff = new Date(expDateStr).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="bg-[#1f2833] p-6 rounded-2xl border border-[#45f3ff]/10 h-full flex flex-col justify-between min-h-[450px]">
      <div>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-emerald-950/40 rounded-xl border border-emerald-500/20 text-emerald-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 className="font-bold text-white tracking-wide text-sm sm:text-base">Certificados SSL & DNS</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Validade de certificados e resolvedor DNS rápido
            </p>
          </div>
        </div>

        {/* Section 1: SSL Certificate Monitor */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Monitor de Certificados SSL</h4>
          </div>

          {/* Add Domain Form */}
          <form
            onSubmit={(e) => { e.preventDefault(); addDomainMutation.mutate(); }}
            className="flex gap-2 mb-3"
          >
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="exemplo.com"
              className="flex-1 bg-[#0b0c10] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              required
            />
            <input
              type="number"
              value={newPort}
              onChange={(e) => setNewPort(Number(e.target.value))}
              placeholder="443"
              className="w-16 bg-[#0b0c10] border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              required
            />
            <button
              type="submit"
              disabled={addDomainMutation.isPending}
              className="bg-[#66fcf1] text-[#0b0c10] px-3 rounded-lg text-xs font-bold transition hover:bg-[#45f3ff] disabled:opacity-40"
            >
              {addDomainMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            </button>
          </form>

          {/* Domains List */}
          <div className="bg-[#0b0c10] rounded-xl border border-gray-800 divide-y divide-gray-900 max-h-[160px] overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                Carregando domínios...
              </div>
            ) : !domains || domains.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                Nenhum domínio cadastrado.
              </div>
            ) : (
              domains.map((dom) => {
                const days = getDaysRemaining(dom.expirationDate);
                const isNearExp = days <= 30 && dom.isValid;
                return (
                  <div key={dom.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-gray-800/10 transition">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {dom.isValid ? (
                          <ShieldCheck size={14} className="text-emerald-400" />
                        ) : (
                          <ShieldAlert size={14} className="text-rose-400" />
                        )}
                        <span className="font-bold text-white truncate">{dom.domain}:{dom.port}</span>
                        {dom.isValid && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            isNearExp ? 'bg-orange-950/40 text-orange-400 border border-orange-500/20' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {days} dias restantes
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5 truncate">
                        {dom.errorMessage ? (
                          <span className="text-rose-400 font-medium">{dom.errorMessage}</span>
                        ) : (
                          <span>Emitido por: <strong className="text-gray-400">{dom.issuer?.split(',')[0].replace('CN=', '') || 'N/A'}</strong></span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 ml-2">
                      <button
                        onClick={() => checkDomainMutation.mutate(dom.id)}
                        disabled={checkDomainMutation.isPending}
                        className="p-1 hover:bg-gray-900 rounded text-gray-400 hover:text-white transition disabled:opacity-40"
                        title="Verificar agora"
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        onClick={() => deleteDomainMutation.mutate(dom.id)}
                        disabled={deleteDomainMutation.isPending}
                        className="p-1 hover:bg-gray-900 rounded text-gray-400 hover:text-rose-400 transition disabled:opacity-40"
                        title="Remover"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Section 2: DNS Resolver */}
        <div>
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Resolvedor DNS Rápido</h4>
          <form onSubmit={handleDnsResolve} className="grid grid-cols-4 gap-2 mb-3">
            <div className="col-span-2">
              <input
                type="text"
                value={dnsDomain}
                onChange={(e) => setDnsDomain(e.target.value)}
                placeholder="google.com"
                className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <select
                value={dnsType}
                onChange={(e) => setDnsType(e.target.value)}
                className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="TXT">TXT</option>
                <option value="MX">MX</option>
                <option value="NS">NS</option>
                <option value="CNAME">CNAME</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={dnsSearching}
              className="flex items-center justify-center gap-1 bg-[#66fcf1] text-[#0b0c10] py-1.5 rounded-lg text-xs font-bold transition hover:bg-[#45f3ff] disabled:opacity-40"
            >
              {dnsSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              Resolver
            </button>
          </form>

          {/* DNS results */}
          {dnsResults && (
            <div className="bg-[#0b0c10] rounded-xl border border-gray-800 p-2.5 max-h-[140px] overflow-y-auto custom-scrollbar font-mono text-[10px]">
              {dnsResults.length === 0 ? (
                <div className="text-center py-2 text-gray-500">
                  Nenhum registro encontrado.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {dnsResults.map((r, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4 text-gray-300 border-b border-gray-900 pb-1.5 last:border-0 last:pb-0">
                      <span className="text-[#66fcf1] select-all break-all">{r.data}</span>
                      <span className="text-gray-500 shrink-0">TTL: {r.ttl}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {dnsError && (
            <div className="bg-red-950/40 border border-red-500/30 text-red-400 text-[10px] p-2.5 rounded-lg">
              {dnsError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
