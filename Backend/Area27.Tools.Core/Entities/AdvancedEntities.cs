using System;
using System.ComponentModel.DataAnnotations;

namespace Area27.Tools.Core.Entities;

public class Camera
{
    [Key]
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string RtspUrl { get; set; }
    public string? MjpegUrl { get; set; }
    public string? Location { get; set; }
    public bool IsActive { get; set; } = true;
}

public class IotDevice
{
    [Key]
    public int Id { get; set; }
    public required string DeviceName { get; set; }
    public required string Topic { get; set; }
    public required string PayloadType { get; set; } // "Switch", "Sensor", "Text"
    public string? LastValue { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

public class InventoryItem
{
    [Key]
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? SerialNumber { get; set; }
    public required string Category { get; set; } // "Camera", "Notebook", "Cabo", "Switch", etc.
    public string? Location { get; set; }
    public required string Status { get; set; } // "Available", "In Use", "In Maintenance", "Damaged"
}

public class Event
{
    [Key]
    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTime Date { get; set; }
    public string? Location { get; set; }
    public string? TeamMembers { get; set; } // Comma separated list
    public required string Status { get; set; } // "Scheduled", "In Progress", "Completed", "Cancelled"
    public string? Description { get; set; }
}

public class EventChecklistItem
{
    [Key]
    public int Id { get; set; }
    public int EventId { get; set; }
    public int InventoryItemId { get; set; }
    public bool IsChecked { get; set; }
}
