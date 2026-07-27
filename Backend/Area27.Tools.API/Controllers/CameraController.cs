using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Area27.Tools.API.Modules.CameraPanel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Area27.Tools.API.Controllers;

[Authorize]
[ApiController]
[Route("api/cameras")]
[Produces("application/json")]
public class CameraController : ControllerBase
{
    private readonly AppDbContext _db;

    // Small valid JPEG image bytes (1x1 gray pixel or similar placeholder)
    private static readonly byte[] MockJpegBytes = new byte[]
    {
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
        0x00, 0x60, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
        0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x0A,
        0x00, 0x0A, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDD, 0x00, 0x04, 0x00, 0x01, 0xFF, 0xDA, 0x00,
        0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x37, 0xFF, 0xD9
    };

    public CameraController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(Camera[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCameras()
    {
        var cameras = await _db.Cameras.ToListAsync();
        return Ok(cameras);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(Camera), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCamera(int id)
    {
        var camera = await _db.Cameras.FindAsync(id);
        if (camera == null) return NotFound();
        return Ok(camera);
    }

    [HttpPost]
    [ProducesResponseType(typeof(Camera), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateCamera([FromBody] CreateCameraDto dto)
    {
        var camera = new Camera
        {
            Name = dto.Name,
            RtspUrl = dto.RtspUrl,
            MjpegUrl = dto.MjpegUrl,
            Location = dto.Location,
            IsActive = true
        };

        _db.Cameras.Add(camera);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetCamera), new { id = camera.Id }, camera);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(Camera), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCamera(int id, [FromBody] UpdateCameraDto dto)
    {
        var camera = await _db.Cameras.FindAsync(id);
        if (camera == null) return NotFound();

        if (dto.Name != null) camera.Name = dto.Name;
        if (dto.RtspUrl != null) camera.RtspUrl = dto.RtspUrl;
        if (dto.MjpegUrl != null) camera.MjpegUrl = dto.MjpegUrl;
        if (dto.Location != null) camera.Location = dto.Location;
        if (dto.IsActive.HasValue) camera.IsActive = dto.IsActive.Value;

        await _db.SaveChangesAsync();
        return Ok(camera);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCamera(int id)
    {
        var camera = await _db.Cameras.FindAsync(id);
        if (camera == null) return NotFound();

        _db.Cameras.Remove(camera);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Stream MJPEG simulado para visualização no navegador.
    /// </summary>
    [AllowAnonymous] // Permitir visualização direta da tag img no HTML
    [HttpGet("{id:int}/stream")]
    public async Task GetStream(int id, CancellationToken cancellationToken)
    {
        var camera = await _db.Cameras.FindAsync(id);
        if (camera == null)
        {
            Response.StatusCode = 404;
            return;
        }

        Response.ContentType = "multipart/x-mixed-replace; boundary=frame";
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");
        Response.Headers.Append("Pragma", "no-cache");

        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                // Write MJPEG frame header
                await Response.WriteAsync("\r\n--frame\r\n", cancellationToken);
                await Response.WriteAsync("Content-Type: image/jpeg\r\n", cancellationToken);
                await Response.WriteAsync($"Content-Length: {MockJpegBytes.Length}\r\n\r\n", cancellationToken);

                // Write image bytes
                await Response.Body.WriteAsync(MockJpegBytes, 0, MockJpegBytes.Length, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);

                // Simulate ~15 fps (approx 66ms delay)
                await Task.Delay(200, cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Client disconnected, normal flow
        }
    }
}
