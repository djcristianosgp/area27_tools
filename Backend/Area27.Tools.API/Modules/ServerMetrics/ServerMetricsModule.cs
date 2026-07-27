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
        // Handled by Controllers (ServerMetricsController)
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}
