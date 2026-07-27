using System;
using System.IO;
using System.Linq;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Area27.Tools.API.Modules.WebTerminal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Renci.SshNet;
using Renci.SshNet.Common;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller responsável pela ponte terminal Web SSH.
/// </summary>
[ApiController]
[Route("api/terminal")]
public class WebTerminalController : ControllerBase
{
    private readonly WebTerminalSessionManager _sessionManager;

    public WebTerminalController(WebTerminalSessionManager sessionManager)
    {
        _sessionManager = sessionManager;
    }

    /// <summary>
    /// Registra uma conexão SSH temporária e retorna um token para handshake WebSocket.
    /// </summary>
    [Authorize]
    [HttpPost("connect")]
    [Consumes("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult Connect([FromBody] ConnectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Host) || string.IsNullOrWhiteSpace(request.Username))
        {
            return BadRequest(new { message = "Host e Usuário são obrigatórios." });
        }

        var token = _sessionManager.CreateSession(new TerminalConnectionInfo(
            Host: request.Host,
            Port: request.Port <= 0 ? 22 : request.Port,
            Username: request.Username,
            Password: request.Password,
            PrivateKey: request.PrivateKey,
            Passphrase: request.Passphrase,
            CreatedAt: DateTime.UtcNow
        ));

        return Ok(new { token });
    }

    /// <summary>
    /// Estabelece a conexão WebSocket para a sessão de terminal SSH ativa.
    /// </summary>
    [HttpGet("ws")]
    public async Task GetWebSocket([FromQuery] string token)
    {
        if (HttpContext.WebSockets.IsWebSocketRequest)
        {
            using var webSocket = await HttpContext.WebSockets.AcceptWebSocketAsync();
            await ProcessTerminalSessionAsync(webSocket, token);
        }
        else
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        }
    }

