import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { Terminal as TerminalIcon, Loader2, Link, Link2Off, ArrowRight } from 'lucide-react';

interface TerminalLine {
  text: string;
  type: 'output' | 'error' | 'system';
}

export const WebTerminalWidget: React.FC = () => {
  const { token } = useAuthStore();
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [inputVal, setInputVal] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const outputEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setConnectionError(null);
    setLines([{ text: 'Iniciando conexão SSH...', type: 'system' }]);

    try {
      // 1. Post connection details to get a token
      const res = await fetch('http://localhost:5000/api/terminal/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          host,
          port,
          username,
          password: password || null,
          privateKey: privateKey || null,
          passphrase: passphrase || null
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Erro ao registrar credenciais no backend.');
      }

      const { token: wsToken } = await res.json();

      // 2. Connect to WebSocket
      const wsUrl = `ws://localhost:5000/api/terminal/ws?token=${wsToken}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setLines(prev => [...prev, { text: 'Conexão estabelecida com sucesso!', type: 'system' }]);
      };

      ws.onmessage = (event) => {
        const data = event.data;
        // Parse basic ANSI escape codes and clean carriage returns
        const cleanText = data
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, ''); // strip colors for simple rendering

        if (cleanText.trim() || cleanText === '\n') {
          const newLines = cleanText.split('\n').filter((l: string) => l !== '');
          setLines(prev => [
            ...prev,
            ...newLines.map((l: string) => ({ text: l, type: 'output' as const }))
          ]);
        }
      };

      ws.onerror = () => {
        setConnectionError('Erro na ponte WebSocket.');
        handleDisconnect();
      };

      ws.onclose = (event) => {
        setConnected(false);
        setConnecting(false);
        setLines(prev => [...prev, { text: `Conexão fechada (${event.reason || 'Desconectado'})`, type: 'system' }]);
      };

    } catch (err: any) {
      setConnectionError(err.message);
      setConnecting(false);
      setLines(prev => [...prev, { text: `Erro de conexão: ${err.message}`, type: 'error' }]);
    }
  };

  const handleDisconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  };

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !inputVal.trim()) return;

    // Send input with newline
    wsRef.current.send(inputVal + '\n');
    setLines(prev => [...prev, { text: `$ ${inputVal}`, type: 'system' }]);
    setInputVal('');
  };

  return (
    <div className="bg-[#1f2833] p-6 rounded-2xl border border-[#45f3ff]/10 h-full flex flex-col justify-between min-h-[450px]">
      <div>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-950/40 rounded-xl border border-purple-500/20 text-[#a855f7]">
              <TerminalIcon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white tracking-wide text-sm sm:text-base">Terminal Web (SSH)</h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {connected ? `Conectado a ${username}@${host}` : 'Acesso SSH seguro'}
              </p>
            </div>
          </div>

          {connected && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1 bg-red-950/40 border border-red-500/30 text-red-400 py-1.5 px-3 rounded-lg text-xs font-bold transition hover:bg-red-900/40"
            >
              <Link2Off size={13} />
              Desconectar
            </button>
          )}
        </div>

        {/* Config Form (if not connected) */}
        {!connected && (
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] text-gray-400 mb-1">Host / IP</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Porta</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Senha (opcional se usar chave)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 mb-1">Chave Privada SSH (PEM/OpenSSH - opcional)</label>
              <textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg px-3 py-2 text-[10px] font-mono text-white focus:outline-none focus:border-cyan-500 h-16 resize-none custom-scrollbar"
                placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
              />
            </div>

            {privateKey && (
              <div>
                <label className="block text-[10px] text-gray-400 mb-1">Passphrase da Chave</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            )}

            {connectionError && (
              <div className="bg-red-950/40 border border-red-500/30 text-red-400 text-xs p-3 rounded-lg">
                {connectionError}
              </div>
            )}

            <button
              type="submit"
              disabled={connecting}
              className="w-full flex items-center justify-center gap-2 bg-[#66fcf1] text-[#0b0c10] py-2 px-4 rounded-xl text-xs font-bold transition hover:bg-[#45f3ff] disabled:opacity-40"
            >
              {connecting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <Link size={14} />
                  Conectar Terminal
                </>
              )}
            </button>
          </form>
        )}

        {/* Terminal Screen (if connected) */}
        {connected && (
          <div className="flex flex-col h-[320px] bg-[#0b0c10] border border-gray-800 rounded-xl p-3 overflow-hidden font-mono text-xs">
            {/* Output buffer */}
            <div className="flex-1 overflow-y-auto mb-2 space-y-1 pr-1 custom-scrollbar">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className={
                    line.type === 'system'
                      ? 'text-cyan-400'
                      : line.type === 'error'
                      ? 'text-rose-400'
                      : 'text-gray-300'
                  }
                >
                  {line.text}
                </div>
              ))}
              <div ref={outputEndRef} />
            </div>

            {/* Input bar */}
            <form onSubmit={handleSendCommand} className="flex gap-2 border-t border-gray-900 pt-2">
              <span className="text-[#66fcf1] font-bold select-none">$</span>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="flex-1 bg-transparent text-white focus:outline-none outline-none caret-cyan-400"
                placeholder="Digite seu comando..."
                autoFocus
              />
              <button type="submit" className="text-gray-400 hover:text-white">
                <ArrowRight size={14} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
