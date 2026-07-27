using System;

namespace Area27.Tools.Core.Entities;

public class NetworkDevice
{
    public int Id { get; set; }
    public required string IpAddress { get; set; }
    public string? MacAddress { get; set; }
    public string? Hostname { get; set; }
    public string? Vendor { get; set; }
    public double? LatencyMs { get; set; }
    public bool IsOnline { get; set; }
    public DateTime LastSeen { get; set; }
    public string? CustomName { get; set; }
}
