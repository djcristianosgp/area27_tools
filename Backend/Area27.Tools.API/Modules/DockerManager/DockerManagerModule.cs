using System;
using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.DockerManager;

public class DockerManagerModule : IToolModule
{
    public string Id => "docker-manager";
    public string Name => "Docker Manager";
    public string Description => "Interface visual para gerenciar contêineres Docker locais.";
    public string Icon => "Container";

    public void RegisterServices(IServiceCollection services)
    {
        // Register DockerClient configuration or helper here if needed
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        // Handled by Controllers (DockerManagerController)
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}
