using System;
using System.IO;
using System.Text;
using Area27.Tools.Core.Modules;
using Area27.Tools.Infrastructure.Data;
using Area27.Tools.Infrastructure.Security;
using Area27.Tools.API.Modules.Uptime;
using Area27.Tools.API.Modules.ServerMetrics;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
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

// 5. Add Controllers
builder.Services.AddControllers();

// 6. Configure Swagger/OpenAPI with XML Documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "Area27 Tools API", Version = "v1" });
    
    // Configure XML comments for Swagger
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

var app = builder.Build();

// 7. Database Initialization (Auto migrations/seeds)
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

// 8. Swagger UI in Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Area27 Tools API v1");
    });
}

// 9. Middleware Pipeline
app.UseCors("AllowReactDev");
app.UseAuthentication();
app.UseAuthorization();

// 10. Map Controller Endpoints
app.MapControllers();

app.Run();

// Request Models for Authentication (referenced by AuthController)
namespace Area27.Tools.API.Controllers
{
    /// <summary>
    /// Objeto com dados para registro de novo usuário.
    /// </summary>
    public record RegisterRequest(string Username, string Password);

    /// <summary>
    /// Objeto com credenciais de login do usuário.
    /// </summary>
    public record LoginRequest(string Username, string Password);
}
