using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Area27.Tools.API.Modules.NetworkScanner;

public class NetworkScannerBackgroundWorker : BackgroundService
{
    private readonly NetworkScannerService _scannerService;
    private readonly ILogger<NetworkScannerBackgroundWorker> _logger;

    public NetworkScannerBackgroundWorker(NetworkScannerService scannerService, ILogger<NetworkScannerBackgroundWorker> logger)
    {
        _scannerService = scannerService;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Background Worker do Scanner de Rede Local iniciado.");

        // Run initial scan after a short delay so the system has fully booted
        await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _scannerService.ScanNetworkAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no worker de escaneamento de rede.");
            }

            // Wait 15 minutes before scanning again
            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
        }
    }
}
