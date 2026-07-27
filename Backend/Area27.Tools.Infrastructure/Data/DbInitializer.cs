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
                new ToolModuleState { Id = "inventory-events", Name = "Inventário & Eventos", IsEnabled = true },
                new ToolModuleState { Id = "updater", Name = "Atualizações do Sistema", IsEnabled = true },
                new ToolModuleState { Id = "system-settings", Name = "Configurações do Sistema", IsEnabled = true }
            );
            context.SaveChanges();
        }
    }
}
