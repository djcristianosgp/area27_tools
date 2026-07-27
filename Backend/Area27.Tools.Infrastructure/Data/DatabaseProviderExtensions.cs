using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Area27.Tools.Infrastructure.Data;

/// <summary>
/// Extension methods to register the database provider based on configuration.
/// Supports SQLite (default) and PostgreSQL.
/// </summary>
public static class DatabaseProviderExtensions
{
    /// <summary>
    /// Registers AppDbContext using the provider defined in configuration.
    /// Set "DatabaseProvider": "postgresql" to use PostgreSQL, defaults to SQLite.
    /// </summary>
    public static IServiceCollection AddArea27Database(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var provider = configuration["DatabaseProvider"]?.ToLowerInvariant() ?? "sqlite";

        services.AddDbContext<AppDbContext>(options =>
        {
            switch (provider)
            {
                case "postgresql":
                case "postgres":
                    var pgConn = configuration.GetConnectionString("PostgreSQL")
                        ?? throw new InvalidOperationException(
                            "DatabaseProvider is set to 'postgresql' but ConnectionStrings:PostgreSQL is not configured.");
                    options.UseNpgsql(pgConn, npgsql =>
                    {
                        npgsql.EnableRetryOnFailure(maxRetryCount: 5);
                    });
                    break;

                default: // sqlite
                    var sqliteConn = configuration.GetConnectionString("DefaultConnection")
                        ?? "Data Source=area27_tools.db";
                    options.UseSqlite(sqliteConn);
                    break;
            }
        });

        return services;
    }

    /// <summary>
    /// Returns the friendly name of the active database provider.
    /// </summary>
    public static string GetActiveProvider(IConfiguration configuration)
    {
        var provider = configuration["DatabaseProvider"]?.ToLowerInvariant() ?? "sqlite";
        return provider switch
        {
            "postgresql" or "postgres" => "PostgreSQL",
            _ => "SQLite"
        };
    }
}
