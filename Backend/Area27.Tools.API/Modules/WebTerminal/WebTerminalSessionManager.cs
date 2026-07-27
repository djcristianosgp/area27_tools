using System;
using System.Collections.Concurrent;

namespace Area27.Tools.API.Modules.WebTerminal;

public class WebTerminalSessionManager
{
    private readonly ConcurrentDictionary<string, TerminalConnectionInfo> _sessions = new();

    public string CreateSession(TerminalConnectionInfo info)
    {
        var token = Guid.NewGuid().ToString("N");
        _sessions[token] = info with { CreatedAt = DateTime.UtcNow };
        
        // Clean up expired sessions (older than 5 minutes)
        foreach (var key in _sessions.Keys)
        {
            if (_sessions.TryGetValue(key, out var sess) && DateTime.UtcNow - sess.CreatedAt > TimeSpan.FromMinutes(5))
            {
                _sessions.TryRemove(key, out _);
            }
        }

        return token;
    }

    public TerminalConnectionInfo? GetSession(string token)
    {
        if (_sessions.TryGetValue(token, out var info))
        {
            // Optional: one-time use tokens, but for now we keep it so the WebSocket can connect and then we can optionally remove it or keep it.
            // Let's remove it after retrieval to ensure security.
            _sessions.TryRemove(token, out _);
            if (DateTime.UtcNow - info.CreatedAt <= TimeSpan.FromMinutes(5))
            {
                return info;
            }
        }
        return null;
    }
}

public record TerminalConnectionInfo(
    string Host,
    int Port,
    string Username,
    string? Password,
    string? PrivateKey,
    string? Passphrase,
    DateTime CreatedAt
);
