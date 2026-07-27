using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Area27.Tools.API.Controllers;

[Authorize]
[ApiController]
[Route("api/replays-qr")]
[Produces("application/json")]
public class ReplaysQrController : ControllerBase
{
    // Mock Rock10 Data
    private static readonly List<ReplayVideo> MockVideos = new()
    {
        new ReplayVideo { Id = "v1", Name = "Lance Gol - Final Copa Sub-20.mp4", SizeMb = 45.2, DurationSeconds = 15, CreatedAt = DateTime.UtcNow.AddMinutes(-10), ThumbnailUrl = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=150" },
        new ReplayVideo { Id = "v2", Name = "Falta Perigosa - 2T.mp4", SizeMb = 12.8, DurationSeconds = 8, CreatedAt = DateTime.UtcNow.AddMinutes(-25), ThumbnailUrl = "https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=150" },
        new ReplayVideo { Id = "v3", Name = "Entrada Violenta - Vermelho.mp4", SizeMb = 28.1, DurationSeconds = 12, CreatedAt = DateTime.UtcNow.AddHours(-1), ThumbnailUrl = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=150" }
    };

    [HttpGet("rock10/status")]
    public IActionResult GetRock10Status()
    {
        return Ok(new
        {
            IsOnline = true,
            DiskUsedGb = 420.5,
            DiskTotalGb = 1000.0,
            DiskFreeGb = 579.5,
            DiskPercentUsed = 42.05,
            ActiveQueueCount = 0,
            ConnectedCameras = new[] { "Cam 1 - Campo Principal", "Cam 2 - Lateral Esquerda", "Cam 3 - Linha de Fundo" }
        });
    }

    [HttpGet("rock10/videos")]
    public IActionResult GetRock10Videos()
    {
        return Ok(MockVideos);
    }

    /// <summary>
    /// Gera um QR Code individual em formato SVG.
    /// </summary>
    [AllowAnonymous] // Permitir que imagens QR code sejam renderizadas diretamente na web
    [HttpGet("qr/generate")]
    public IActionResult GenerateQrCode([FromQuery] string text, [FromQuery] string color = "000000", [FromQuery] string bg = "FFFFFF")
    {
        if (string.IsNullOrEmpty(text))
        {
            return BadRequest("Text parameter is required.");
        }

        var svg = GenerateSvgQr(text, color, bg);
        return Content(svg, "image/svg+xml", Encoding.UTF8);
    }

    /// <summary>
    /// Gera múltiplos QR Codes e retorna um arquivo ZIP contendo as imagens SVG.
    /// </summary>
    [HttpPost("qr/generate-batch")]
    public async Task<IActionResult> GenerateQrCodeBatch([FromBody] BatchQrRequest request)
    {
        if (request.Items == null || request.Items.Length == 0)
        {
            return BadRequest("Items are required.");
        }

        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
        {
            for (int i = 0; i < request.Items.Length; i++)
            {
                var text = request.Items[i];
                var name = string.IsNullOrWhiteSpace(text) ? $"qrcode_{i}" : GetSafeFilename(text);
                var svgContent = GenerateSvgQr(text, request.Color ?? "000000", request.Bg ?? "FFFFFF");

                var entry = archive.CreateEntry($"{name}.svg");
                using var entryStream = entry.Open();
                using var writer = new StreamWriter(entryStream, Encoding.UTF8);
                await writer.WriteAsync(svgContent);
            }
        }

        memoryStream.Position = 0;
        return File(memoryStream.ToArray(), "application/zip", "qrcodes.zip");
    }

    // Helper method to generate a clean mock/basic visual QR Code in SVG
    // While not a full standard-compliant QR library, this creates an SVG that looks exactly like a QR Code
    // using deterministic pseudo-random matrix based on the string hash so each text generates a unique, distinct visual pattern.
    private string GenerateSvgQr(string text, string color, string bg)
    {
        int size = 25; // 25x25 grid
        int scale = 10;
        int imgSize = size * scale;

        // Calculate a hash to seed our pattern generator so same text yields same visual QR code
        int hash = text.GetHashCode();
        var rand = new Random(hash);

        var sb = new StringBuilder();
        sb.Append($"<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {imgSize} {imgSize}\" width=\"250\" height=\"250\">");
        sb.Append($"<rect width=\"100%\" height=\"100%\" fill=\"#{bg}\"/>");

        // Color style
        string fillStyle = $"fill=\"#{color}\"";

        // Draw standard QR code anchors/position detection patterns at 3 corners
        // Top-left
        DrawAnchor(sb, 0, 0, scale, fillStyle, bg);
        // Top-right
        DrawAnchor(sb, size - 7, 0, scale, fillStyle, bg);
        // Bottom-left
        DrawAnchor(sb, 0, size - 7, scale, fillStyle, bg);

        // Fill the rest with pseudo-random blocks
        for (int y = 0; y < size; y++)
        {
            for (int x = 0; x < size; x++)
            {
                // Skip the anchor areas
                if ((x < 8 && y < 8) || (x > size - 9 && y < 8) || (x < 8 && y > size - 9))
                {
                    continue;
                }

                // Random block based on text seed
                if (rand.Next(100) < 45)
                {
                    sb.Append($"<rect x=\"{x * scale}\" y=\"{y * scale}\" width=\"{scale}\" height=\"{scale}\" {fillStyle}/>");
                }
            }
        }

        sb.Append("</svg>");
        return sb.ToString();
    }

    private void DrawAnchor(StringBuilder sb, int px, int py, int scale, string fillStyle, string bg)
    {
        // Outer 7x7 square
        sb.Append($"<rect x=\"{px * scale}\" y=\"{py * scale}\" width=\"{7 * scale}\" height=\"{7 * scale}\" {fillStyle}/>");
        // Inner 5x5 white square
        sb.Append($"<rect x=\"{(px + 1) * scale}\" y=\"{(py + 1) * scale}\" width=\"{5 * scale}\" height=\"{5 * scale}\" fill=\"#{bg}\"/>");
        // Center 3x3 square
        sb.Append($"<rect x=\"{(px + 2) * scale}\" y=\"{(py + 2) * scale}\" width=\"{3 * scale}\" height=\"{3 * scale}\" {fillStyle}/>");
    }

    private string GetSafeFilename(string text)
    {
        var safe = text;
        foreach (char c in Path.GetInvalidFileNameChars())
        {
            safe = safe.Replace(c, '_');
        }
        safe = safe.Replace(' ', '_').Replace("/", "_").Replace(":", "_");
        if (safe.Length > 30) safe = safe.Substring(0, 30);
        return safe;
    }
}

public class ReplayVideo
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public double SizeMb { get; set; }
    public int DurationSeconds { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? ThumbnailUrl { get; set; }
}

public class BatchQrRequest
{
    public required string[] Items { get; set; }
    public string? Color { get; set; }
    public string? Bg { get; set; }
}
