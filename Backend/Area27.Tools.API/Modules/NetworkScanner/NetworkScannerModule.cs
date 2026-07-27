using System;
using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.NetworkScanner;

public class NetworkScannerModule : IToolModule
{
    public string Id => "network-scanner";
    public string Name => "Rede Local (Scanner)";
    public string Description => "Escaneamento de IPs e MAC na sub-rede e Wake-on-LAN.";
    public string Icon => "Network";

    public void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<NetworkScannerService>();
        services.AddHostedService<NetworkScannerBackgroundWorker>();
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        // Handled by NetworkScannerController
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}
