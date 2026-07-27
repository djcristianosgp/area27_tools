using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.Core.Modules;

public class ModuleRegistry
{
    private readonly List<IToolModule> _modules = new();

    public IReadOnlyCollection<IToolModule> Modules => _modules.AsReadOnly();

    public void RegisterModule(IToolModule module)
    {
        if (_modules.Any(m => m.Id == module.Id))
        {
            throw new InvalidOperationException($"Module with ID '{module.Id}' is already registered.");
        }
        _modules.Add(module);
    }

    public void RegisterAllServices(IServiceCollection services)
    {
        foreach (var module in _modules)
        {
            // Register module services
            module.RegisterServices(services);

            // Register background services from the module
            foreach (var backgroundService in module.GetBackgroundServices())
            {
                services.AddSingleton(backgroundService);
            }
        }
    }

    public void RegisterAllRoutes(IEndpointRouteBuilder endpoints)
    {
        foreach (var module in _modules)
        {
            module.RegisterRoutes(endpoints);
        }
    }
}

public static class ModuleServiceExtensions
{
    public static IServiceCollection AddModuleRegistry(this IServiceCollection services, Action<ModuleRegistry> configure)
    {
        var registry = new ModuleRegistry();
        configure(registry);
        services.AddSingleton(registry);
        registry.RegisterAllServices(services);
        return services;
    }

    public static IEndpointRouteBuilder MapModules(this IEndpointRouteBuilder endpoints)
    {
        var registry = endpoints.ServiceProvider.GetRequiredService<ModuleRegistry>();
        registry.RegisterAllRoutes(endpoints);
        return endpoints;
    }
}
