using System;
using System.Linq;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Area27.Tools.API.Modules.Uptime;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller responsável pelo monitoramento de URLs (Uptime).
/// </summary>
[Authorize]
[ApiController]
[Route("api/uptime")]
[Produces("application/json")]
public class UptimeController : ControllerBase
{
    private readonly AppDbContext _db;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="UptimeController"/>.
    /// </summary>
    public UptimeController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Lista todos os alvos cadastrados para monitoramento de Uptime.
    /// </summary>
    /// <response code="200">Lista obtida com sucesso.</response>
    [HttpGet("checks")]
    [ProducesResponseType(typeof(UptimeCheck[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetChecks()
    {
        var checks = await _db.UptimeChecks.ToListAsync();
        return Ok(checks);
    }

    /// <summary>
    /// Cadastra uma nova URL ou IP para monitoramento.
    /// </summary>
    /// <param name="dto">Dados de cadastro do novo monitoramento.</param>
    /// <response code="201">Monitoramento cadastrado com sucesso.</response>
    /// <response code="400">Dados obrigatórios não preenchidos.</response>
    [HttpPost("checks")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(UptimeCheck), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCheck([FromBody] CreateUptimeCheckDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Target))
        {
            return BadRequest("Name and Target are required.");
        }

        var check = new UptimeCheck
        {
            Name = dto.Name.Trim(),
            Target = dto.Target.Trim(),
            Protocol = dto.Protocol?.ToUpperInvariant() ?? "HTTP",
            Port = dto.Port,
            CheckIntervalSeconds = dto.CheckIntervalSeconds > 0 ? dto.CheckIntervalSeconds : 60,
            IsActive = true,
            Status = "Unknown"
        };

        _db.UptimeChecks.Add(check);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetChecks), new { id = check.Id }, check);
    }

    /// <summary>
    /// Atualiza as configurações de um monitoramento existente.
    /// </summary>
    /// <param name="id">Identificador único do monitoramento.</param>
    /// <param name="dto">Novos dados de configuração.</param>
    /// <response code="200">Configurações atualizadas com sucesso.</response>
    /// <response code="404">Monitoramento não encontrado.</response>
    [HttpPut("checks/{id:guid}")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(UptimeCheck), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCheck([FromRoute] Guid id, [FromBody] UpdateUptimeCheckDto dto)
    {
        var check = await _db.UptimeChecks.FindAsync(id);
        if (check == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Name)) check.Name = dto.Name.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Target)) check.Target = dto.Target.Trim();
        if (!string.IsNullOrWhiteSpace(dto.Protocol)) check.Protocol = dto.Protocol.ToUpperInvariant();
        check.Port = dto.Port;
        if (dto.CheckIntervalSeconds.HasValue && dto.CheckIntervalSeconds.Value > 0)
        {
            check.CheckIntervalSeconds = dto.CheckIntervalSeconds.Value;
        }
        if (dto.IsActive.HasValue) check.IsActive = dto.IsActive.Value;

        await _db.SaveChangesAsync();
        return Ok(check);
    }

    /// <summary>
    /// Remove um monitoramento e todo o seu histórico de latência.
    /// </summary>
    /// <param name="id">Identificador único do monitoramento.</param>
    /// <response code="24">Monitoramento removido com sucesso.</response>
    /// <response code="404">Monitoramento não encontrado.</response>
    [HttpDelete("checks/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteCheck([FromRoute] Guid id)
    {
        var check = await _db.UptimeChecks.FindAsync(id);
        if (check == null) return NotFound();

        var history = await _db.UptimeHistories.Where(h => h.UptimeCheckId == id).ToListAsync();
        _db.UptimeHistories.RemoveRange(history);
        _db.UptimeChecks.Remove(check);

        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>
    /// Obtém o histórico recente de checagens e latência de um alvo específico (máximo de 50 registros).
    /// </summary>
    /// <param name="id">Identificador do monitoramento.</param>
    /// <response code="200">Histórico de latência obtido com sucesso.</response>
    /// <response code="404">Monitoramento não encontrado.</response>
    [HttpGet("checks/{id:guid}/history")]
    [ProducesResponseType(typeof(UptimeHistory[]), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetCheckHistory([FromRoute] Guid id)
    {
        var exists = await _db.UptimeChecks.AnyAsync(c => c.Id == id);
        if (!exists) return NotFound();

        var history = await _db.UptimeHistories
            .Where(h => h.UptimeCheckId == id)
            .OrderByDescending(h => h.Timestamp)
            .Take(50)
            .ToListAsync();

        history.Reverse(); // Retornar na ordem cronológica
        return Ok(history);
    }
}
