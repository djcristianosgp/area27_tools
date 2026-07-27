using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.Core.Modules;

public interface IToolModule
{
    string Id { get; }
    string Name { get; }
    string Description { get; }
    string Icon { get; }
    
    void RegisterServices(IServiceCollection services);
    void RegisterRoutes(IEndpointRouteBuilder endpoints);
    IEnumerable<IHostedService> GetBackgroundServices();
}
