using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.ReplaysQr;

public class ReplaysQrModule : IToolModule
{
    public string Id => "replays-qr";
    public string Name => "Replays (Rock10) & QR Code";
    public string Description => "Integração com monitoramento de replays do Rock10 e gerador de QR Codes individual e em lote.";
    public string Icon => "QrCode";

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
