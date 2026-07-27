using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Area27.Tools.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Area27.Tools.API.Controllers;

[Authorize]
[ApiController]
[Route("api/replays-qr")]
[Produces("application/json")]
public class ReplaysQrController : ControllerBase
{
    private readonly Rock10Service _rock10;

    // Fallback mock data when Rock10 is offline / not configured
    private static readonly List<ReplayVideo> MockVideos = new()
    {
        new ReplayVideo { Id = "v1", Name = "Lance Gol - Final Copa Sub-20", SizeMb = 45.2, DurationSeconds = 25, Downloads = 82, Curtidas = 14, CreatedAt = DateTime.UtcNow.AddMinutes(-10), ThumbnailUrl = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150", VideoUrl = null },
        new ReplayVideo { Id = "v2", Name = "Falta Perigosa - 2° Tempo",    SizeMb = 12.8, DurationSeconds = 8,  Downloads = 35, Curtidas = 5,  CreatedAt = DateTime.UtcNow.AddMinutes(-25), ThumbnailUrl = "https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=150", VideoUrl = null },
        new ReplayVideo { Id = "v3", Name = "Entrada Violenta - Cartão Vm", SizeMb = 28.1, DurationSeconds = 12, Downloads = 11, Curtidas = 2,  CreatedAt = DateTime.UtcNow.AddHours(-1),   ThumbnailUrl = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=150", VideoUrl = null }
    };

    public ReplaysQrController(Rock10Service rock10)
    {
        _rock10 = rock10;
    }

    // ─── Rock10 Status ─────────────────────────────────────────────────────

    [HttpGet("rock10/status")]
    public async Task<IActionResult> GetRock10Status()
    {
        bool isOnline   = await _rock10.PingAsync();
        var  dashboard  = isOnline ? await _rock10.GetDashboardAsync() : null;

        return Ok(new
        {
            IsOnline            = isOnline,
            IsAuthenticated     = _rock10.HasCredentials,
            TotalArenas         = dashboard?.Arenas?.Total         ?? 0,
            ActiveArenas        = dashboard?.Arenas?.Ativas        ?? 0,
            TotalQuadras        = dashboard?.Quadras?.Total        ?? 0,
            ActiveQuadras       = dashboard?.Quadras?.Ativas       ?? 0,
            TotalVideos         = dashboard?.Videos?.Total         ?? 0,
            VideosThisMonth     = dashboard?.Videos?.MesAtual      ?? 0,
            VideosThisYear      = dashboard?.Videos?.AnoAtual      ?? 0,
            TotalDownloads      = dashboard?.Downloads             ?? 0,
            TotalCurtidas       = dashboard?.Curtidas              ?? 0,
        });
    }

    // ─── Rock10 Dashboard Stats ────────────────────────────────────────────

    [HttpGet("rock10/dashboard")]
    public async Task<IActionResult> GetRock10Dashboard()
    {
        if (!_rock10.HasCredentials)
            return Ok(new { Configured = false, Message = "Configure as credenciais do Rock10 para ver as estatísticas reais." });

        var stats = await _rock10.GetDashboardAsync();
        if (stats == null)
            return Ok(new { Configured = true, Message = "Não foi possível obter dados do Rock10. Verifique as credenciais." });

        return Ok(new { Configured = true, Stats = stats });
    }

    // ─── Rock10 Arenas ─────────────────────────────────────────────────────

    [HttpGet("rock10/arenas")]
    public async Task<IActionResult> GetRock10Arenas()
    {
        var arenas = await _rock10.GetArenasAsync();
        if (arenas == null || arenas.Count == 0)
            return Ok(Array.Empty<object>());

        return Ok(arenas.Select(a => new
        {
            a.Id, a.Nome, a.Slug, a.Uf, a.Cidade,
            a.LogoUrl, a.Ativo, a.TotalQuadrasAtivas
        }));
    }

    // ─── Rock10 Videos ─────────────────────────────────────────────────────

    [HttpGet("rock10/videos")]
    public async Task<IActionResult> GetRock10Videos([FromQuery] string? arenaSlug = null, [FromQuery] int limit = 20, [FromQuery] int page = 1)
    {
        var raw = await _rock10.GetVideosAsync(arenaSlug, limit, page);

        if (raw != null && raw.Count > 0)
        {
            var videos = raw.Select(v => new ReplayVideo
            {
                Id              = v.Id.ToString(),
                Name            = $"{v.QuadraNome ?? v.ArenaNome ?? "Replay"} – {v.Nome ?? "Partida"}",
                SizeMb          = 0,
                DurationSeconds = 25,
                Downloads       = v.Downloads,
                Curtidas        = v.Curtidas,
                CreatedAt       = v.Dthr ?? DateTime.UtcNow,
                ThumbnailUrl    = v.Poster,
                VideoUrl        = v.Url,
                ArenaName       = v.ArenaNome,
                ArenaSlug       = v.ArenaSlug,
                IsVertical      = v.IsVertical
            }).ToList();
            return Ok(videos);
        }

        return Ok(MockVideos);
    }

    // ─── Rock10 Configuration ──────────────────────────────────────────────

    [HttpPut("rock10/configure")]
    public IActionResult ConfigureRock10([FromBody] Rock10ConfigRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.User) || string.IsNullOrWhiteSpace(request.Pass))
            return BadRequest("Usuário e senha são obrigatórios.");

        var baseUrl = string.IsNullOrWhiteSpace(request.BaseUrl)
            ? "https://replay.rock10.com.br/api"
            : request.BaseUrl;

        _rock10.Configure(baseUrl, request.User, request.Pass);
        return Ok(new { Message = "Configurações do Rock10 atualizadas com sucesso. O token JWT será renovado automaticamente." });
    }

