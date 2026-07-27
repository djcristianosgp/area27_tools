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
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/server-metrics").WithTags("ServerMetrics");

        group.MapGet("/", () => Results.Ok(new 
        {
            cpuUsage = 12.5,
            ramUsageBytes = 4294967296,
            diskUsageBytes = 85899345920
        }));
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}
