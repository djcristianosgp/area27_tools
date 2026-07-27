using System;
using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.WebTerminal;

public class WebTerminalModule : IToolModule
{
    public string Id => "web-terminal";
    public string Name => "Terminal Web (SSH)";
    public string Description => "Acesso seguro ao terminal via web.";
    public string Icon => "Terminal";

    public void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<WebTerminalSessionManager>();
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        // Handled by WebTerminalController
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}
