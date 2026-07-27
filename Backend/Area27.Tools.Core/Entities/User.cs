namespace Area27.Tools.Core.Entities;

public class User
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public required string Role { get; set; } = "Viewer"; // e.g., Admin, Viewer
}
