using System;
using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.SslDns;

public class SslDnsModule : IToolModule
{
    public string Id => "ssl-dns";
    public string Name => "Certificados SSL & DNS";
    public string Description => "Monitoramento de expiração de certificados SSL e resolvedor de consultas DNS.";
    public string Icon => "ShieldAlert";

    public void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<SslCheckerService>();
        services.AddHostedService<SslBackgroundWorker>();
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        // Handled by SslDnsController
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}
