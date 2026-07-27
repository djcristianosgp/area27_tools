using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.CameraPanel;

public class CameraPanelModule : IToolModule
{
    public string Id => "camera-panel";
    public string Name => "Painel de Câmeras";
    public string Description => "Visualização e gerenciamento de câmeras de segurança.";
    public string Icon => "Video";

    public void RegisterServices(IServiceCollection services)
    {
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}

public record CreateCameraDto(string Name, string RtspUrl, string? MjpegUrl, string? Location);
public record UpdateCameraDto(string? Name, string? RtspUrl, string? MjpegUrl, string? Location, bool? IsActive);
