using System;
using System.ComponentModel.DataAnnotations;

namespace Area27.Tools.Core.Entities;

public class UptimeCheck
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(100)]
    public required string Name { get; set; }
    
    [Required]
    [MaxLength(255)]
    public required string Target { get; set; } // URL, Hostname or IP
    
    [Required]
    [MaxLength(20)]
    public required string Protocol { get; set; } // "HTTP", "HTTPS", "PING", "TCP"
    
    public int? Port { get; set; }
    
    public int CheckIntervalSeconds { get; set; } = 60;
    
    public bool IsActive { get; set; } = true;
    
    [MaxLength(20)]
    public string Status { get; set; } = "Unknown"; // "Online", "Offline", "Unknown"
    
    public DateTime? LastChecked { get; set; }
    
    public double AverageLatencyMs { get; set; }
}
