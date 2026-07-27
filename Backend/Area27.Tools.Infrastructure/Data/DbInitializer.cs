using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Area27.Tools.Infrastructure.Data;

public static class DbInitializer
{
    public static void Initialize(IServiceProvider serviceProvider)
    {
        using var context = new AppDbContext(
            serviceProvider.GetRequiredService<DbContextOptions<AppDbContext>>());

        // Ensure database is created and migrations are applied
        context.Database.Migrate();

        // Seed default admin user if not exists
        if (!context.Users.Any())
        {
            context.Users.Add(new User
            {
                Username = "admin",
                PasswordHash = PasswordHasher.HashPassword("admin"),
                Role = "Admin"
            });
            context.SaveChanges();
        }

        // Seed default modules states if not exists
        if (!context.Modules.Any())
        {
            // Seed a few initial modules as examples
            context.Modules.AddRange(
                new ToolModuleState { Id = "uptime", Name = "Monitoramento de URLs (Uptime)", IsEnabled = true },
                new ToolModuleState { Id = "server-metrics", Name = "Monitoramento do Servidor", IsEnabled = true },
                new ToolModuleState { Id = "network-scanner", Name = "Rede Local (Scanner)", IsEnabled = true },
                new ToolModuleState { Id = "web-terminal", Name = "Terminal Web (SSH)", IsEnabled = true },
                new ToolModuleState { Id = "ssl-dns", Name = "Certificados SSL & DNS", IsEnabled = true },
                new ToolModuleState { Id = "docker-manager", Name = "Docker Manager", IsEnabled = true },
                new ToolModuleState { Id = "backups-cron", Name = "Backups & Agendador (Cron)", IsEnabled = true },
                new ToolModuleState { Id = "git-deploy", Name = "Git & Deploy Automatizado", IsEnabled = true },
                new ToolModuleState { Id = "centralized-logs", Name = "Logs Centralizados", IsEnabled = true },
                new ToolModuleState { Id = "camera-panel", Name = "Painel de Câmeras", IsEnabled = true },
                new ToolModuleState { Id = "replays-qr", Name = "Replays (Rock10) & QR Code", IsEnabled = true },
                new ToolModuleState { Id = "iot-mqtt", Name = "Painel IoT (MQTT)", IsEnabled = true },
                new ToolModuleState { Id = "inventory-events", Name = "Inventário & Eventos", IsEnabled = true }
            );
            context.SaveChanges();
        }

        // Seed default cameras
        if (!context.Cameras.Any())
        {
            context.Cameras.AddRange(
                new Camera { Name = "Câmera Entrada Principal", RtspUrl = "rtsp://192.168.1.100/stream1", Location = "Entrada Principal", IsActive = true },
                new Camera { Name = "Câmera Estacionamento", RtspUrl = "rtsp://192.168.1.101/stream1", Location = "Estacionamento", IsActive = true },
                new Camera { Name = "Câmera Estúdio A", RtspUrl = "rtsp://192.168.1.102/stream1", Location = "Estúdio A", IsActive = true }
            );
            context.SaveChanges();
        }

        // Seed default IoT devices
        if (!context.IotDevices.Any())
        {
            context.IotDevices.AddRange(
                new IotDevice { DeviceName = "Ar Condicionado Estúdio", Topic = "estudio/ac/power", PayloadType = "Switch", LastValue = "OFF" },
                new IotDevice { DeviceName = "Temperatura Estúdio A", Topic = "estudio/sensor/temp", PayloadType = "Sensor", LastValue = "22.5" },
                new IotDevice { DeviceName = "Iluminação Painel Led", Topic = "estudio/iluminacao/led", PayloadType = "Switch", LastValue = "ON" }
            );
            context.SaveChanges();
        }

        // Seed default inventory items
        if (!context.InventoryItems.Any())
        {
            context.InventoryItems.AddRange(
                new InventoryItem { Name = "Câmera Sony FX3", SerialNumber = "SN-FX3-9921", Category = "Camera", Location = "Armário A", Status = "Available" },
                new InventoryItem { Name = "Lente 24-70mm f2.8", SerialNumber = "SN-LNS-8812", Category = "Lente", Location = "Armário A", Status = "Available" },
                new InventoryItem { Name = "Tripé Manfrotto 504HD", SerialNumber = "SN-TPD-0043", Category = "Acessório", Location = "Armário B", Status = "Available" },
                new InventoryItem { Name = "Mesa de Corte ATEM Mini Pro", SerialNumber = "SN-ATM-2211", Category = "Switch", Location = "Armário C", Status = "In Use" }
            );
            context.SaveChanges();
        }

        // Seed default events
        if (!context.Events.Any())
        {
            context.Events.Add(new Event
            {
                Name = "Transmissão Campeonato Estadual - Final",
                Date = DateTime.UtcNow.AddDays(2),
                Location = "Ginásio Central",
                TeamMembers = "João (Câmera 1), Maria (Corte), Pedro (Áudio)",
                Status = "Scheduled",
                Description = "Transmissão ao vivo do jogo decisivo."
            });
            context.SaveChanges();
        }
    }
}
