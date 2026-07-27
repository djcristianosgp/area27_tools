using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Area27.Tools.Core.Entities;

public class UptimeHistory
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UptimeCheckId { get; set; }
    
    [ForeignKey(nameof(UptimeCheckId))]
    public UptimeCheck? UptimeCheck { get; set; }
    
    [Required]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    [Required]
    public bool IsSuccess { get; set; }
    
    public double LatencyMs { get; set; }
    
    [MaxLength(255)]
    public string? ErrorMessage { get; set; }
}
