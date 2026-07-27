using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Area27.Tools.API.Modules.SslDns;

public class SslBackgroundWorker : BackgroundService
{
    private readonly SslCheckerService _sslChecker;
    private readonly ILogger<SslBackgroundWorker> _logger;

    public SslBackgroundWorker(SslCheckerService sslChecker, ILogger<SslBackgroundWorker> logger)
    {
        _sslChecker = sslChecker;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Background Worker do Monitor de SSL & DNS iniciado.");

        // Initial delay to avoid slowing down start up
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await _sslChecker.CheckAllCertificatesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao processar verificações de SSL periódicas.");
            }

            // Check every 12 hours
            await Task.Delay(TimeSpan.FromHours(12), stoppingToken);
        }
    }
}
