using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.Updater;

/// <summary>
/// Module responsible for system update checking and system info endpoints.
/// </summary>
public class UpdaterModule : IToolModule
{
    public string Id          => "updater";
    public string Name        => "Atualizações do Sistema";
    public string Description => "Verifica novas versões via GitHub Releases e exibe informações do sistema.";
    public string Icon        => "RefreshCw";

    public void RegisterServices(IServiceCollection services)
    {
        // Named HTTP client for GitHub API calls
        services.AddHttpClient("Updater", client =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
            client.DefaultRequestHeaders.Add("Accept", "application/vnd.github+json");
        });

        services.AddSingleton<UpdaterService>();
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/updater")
            .RequireAuthorization();

        // GET /api/updater/check — Check for a new version on GitHub Releases.
        group.MapGet("/check", async (UpdaterService svc, CancellationToken ct) =>
        {
            var result = await svc.CheckForUpdateAsync(ct);
            return Results.Ok(result);
        })
        .WithName("CheckUpdate")
        .WithTags("Updater");

        // GET /api/updater/info — Return current system info: version, uptime, environment, database.
        group.MapGet("/info", (UpdaterService svc) =>
        {
            return Results.Ok(svc.GetSystemInfo());
        })
        .WithName("SystemInfo")
        .WithTags("Updater");
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
        => Enumerable.Empty<IHostedService>();
}
