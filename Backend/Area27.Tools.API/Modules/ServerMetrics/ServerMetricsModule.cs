using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.ServerMetrics;

public class ServerMetricsModule : IToolModule
{
    public string Id => "server-metrics";
    public string Name => "Monitoramento do Servidor";
    public string Description => "Métricas de uso de hardware em tempo real.";
    public string Icon => "Cpu";

    public void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<SystemMetricsProvider>();
        services.AddSingleton<ServerMetricsBackgroundService>();
        services.AddHostedService(sp => sp.GetRequiredService<ServerMetricsBackgroundService>());
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/server-metrics").WithTags("ServerMetrics");

        // GET /api/server-metrics/current
        group.MapGet("/current", (SystemMetricsProvider provider) =>
        {
            var cpu = provider.GetCpuUsage();
            var ram = provider.GetRamUsage();
            var disk = provider.GetDiskUsage();
            var temp = provider.GetTemperature();

            return Results.Ok(new
            {
                cpuUsage = cpu,
                ramTotalBytes = ram.TotalBytes,
                ramUsedBytes = ram.UsedBytes,
                diskTotalBytes = disk.TotalBytes,
                diskUsedBytes = disk.UsedBytes,
                temperature = temp
            });
        });

        // GET /api/server-metrics/history
        group.MapGet("/history", (ServerMetricsBackgroundService metricsService) =>
        {
            var history = metricsService.GetHistory();
            return Results.Ok(history);
        });
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}
