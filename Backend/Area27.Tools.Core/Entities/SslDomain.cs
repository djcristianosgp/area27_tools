using System;

namespace Area27.Tools.Core.Entities;

public class SslDomain
{
    public int Id { get; set; }
    public required string Domain { get; set; }
    public int Port { get; set; } = 443;
    public string? Issuer { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public DateTime LastChecked { get; set; }
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
}
