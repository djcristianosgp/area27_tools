using System.Collections.Generic;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.IotMqtt;

public class IotMqttModule : IToolModule
{
    public string Id => "iot-mqtt";
    public string Name => "Painel IoT (MQTT)";
    public string Description => "Central de controle para ler tópicos e publicar comandos via protocolo MQTT.";
    public string Icon => "Cpu";

    public void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<MqttBackgroundService>();
        services.AddHostedService(sp => sp.GetRequiredService<MqttBackgroundService>());
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return System.Linq.Enumerable.Empty<IHostedService>();
    }
}

public record CreateIotDeviceDto(string DeviceName, string Topic, string PayloadType);
public record UpdateIotDeviceDto(string? DeviceName, string? Topic, string? PayloadType, string? LastValue);
public record PublishPayloadDto(string Payload);
