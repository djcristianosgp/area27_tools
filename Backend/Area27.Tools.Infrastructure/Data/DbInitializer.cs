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

        // Create tables manually if they don't exist (EnsureCreated won't create tables for new entities in an existing DB)
        using (var command = context.Database.GetDbConnection().CreateCommand())
        {
            context.Database.OpenConnection();

            // Create NetworkDevices table
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS ""NetworkDevices"" (
                    ""Id"" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    ""IpAddress"" TEXT NOT NULL,
                    ""MacAddress"" TEXT NULL,
                    ""Hostname"" TEXT NULL,
                    ""Vendor"" TEXT NULL,
                    ""LatencyMs"" REAL NULL,
                    ""IsOnline"" INTEGER NOT NULL,
                    ""LastSeen"" TEXT NOT NULL,
                    ""CustomName"" TEXT NULL
                );";
            command.ExecuteNonQuery();

            // Create SslDomains table
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS ""SslDomains"" (
                    ""Id"" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    ""Domain"" TEXT NOT NULL,
                    ""Port"" INTEGER NOT NULL,
                    ""Issuer"" TEXT NULL,
                    ""ExpirationDate"" TEXT NULL,
                    ""LastChecked"" TEXT NOT NULL,
                    ""IsValid"" INTEGER NOT NULL,
                    ""ErrorMessage"" TEXT NULL
                );";
            command.ExecuteNonQuery();
        }

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
                new ToolModuleState { Id = "ssl-dns", Name = "Certificados SSL & DNS", IsEnabled = true }
            );
            context.SaveChanges();
        }
    }
}
