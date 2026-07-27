using System.ComponentModel.DataAnnotations;

namespace Area27.Tools.Core.Entities;

public class Setting
{
    [Key]
    public required string Key { get; set; }
    public required string Value { get; set; }
    public required string Category { get; set; }
}
