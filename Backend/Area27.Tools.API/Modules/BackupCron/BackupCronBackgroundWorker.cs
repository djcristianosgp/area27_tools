using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Cronos;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Area27.Tools.API.Modules.BackupCron;

public class BackupCronBackgroundWorker : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BackupCronBackgroundWorker> _logger;

    public BackupCronBackgroundWorker(IServiceProvider serviceProvider, ILogger<BackupCronBackgroundWorker> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Backup & Cron Scheduler Background Worker starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingTasksAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in Backup/Cron loop.");
            }

            // Run check every 15 seconds
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);
        }
    }

    private async Task ProcessPendingTasksAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = DateTime.UtcNow;
        var pendingTasks = await context.BackupCronTasks
            .Where(t => t.IsActive && t.NextRun != null && t.NextRun <= now)
            .ToListAsync(stoppingToken);

        foreach (var task in pendingTasks)
        {
            _logger.LogInformation($"Running scheduled task: {task.Name} ({task.BackupType})");

            // 1. Create log entry
            var log = new BackupCronLog
            {
                TaskId = task.Id,
                StartTime = DateTime.UtcNow,
                IsSuccess = false
            };
            context.BackupCronLogs.Add(log);
            await context.SaveChangesAsync(stoppingToken);

            try
            {
                // 2. Perform Backup / Exec
                var details = await ExecuteBackupTaskAsync(task);
                
                log.IsSuccess = true;
                log.Message = "Executado com sucesso.";
                log.FileDetails = details;
            }
            catch (Exception ex)
            {
                log.IsSuccess = false;
                log.Message = $"Falha na execução: {ex.Message}";
                _logger.LogError(ex, $"Failed executing task {task.Name}");
            }
            finally
            {
                log.EndTime = DateTime.UtcNow;

                // Update task next run time
                try
                {
                    var cron = CronExpression.Parse(task.CronExpression);
                    task.LastRun = log.StartTime;
                    task.NextRun = cron.GetNextOccurrence(DateTime.UtcNow);
                }
                catch (Exception cronEx)
                {
                    _logger.LogError(cronEx, $"Error calculating next run time for task {task.Name}");
                    task.IsActive = false; // Disable if cron expression is invalid
                }

                context.Entry(task).State = EntityState.Modified;
                await context.SaveChangesAsync(stoppingToken);
            }
        }
    }

    private async Task<string> ExecuteBackupTaskAsync(BackupCronTask task)
    {
        var backupDir = Path.Combine(AppContext.BaseDirectory, "Backups");
        if (!Directory.Exists(backupDir))
        {
            Directory.CreateDirectory(backupDir);
        }

        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        
        if (task.BackupType == "Folder")
        {
            if (string.IsNullOrEmpty(task.SourcePath) || !Directory.Exists(task.SourcePath))
            {
                throw new DirectoryNotFoundException($"Diretório de origem não encontrado: {task.SourcePath}");
            }

            var destZip = Path.Combine(backupDir, $"{task.Name.Replace(" ", "_")}_{timestamp}.zip");
            
            // Create ZIP asynchronously or in threadpool
            await Task.Run(() => ZipFile.CreateFromDirectory(task.SourcePath, destZip));

            var fileInfo = new FileInfo(destZip);
            return $"Local ZIP: {destZip} ({FormatBytes(fileInfo.Length)})";
        }
        else if (task.BackupType == "Database")
        {
            // SQLite database file backup
            // Try to find the sqlite db file from connection string or default to local folder
            var dbPath = "area27_tools.db";
            if (File.Exists("/app/data/area27_tools.db"))
            {
                dbPath = "/app/data/area27_tools.db";
            }
            else if (File.Exists("area27_tools.db"))
            {
                dbPath = "area27_tools.db";
            }

            if (!File.Exists(dbPath))
            {
                throw new FileNotFoundException($"Arquivo de banco de dados SQLite não encontrado no caminho {dbPath}");
            }

            var destDb = Path.Combine(backupDir, $"db_backup_{timestamp}.db");
            await Task.Run(() => File.Copy(dbPath, destDb, true));

            var fileInfo = new FileInfo(destDb);
            return $"Local DB Copy: {destDb} ({FormatBytes(fileInfo.Length)})";
        }
        else if (task.BackupType == "Command")
        {
            // Execute shell script or local command
            if (string.IsNullOrEmpty(task.SourcePath))
            {
                throw new ArgumentException("Comando a ser executado não especificado no campo 'SourcePath'.");
            }

            var startInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? "cmd.exe" : "/bin/sh",
                Arguments = RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? $"/c {task.SourcePath}" : $"-c \"{task.SourcePath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = System.Diagnostics.Process.Start(startInfo);
            if (process == null) throw new InvalidOperationException("Falha ao iniciar processo.");

            await process.WaitForExitAsync();
            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();

            if (process.ExitCode != 0)
            {
                throw new Exception($"Comando retornou erro (ExitCode: {process.ExitCode}): {error}");
            }

            return $"Command Output: {output.Trim()}";
        }

        throw new NotSupportedException($"Tipo de backup não suportado: {task.BackupType}");
    }

    private string FormatBytes(long bytes)
    {
        if (bytes == 0) return "0 B";
        string[] suffix = { "B", "KB", "MB", "GB", "TB" };
        int index = (int)Math.Floor(Math.Log(bytes, 1024));
        double num = Math.Round(bytes / Math.Pow(1024, index), 1);
        return $"{num} {suffix[index]}";
    }
}
