using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.Uptime;

public class UptimeModule : IToolModule
{
    public string Id => "uptime";
    public string Name => "Monitoramento de URLs (Uptime)";
    public string Description => "Checagem de disponibilidade de URLs em background.";
    public string Icon => "Activity";

    public void RegisterServices(IServiceCollection services)
    {
        // No local services to register for now
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/uptime").WithTags("Uptime");

        group.MapGet("/status", () => Results.Ok(new { status = "All services are online" }));
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}
