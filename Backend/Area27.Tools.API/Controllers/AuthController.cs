using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Area27.Tools.Infrastructure.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller responsável pela autenticação e registro de usuários.
/// </summary>
[ApiController]
[Route("api/auth")]
[Consumes("application/json")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtTokenService _tokenService;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="AuthController"/>.
    /// </summary>
    public AuthController(AppDbContext db, JwtTokenService tokenService)
    {
        _db = db;
        _tokenService = tokenService;
    }

    /// <summary>
    /// Cadastra um novo usuário no sistema.
    /// </summary>
    /// <param name="request">Dados de cadastro (usuário e senha).</param>
    /// <response code="200">Usuário registrado com sucesso.</response>
    /// <response code="400">Dados inválidos ou nome de usuário já existente.</response>
    [HttpPost("register")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username and password are required." });
        }

        var existingUser = await _db.Users.AnyAsync(u => u.Username == request.Username);
        if (existingUser)
        {
            return BadRequest(new { message = "Username is already taken." });
        }

        var newUser = new User
        {
            Username = request.Username,
            PasswordHash = PasswordHasher.HashPassword(request.Password),
            Role = "Viewer"
        };

        _db.Users.Add(newUser);
        await _db.SaveChangesAsync();

        return Ok(new { message = "User registered successfully." });
    }

    /// <summary>
    /// Realiza a autenticação do usuário, gerando um token JWT.
    /// </summary>
    /// <param name="request">Credenciais de acesso (usuário e senha).</param>
    /// <response code="200">Autenticação bem-sucedida, retorna o token e dados do usuário.</response>
    /// <response code="400">Usuário ou senha ausentes.</response>
    /// <response code="401">Credenciais inválidas.</response>
    [HttpPost("login")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Username and password are required." });
        }

        var user = await _db.Users.SingleOrDefaultAsync(u => u.Username == request.Username);
        if (user == null || !PasswordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized();
        }

        var token = _tokenService.GenerateToken(user);
        return Ok(new
        {
            token,
            user = new { username = user.Username, role = user.Role }
        });
    }
}
