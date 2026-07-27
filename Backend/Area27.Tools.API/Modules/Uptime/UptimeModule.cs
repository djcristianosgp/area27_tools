using System;
using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Entities;
using Area27.Tools.Core.Modules;
using Area27.Tools.Infrastructure.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
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
        services.AddHostedService<UptimeBackgroundWorker>();
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        // Handled by Controllers (UptimeController)
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}

public record CreateUptimeCheckDto(string Name, string Target, string Protocol, int? Port, int CheckIntervalSeconds);
public record UpdateUptimeCheckDto(string? Name, string? Target, string? Protocol, int? Port, int? CheckIntervalSeconds, bool? IsActive);
