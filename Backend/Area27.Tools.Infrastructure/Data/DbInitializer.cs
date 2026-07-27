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
        context.Database.EnsureCreated();

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
                new ToolModuleState { Id = "network-scanner", Name = "Rede Local (Scanner)", IsEnabled = true }
            );
            context.SaveChanges();
        }
    }
}