    private async Task ProcessTerminalSessionAsync(WebSocket webSocket, string token)
    {
        var connInfo = _sessionManager.GetSession(token);
        if (connInfo == null)
        {
            await CloseWebSocketAsync(webSocket, WebSocketCloseStatus.PolicyViolation, "Sessão inválida ou expirada.");
            return;
        }

        SshClient? client = null;
        ShellStream? shellStream = null;

        try
        {
            Renci.SshNet.ConnectionInfo sshConnInfo;
            if (!string.IsNullOrWhiteSpace(connInfo.PrivateKey))
            {
                using var keyStream = new MemoryStream(Encoding.UTF8.GetBytes(connInfo.PrivateKey));
                var privateKeyFile = string.IsNullOrWhiteSpace(connInfo.Passphrase)
                    ? new PrivateKeyFile(keyStream)
                    : new PrivateKeyFile(keyStream, connInfo.Passphrase);

                sshConnInfo = new Renci.SshNet.ConnectionInfo(connInfo.Host, connInfo.Port, connInfo.Username,
                    new PrivateKeyAuthenticationMethod(connInfo.Username, privateKeyFile));
            }
            else
            {
                sshConnInfo = new Renci.SshNet.ConnectionInfo(connInfo.Host, connInfo.Port, connInfo.Username,
                    new PasswordAuthenticationMethod(connInfo.Username, connInfo.Password ?? string.Empty));
            }

            // Set a connection timeout
            sshConnInfo.Timeout = TimeSpan.FromSeconds(15);

            client = new SshClient(sshConnInfo);
            
            // Connect asynchronously in a threadpool task to avoid blocking ASP.NET thread
            await Task.Run(() => client.Connect());

            shellStream = client.CreateShellStream("xterm-256color", 80, 24, 800, 600, 1024);

            // Read from SSH ShellStream and write to WebSocket
            var sshToWsTask = Task.Run(async () =>
            {
                var readBuffer = new byte[4096];
                while (webSocket.State == WebSocketState.Open && client.IsConnected)
                {
                    try
                    {
                        if (shellStream.DataAvailable)
                        {
                            int read = shellStream.Read(readBuffer, 0, readBuffer.Length);
                            if (read > 0)
                            {
                                await webSocket.SendAsync(new ArraySegment<byte>(readBuffer, 0, read),
                                    WebSocketMessageType.Text, true, CancellationToken.None);
                            }
                        }
                        else
                        {
                            await Task.Delay(20);
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Erro lendo do SSH: {ex.Message}");
                        break;
                    }
                }
            });

            // Read from WebSocket and write to SSH ShellStream
            var wsToSshTask = Task.Run(async () =>
            {
                var receiveBuffer = new byte[4096];
                while (webSocket.State == WebSocketState.Open && client.IsConnected)
                {
                    try
                    {
                        var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(receiveBuffer), CancellationToken.None);
                        if (result.MessageType == WebSocketMessageType.Close)
                        {
                            break;
                        }

                        if (result.MessageType == WebSocketMessageType.Text)
                        {
                            var text = Encoding.UTF8.GetString(receiveBuffer, 0, result.Count);
                            
                            // Try parsing as JSON to check if it's a window resize
                            if (text.TrimStart().StartsWith("{") && text.TrimEnd().EndsWith("}"))
                            {
                                try
                                {
                                    var msg = JsonSerializer.Deserialize<TerminalMessage>(text, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                                    if (msg != null && msg.Type == "resize" && msg.Cols.HasValue && msg.Rows.HasValue)
                                    {
                                        var field = typeof(ShellStream).GetField("_channel", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                                        var channel = field?.GetValue(shellStream);
                                        if (channel != null)
                                        {
                                            var method = channel.GetType().GetMethod("SendWindowChangeRequest", new[] { typeof(uint), typeof(uint), typeof(uint), typeof(uint) });
                                            method?.Invoke(channel, new object[] { (uint)msg.Cols.Value, (uint)msg.Rows.Value, (uint)0, (uint)0 });
                                        }
                                        continue;
                                    }
                                    if (msg != null && msg.Type == "input" && msg.Data != null)
                                    {
                                        shellStream.Write(msg.Data);
                                        shellStream.Flush();
                                        continue;
                                    }
                                }
                                catch
                                {
                                    // Not valid JSON, fallback to raw write
                                }
                            }

                            shellStream.Write(text);
                            shellStream.Flush();
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Erro escrevendo no SSH: {ex.Message}");
                        break;
                    }
                }
            });

            await Task.WhenAny(sshToWsTask, wsToSshTask);
        }
        catch (Exception ex)
        {
            var errMsg = $"\r\n\u001b[31m[Erro de Conexão] {ex.Message}\u001b[0m\r\n";
            if (webSocket.State == WebSocketState.Open)
            {
                await webSocket.SendAsync(new ArraySegment<byte>(Encoding.UTF8.GetBytes(errMsg)),
                    WebSocketMessageType.Text, true, CancellationToken.None);
            }
        }
        finally
        {
            shellStream?.Dispose();
            if (client != null)
            {
                if (client.IsConnected) client.Disconnect();
                client.Dispose();
            }
            if (webSocket.State == WebSocketState.Open || webSocket.State == WebSocketState.CloseReceived)
            {
                await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Conexão encerrada", CancellationToken.None);
            }
        }
    }

    private async Task CloseWebSocketAsync(WebSocket ws, WebSocketCloseStatus status, string description)
    {
        if (ws.State == WebSocketState.Open)
        {
            await ws.CloseAsync(status, description, CancellationToken.None);
        }
    }
}

public record ConnectRequest(
    string Host,
    int Port,
    string Username,
    string? Password,
    string? PrivateKey,
    string? Passphrase
);

public class TerminalMessage
{
    public string? Type { get; set; }
    public string? Data { get; set; }
    public int? Cols { get; set; }
    public int? Rows { get; set; }
}
