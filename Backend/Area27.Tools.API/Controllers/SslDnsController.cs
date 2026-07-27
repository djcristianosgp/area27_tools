using System;
using System.Linq;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Area27.Tools.API.Modules.SslDns;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller responsável pelo monitoramento de certificados SSL e consultas DNS.
/// </summary>
[Authorize]
[ApiController]
[Route("api/ssldns")]
[Produces("application/json")]
public class SslDnsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly SslCheckerService _sslService;

    public SslDnsController(AppDbContext db, SslCheckerService sslService)
    {
        _db = db;
        _sslService = sslService;
    }

    /// <summary>
    /// Lista todos os domínios cadastrados para monitoramento de SSL.
    /// </summary>
    [HttpGet("domains")]
    [ProducesResponseType(typeof(SslDomain[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDomains()
    {
        var domains = await _db.SslDomains.OrderBy(d => d.Domain).ToListAsync();
        return Ok(domains);
    }

    /// <summary>
    /// Cadastra um novo domínio para monitoramento de certificado SSL.
    /// </summary>
    [HttpPost("domains")]
    [Consumes("application/json")]
    [ProducesResponseType(typeof(SslDomain), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateDomain([FromBody] CreateDomainRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Domain))
        {
            return BadRequest(new { message = "O nome do domínio é obrigatório." });
        }

        var domain = new SslDomain
        {
            Domain = request.Domain.Trim().ToLower(),
            Port = request.Port <= 0 ? 443 : request.Port,
            LastChecked = DateTime.UtcNow,
            IsValid = false
        };

        // Perform initial check immediately
        await _sslService.CheckCertificateAsync(domain);

        _db.SslDomains.Add(domain);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetDomains), null, domain);
    }

    /// <summary>
    /// Remove um domínio monitorado pelo ID.
    /// </summary>
    [HttpDelete("domains/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteDomain([FromRoute] int id)
    {
        var domain = await _db.SslDomains.FirstOrDefaultAsync(d => d.Id == id);
        if (domain == null)
        {
            return NotFound(new { message = "Domínio não encontrado." });
        }

        _db.SslDomains.Remove(domain);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Domínio removido com sucesso." });
    }

    /// <summary>
    /// Força a revalidação imediata do certificado de um domínio específico.
    /// </summary>
    [HttpPost("domains/{id}/check")]
    [ProducesResponseType(typeof(SslDomain), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CheckDomain([FromRoute] int id)
    {
        var domain = await _db.SslDomains.FirstOrDefaultAsync(d => d.Id == id);
        if (domain == null)
        {
            return NotFound(new { message = "Domínio não encontrado." });
        }

        await _sslService.CheckCertificateAsync(domain);
        await _db.SaveChangesAsync();

        return Ok(domain);
    }

    /// <summary>
    /// Consulta registros DNS de um determinado domínio e tipo.
    /// </summary>
    [HttpGet("dns/resolve")]
    [ProducesResponseType(typeof(DnsResolveResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResolveDns([FromQuery] string domain, [FromQuery] string type)
    {
        if (string.IsNullOrWhiteSpace(domain) || string.IsNullOrWhiteSpace(type))
        {
            return BadRequest(new { message = "Parâmetros 'domain' e 'type' são obrigatórios." });
        }

        var result = await _sslService.ResolveDnsAsync(domain.Trim(), type.Trim().ToUpper());
        if (result == null)
        {
            return BadRequest(new { message = "Não foi possível resolver a consulta DNS." });
        }

        return Ok(result);
    }
}

public record CreateDomainRequest(string Domain, int Port);
