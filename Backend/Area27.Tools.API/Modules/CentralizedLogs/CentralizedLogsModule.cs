using System;
using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.CentralizedLogs;

public class CentralizedLogsModule : IToolModule
{
    public string Id => "centralized-logs";
    public string Name => "Logs Centralizados";
    public string Description => "Visualização centralizada de arquivos de logs e logs de containers.";
    public string Icon => "FileText";

    public void RegisterServices(IServiceCollection services)
    {
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        // Handled by Controllers (CentralizedLogsController)
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}
