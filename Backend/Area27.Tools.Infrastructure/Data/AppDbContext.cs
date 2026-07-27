using Area27.Tools.Core.Entities;
using Microsoft.EntityFrameworkCore;

namespace Area27.Tools.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Setting> Settings => Set<Setting>();
    public DbSet<ToolModuleState> Modules => Set<ToolModuleState>();
    public DbSet<UptimeCheck> UptimeChecks => Set<UptimeCheck>();
    public DbSet<UptimeHistory> UptimeHistories => Set<UptimeHistory>();
    public DbSet<NetworkDevice> NetworkDevices => Set<NetworkDevice>();
    public DbSet<SslDomain> SslDomains => Set<SslDomain>();
    public DbSet<BackupCronTask> BackupCronTasks => Set<BackupCronTask>();
    public DbSet<BackupCronLog> BackupCronLogs => Set<BackupCronLog>();
    public DbSet<GitRepository> GitRepositories => Set<GitRepository>();
    public DbSet<LogSource> LogSources => Set<LogSource>();
    public DbSet<Camera> Cameras => Set<Camera>();
    public DbSet<IotDevice> IotDevices => Set<IotDevice>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventChecklistItem> EventChecklistItems => Set<EventChecklistItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Additional entity configurations if needed
        modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();
    }
}
