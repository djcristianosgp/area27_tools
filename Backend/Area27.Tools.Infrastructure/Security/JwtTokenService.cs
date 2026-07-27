using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Area27.Tools.Core.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Area27.Tools.Infrastructure.Security;

public class JwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = jwtSettings["Secret"] ?? "Area27ToolsSuperSecretKeyMustBeLongEnoughForSecurityReasons123!";
        var issuer = jwtSettings["Issuer"] ?? "Area27Tools";
        var audience = jwtSettings["Audience"] ?? "Area27ToolsUsers";
        var expiryMinutes = double.TryParse(jwtSettings["ExpiryMinutes"], out var minutes) ? minutes : 1440; // Default 1 day

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Username),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("id", user.Id.ToString())
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
