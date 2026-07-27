using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.InventoryEvents;

public class InventoryEventsModule : IToolModule
{
    public string Id => "inventory-events";
    public string Name => "Inventário & Eventos";
    public string Description => "Controle físico de equipamentos e checklist operacional de eventos de transmissão.";
    public string Icon => "Calendar";

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

public record CreateInventoryItemDto(string Name, string? SerialNumber, string Category, string? Location, string Status);
public record UpdateInventoryItemDto(string? Name, string? SerialNumber, string? Category, string? Location, string? Status);

public record CreateEventDto(string Name, System.DateTime Date, string? Location, string? TeamMembers, string Status, string? Description);
public record UpdateEventDto(string? Name, System.DateTime? Date, string? Location, string? TeamMembers, string? Status, string? Description);

public record ToggleChecklistItemDto(int InventoryItemId, bool IsChecked);
 public record AddChecklistItemDto(int InventoryItemId);
