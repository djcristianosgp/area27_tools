using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Area27.Tools.API.Modules.ServerMetrics;

public class ServerMetricsBackgroundService : BackgroundService
{
    private readonly SystemMetricsProvider _metricsProvider;
    private readonly ILogger<ServerMetricsBackgroundService> _logger;
    private readonly ConcurrentQueue<ServerMetricHistoryPoint> _history = new();
    private const int MaxHistoryPoints = 15;

    public ServerMetricsBackgroundService(SystemMetricsProvider metricsProvider, ILogger<ServerMetricsBackgroundService> logger)
    {
        _metricsProvider = metricsProvider;
        _logger = logger;
    }

    public IReadOnlyCollection<ServerMetricHistoryPoint> GetHistory()
    {
        return _history.ToList().AsReadOnly();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Server Metrics Background Service is starting.");

        // Warmup cpu calculation
        _metricsProvider.GetCpuUsage();

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var cpu = _metricsProvider.GetCpuUsage();
                var (totalRam, usedRam) = _metricsProvider.GetRamUsage();
                var ramPercent = totalRam > 0 ? Math.Round((double)usedRam / totalRam * 100.0, 1) : 0;

                var point = new ServerMetricHistoryPoint(DateTime.UtcNow, cpu, ramPercent);
                
                _history.Enqueue(point);
                while (_history.Count > MaxHistoryPoints)
                {
                    _history.TryDequeue(out _);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while collecting server metrics.");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }

        _logger.LogInformation("Server Metrics Background Service is stopping.");
    }
}

public record ServerMetricHistoryPoint(DateTime Timestamp, double CpuUsage, double RamUsagePercent);
