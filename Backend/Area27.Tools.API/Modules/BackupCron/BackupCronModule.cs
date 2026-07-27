using System;
using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.BackupCron;

public class BackupCronModule : IToolModule
{
    public string Id => "backups-cron";
    public string Name => "Backups & Agendador (Cron)";
    public string Description => "Motor interno para rotinas e backups agendados via expressões Cron.";
    public string Icon => "Clock";

    public void RegisterServices(IServiceCollection services)
    {
        services.AddHostedService<BackupCronBackgroundWorker>();
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        // Handled by Controllers (BackupCronController)
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}