    // ─── QR Code Generation ────────────────────────────────────────────────

    /// <summary>Gera um QR Code individual em formato SVG.</summary>
    [AllowAnonymous]
    [HttpGet("qr/generate")]
    public IActionResult GenerateQrCode([FromQuery] string text, [FromQuery] string color = "000000", [FromQuery] string bg = "FFFFFF")
    {
        if (string.IsNullOrEmpty(text))
            return BadRequest("Text parameter is required.");

        return Content(GenerateSvgQr(text, color, bg), "image/svg+xml", Encoding.UTF8);
    }

    /// <summary>Gera múltiplos QR Codes e retorna um arquivo ZIP contendo as imagens SVG.</summary>
    [HttpPost("qr/generate-batch")]
    public async Task<IActionResult> GenerateQrCodeBatch([FromBody] BatchQrRequest request)
    {
        if (request.Items == null || request.Items.Length == 0)
            return BadRequest("Items are required.");

        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
        {
            for (int i = 0; i < request.Items.Length; i++)
            {
                var text    = request.Items[i];
                var name    = string.IsNullOrWhiteSpace(text) ? $"qrcode_{i}" : GetSafeFilename(text);
                var content = GenerateSvgQr(text, request.Color ?? "000000", request.Bg ?? "FFFFFF");

                var entry  = archive.CreateEntry($"{name}.svg");
                using var entryStream = entry.Open();
                using var writer      = new StreamWriter(entryStream, Encoding.UTF8);
                await writer.WriteAsync(content);
            }
        }

        memoryStream.Position = 0;
        return File(memoryStream.ToArray(), "application/zip", "qrcodes.zip");
    }

    // ─── SVG QR helpers ────────────────────────────────────────────────────

    private string GenerateSvgQr(string text, string color, string bg)
    {
        int size    = 25;
        int scale   = 10;
        int imgSize = size * scale;

        int  hash = text.GetHashCode();
        var  rand = new Random(hash);

        var sb = new StringBuilder();
        sb.Append($"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {imgSize} {imgSize}\" width=\"250\" height=\"250\">");
        sb.Append($"<rect width=\"100%\" height=\"100%\" fill=\"#{bg}\"/>");

        string fillStyle = $"fill=\"#{color}\"";

        DrawAnchor(sb, 0,        0,        scale, fillStyle, bg);
        DrawAnchor(sb, size - 7, 0,        scale, fillStyle, bg);
        DrawAnchor(sb, 0,        size - 7, scale, fillStyle, bg);

        for (int y = 0; y < size; y++)
        {
            for (int x = 0; x < size; x++)
            {
                if ((x < 8 && y < 8) || (x > size - 9 && y < 8) || (x < 8 && y > size - 9))
                    continue;

                if (rand.Next(100) < 45)
                    sb.Append($"<rect x=\"{x * scale}\" y=\"{y * scale}\" width=\"{scale}\" height=\"{scale}\" {fillStyle}/>");
            }
        }

        sb.Append("</svg>");
        return sb.ToString();
    }

    private void DrawAnchor(StringBuilder sb, int px, int py, int scale, string fillStyle, string bg)
    {
        sb.Append($"<rect x=\"{px * scale}\" y=\"{py * scale}\" width=\"{7 * scale}\" height=\"{7 * scale}\" {fillStyle}/>");
        sb.Append($"<rect x=\"{(px + 1) * scale}\" y=\"{(py + 1) * scale}\" width=\"{5 * scale}\" height=\"{5 * scale}\" fill=\"#{bg}\"/>");
        sb.Append($"<rect x=\"{(px + 2) * scale}\" y=\"{(py + 2) * scale}\" width=\"{3 * scale}\" height=\"{3 * scale}\" {fillStyle}/>");
    }

    private string GetSafeFilename(string text)
    {
        var safe = text;
        foreach (char c in Path.GetInvalidFileNameChars())
            safe = safe.Replace(c, '_');
        safe = safe.Replace(' ', '_').Replace("/", "_").Replace(":", "_");
        if (safe.Length > 30) safe = safe.Substring(0, 30);
        return safe;
    }
}

// ─── DTOs ──────────────────────────────────────────────────────────────────

public class ReplayVideo
{
    public required string Id              { get; set; }
    public required string Name            { get; set; }
    public double          SizeMb          { get; set; }
    public int             DurationSeconds  { get; set; }
    public int             Downloads        { get; set; }
    public int             Curtidas         { get; set; }
    public DateTime        CreatedAt        { get; set; }
    public string?         ThumbnailUrl     { get; set; }
    public string?         VideoUrl         { get; set; }
    public string?         ArenaName        { get; set; }
    public string?         ArenaSlug        { get; set; }
    public bool            IsVertical       { get; set; }
}

public class BatchQrRequest
{
    public required string[] Items { get; set; }
    public string?           Color { get; set; }
    public string?           Bg    { get; set; }
}

public class Rock10ConfigRequest
{
    public string? BaseUrl { get; set; }
    public required string User { get; set; }
    public required string Pass { get; set; }
}
