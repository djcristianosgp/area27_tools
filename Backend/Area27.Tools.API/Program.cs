using System.Text;
using Area27.Tools.Core.Entities;
using Area27.Tools.Core.Modules;
using Area27.Tools.Infrastructure.Data;
using Area27.Tools.Infrastructure.Security;
using Area27.Tools.API.Modules.Uptime;
using Area27.Tools.API.Modules.ServerMetrics;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// 1. Configure SQLite Database
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=area27_tools.db";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

// 2. Configure JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["Secret"] ?? "Area27ToolsSuperSecretKeyMustBeLongEnoughForSecurityReasons123!";
var issuer = jwtSettings["Issuer"] ?? "Area27Tools";
var audience = jwtSettings["Audience"] ?? "Area27ToolsUsers";

builder.Services.AddSingleton<JwtTokenService>();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddAuthorization();

// 3. Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactDev", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 4. Configure Modular Registry
builder.Services.AddModuleRegistry(registry =>
{
    registry.RegisterModule(new UptimeModule());
    registry.RegisterModule(new ServerMetricsModule());
});

var app = builder.Build();

// 5. Database Initialization (Auto migrations/seeds)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        DbInitializer.Initialize(services);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

// 6. Middleware Pipeline
app.UseCors("AllowReactDev");
app.UseAuthentication();
app.UseAuthorization();

// 7. Base Endpoints & Authentication API
app.MapGet("/", () => new { app = "Area27 Tools API", status = "Running" });

// Authentication Routes
app.MapPost("/api/auth/register", async (RegisterRequest request, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Username and password are required." });
    }

    var existingUser = await db.Users.AnyAsync(u => u.Username == request.Username);
    if (existingUser)
    {
        return Results.BadRequest(new { message = "Username is already taken." });
    }

    var newUser = new User
    {
        Username = request.Username,
        PasswordHash = PasswordHasher.HashPassword(request.Password),
        Role = "Viewer"
    };

    db.Users.Add(newUser);
    await db.SaveChangesAsync();

    return Results.Ok(new { message = "User registered successfully." });
});

app.MapPost("/api/auth/login", async (LoginRequest request, AppDbContext db, JwtTokenService tokenService) =>
{
    if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { message = "Username and password are required." });
    }

    var user = await db.Users.SingleOrDefaultAsync(u => u.Username == request.Username);
    if (user == null || !PasswordHasher.VerifyPassword(request.Password, user.PasswordHash))
    {
        return Results.Unauthorized();
    }

    var token = tokenService.GenerateToken(user);
    return Results.Ok(new
    {
        token,
        user = new { username = user.Username, role = user.Role }
    });
});

// Module Management Routes
app.MapGet("/api/modules", async (AppDbContext db, ModuleRegistry registry) =>
{
    var dbModules = await db.Modules.ToListAsync();
    
    // Merge registered core modules with db states
    var result = registry.Modules.Select(m => new
    {
        id = m.Id,
        name = m.Name,
        description = m.Description,
        icon = m.Icon,
        isEnabled = dbModules.FirstOrDefault(dm => dm.Id == m.Id)?.IsEnabled ?? true
    });

    return Results.Ok(result);
});

app.MapPost("/api/modules/{id}/toggle", async (string id, AppDbContext db) =>
{
    var dbModule = await db.Modules.SingleOrDefaultAsync(m => m.Id == id);
    if (dbModule == null)
    {
        dbModule = new ToolModuleState
        {
            Id = id,
            Name = id,
            IsEnabled = false
        };
        db.Modules.Add(dbModule);
    }
    else
    {
        dbModule.IsEnabled = !dbModule.IsEnabled;
    }

    await db.SaveChangesAsync();
    return Results.Ok(new { id = dbModule.Id, isEnabled = dbModule.IsEnabled });
});

// 8. Register Routes for all modules dynamically
app.MapModules();

app.Run();

// Request Models
public record RegisterRequest(string Username, string Password);
public record LoginRequest(string Username, string Password);
