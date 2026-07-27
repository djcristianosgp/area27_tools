using System;
using System.ComponentModel.DataAnnotations;

namespace Area27.Tools.Core.Entities;

public class BackupCronTask
{
    [Key]
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string CronExpression { get; set; }
    public required string BackupType { get; set; } // "Folder", "Database", "Command"
    public string? SourcePath { get; set; }
    public required string DestinationType { get; set; } // "Local", "S3", "FTP"
    public string? DestinationSettings { get; set; } // JSON serialized settings
    public bool IsActive { get; set; } = true;
    public DateTime? LastRun { get; set; }
    public DateTime? NextRun { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class BackupCronLog
{
    [Key]
    public int Id { get; set; }
    public int TaskId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public bool IsSuccess { get; set; }
    public string? Message { get; set; }
    public string? FileDetails { get; set; }
}

public class GitRepository
{
    [Key]
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string LocalPath { get; set; }
    public required string Branch { get; set; } = "main";
    public required string WebhookToken { get; set; }
    public string? PostDeployCmd { get; set; }
    public DateTime? LastDeployTime { get; set; }
    public string LastDeployStatus { get; set; } = "Never"; // "Success", "Failed", "Never"
    public string? LastDeployLog { get; set; }
}

public class LogSource
{
    [Key]
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Type { get; set; } // "File", "Docker", "Journal"
    public required string Path { get; set; } // file path or container name/id
}
