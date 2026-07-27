using System;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Area27.Tools.API.Modules.Uptime;

public class UptimeBackgroundWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<UptimeBackgroundWorker> _logger;
    private readonly HttpClient _httpClient;

    public UptimeBackgroundWorker(IServiceProvider serviceProvider, ILogger<UptimeBackgroundWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        
        var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = (sender, cert, chain, sslPolicyErrors) => true,
            AllowAutoRedirect = true
        };
        _httpClient = new HttpClient(handler)
        {
            Timeout = TimeSpan.FromSeconds(10)
        };
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "Area27Tools-UptimeMonitor/1.0");
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Uptime Background Worker is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckActiveTargetsAsync(stoppingToken);
                await CleanupOldHistoryAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in Uptime check loop.");
            }

            // Loop check every 5 seconds
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
        
        _logger.LogInformation("Uptime Background Worker is stopping.");
    }

    private async Task CheckActiveTargetsAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Find targets that need checking
        var now = DateTime.UtcNow;
        var checksToRun = await db.UptimeChecks
            .Where(c => c.IsActive)
            .ToListAsync(stoppingToken);

        var tasks = checksToRun
            .Where(c => c.LastChecked == null || now >= c.LastChecked.Value.AddSeconds(c.CheckIntervalSeconds))
            .Select(c => RunSingleCheckAsync(c.Id, stoppingToken));

        await Task.WhenAll(tasks);
    }

    private async Task RunSingleCheckAsync(Guid checkId, CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var check = await db.UptimeChecks.FindAsync(new object[] { checkId }, stoppingToken);
        if (check == null || !check.IsActive) return;

        bool isSuccess = false;
        double latencyMs = 0;
        string? errorMessage = null;

        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            var protocol = check.Protocol.ToUpperInvariant();
            if (protocol == "HTTP" || protocol == "HTTPS")
            {
                var targetUrl = check.Target;
                if (!targetUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && 
                    !targetUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    targetUrl = (protocol == "HTTPS" ? "https://" : "http://") + targetUrl;
                }

                var response = await _httpClient.GetAsync(targetUrl, stoppingToken);
                stopwatch.Stop();
                latencyMs = stopwatch.Elapsed.TotalMilliseconds;
                isSuccess = response.IsSuccessStatusCode;
                if (!isSuccess)
                {
                    errorMessage = $"HTTP status {(int)response.StatusCode} ({response.ReasonPhrase})";
                }
            }
            else if (protocol == "PING")
            {
                using var ping = new Ping();
                var reply = await ping.SendPingAsync(check.Target, 5000);
                stopwatch.Stop();
                latencyMs = stopwatch.Elapsed.TotalMilliseconds;
                isSuccess = reply.Status == IPStatus.Success;
                if (!isSuccess)
                {
                    errorMessage = $"Ping failed: {reply.Status}";
                }
            }
            else if (protocol == "TCP")
            {
                var port = check.Port ?? 80;
                using var tcpClient = new TcpClient();
                var connectTask = tcpClient.ConnectAsync(check.Target, port, stoppingToken);
                
                // Wait with a 5 second timeout
                var completedTask = await Task.WhenAny(connectTask.AsTask(), Task.Delay(5000, stoppingToken));
                stopwatch.Stop();
                latencyMs = stopwatch.Elapsed.TotalMilliseconds;

                if (completedTask == connectTask.AsTask() && tcpClient.Connected)
                {
                    isSuccess = true;
                }
                else
                {
                    isSuccess = false;
                    errorMessage = "Connection timed out or failed";
                }
            }
            else
            {
                stopwatch.Stop();
                errorMessage = $"Unsupported protocol: {check.Protocol}";
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            latencyMs = stopwatch.Elapsed.TotalMilliseconds;
            isSuccess = false;
            errorMessage = ex.Message;
        }

        // Round latency
        latencyMs = Math.Round(latencyMs, 1);

        // Record history
        var history = new UptimeHistory
        {
            UptimeCheckId = check.Id,
            Timestamp = DateTime.UtcNow,
            IsSuccess = isSuccess,
            LatencyMs = latencyMs,
            ErrorMessage = errorMessage
        };
        db.UptimeHistories.Add(history);

        // Update target
        check.LastChecked = DateTime.UtcNow;
        check.Status = isSuccess ? "Online" : "Offline";
        
        // Calculate dynamic average latency based on recent history
        var recentLatencies = await db.UptimeHistories
            .Where(h => h.UptimeCheckId == check.Id && h.IsSuccess)
            .OrderByDescending(h => h.Timestamp)
            .Take(10)
            .Select(h => h.LatencyMs)
            .ToListAsync(stoppingToken);

        if (isSuccess) recentLatencies.Insert(0, latencyMs);
        check.AverageLatencyMs = recentLatencies.Any() ? Math.Round(recentLatencies.Average(), 1) : 0;

        await db.SaveChangesAsync(stoppingToken);
    }

    private async Task CleanupOldHistoryAsync(CancellationToken stoppingToken)
    {
        // Periodic cleanup: keep only past 24 hours of history to avoid DB bloat
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var limit = DateTime.UtcNow.AddHours(-24);
        var oldRecords = await db.UptimeHistories
            .Where(h => h.Timestamp < limit)
            .ToListAsync(stoppingToken);

        if (oldRecords.Any())
        {
            db.UptimeHistories.RemoveRange(oldRecords);
            await db.SaveChangesAsync(stoppingToken);
            _logger.LogInformation("Cleaned up {Count} old uptime history records.", oldRecords.Count);
        }
    }
}
