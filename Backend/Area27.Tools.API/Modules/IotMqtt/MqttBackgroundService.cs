using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Area27.Tools.API.Modules.IotMqtt;

public class MqttBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MqttBackgroundService> _logger;

    public MqttBackgroundService(IServiceProvider serviceProvider, ILogger<MqttBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task PublishAsync(string topic, string payload)
    {
        _logger.LogInformation("MQTT Publish: Topic={Topic}, Payload={Payload}", topic, payload);

        // Update database with the new value immediately
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var device = db.IotDevices.FirstOrDefault(d => d.Topic == topic);
        if (device != null)
        {
            device.LastValue = payload;
            device.LastUpdated = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("IoT MQTT Simulator Background Service started.");
        var rand = new Random();

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var sensors = db.IotDevices.Where(d => d.PayloadType == "Sensor").ToList();

                    foreach (var sensor in sensors)
                    {
                        if (double.TryParse(sensor.LastValue, out double val))
                        {
                            // Simulate small fluctuation (-0.5 to +0.5)
                            double change = (rand.NextDouble() - 0.5) * 0.4;
                            double newVal = Math.Round(val + change, 1);
                            
                            // Prevent sensor values from going into weird zones
                            if (newVal < 10) newVal = 18.0;
                            if (newVal > 40) newVal = 25.0;

                            sensor.LastValue = newVal.ToString("F1");
                            sensor.LastUpdated = DateTime.UtcNow;
                        }
                    }

                    if (sensors.Any())
                    {
                        await db.SaveChangesAsync(stoppingToken);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during IoT simulation check.");
            }

            // Fluctuates every 8 seconds
            await Task.Delay(8000, stoppingToken);
        }
    }
}
