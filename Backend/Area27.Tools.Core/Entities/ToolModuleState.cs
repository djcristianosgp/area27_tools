using System.ComponentModel.DataAnnotations;

namespace Area27.Tools.Core.Entities;

public class ToolModuleState
{
    [Key]
    public required string Id { get; set; }
    public required string Name { get; set; }
    public bool IsEnabled { get; set; } = true;
    public string? RequiredPermissions { get; set; }
}
