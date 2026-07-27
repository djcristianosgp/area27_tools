using System;
using System.Linq;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Area27.Tools.API.Modules.NetworkScanner;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller responsável pelo Scanner de Rede Local e Wake-on-LAN.
/// </summary>
[Authorize]
[ApiController]
[Route("api/network")]
[Produces("application/json")]
public class NetworkScannerController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly NetworkScannerService _scannerService;

    public NetworkScannerController(AppDbContext db, NetworkScannerService scannerService)
    {
        _db = db;
        _scannerService = scannerService;
    }

    /// <summary>
    /// Retorna todos os dispositivos descobertos na rede local.
    /// </summary>
    [HttpGet("devices")]
    [ProducesResponseType(typeof(NetworkDevice[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDevices()
    {
        var devices = await _db.NetworkDevices.OrderBy(d => d.IpAddress).ToListAsync();
        return Ok(devices);
    }

    /// <summary>
    /// Dispara uma varredura manual de rede assíncrona.
    /// </summary>
    [HttpPost("scan")]
    [ProducesResponseType(StatusCodes.Status202Accepted)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public IActionResult TriggerScan()
    {
        if (_scannerService.IsScanning)
        {
            return Conflict(new { message = "Um escaneamento de rede já está em andamento." });
        }

        // Fire and forget the scan
        _ = _scannerService.ScanNetworkAsync();

        return Accepted(new { message = "Escaneamento de rede iniciado." });
    }

    /// <summary>
    /// Envia o pacote Wake-on-LAN para ligar o computador especificado pelo endereço MAC.
    /// </summary>
    [HttpPost("wake")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult WakeDevice([FromBody] WakeDeviceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.MacAddress))
        {
            return BadRequest(new { message = "Endereço MAC é obrigatório." });
        }

        try
        {
            _scannerService.SendWakeOnLan(request.MacAddress);
            return Ok(new { message = $"Sinal Wake-on-LAN enviado para o MAC {request.MacAddress}." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Erro ao enviar sinal WOL: {ex.Message}" });
        }
    }

    /// <summary>
    /// Define um apelido personalizado para um dispositivo na rede.
    /// </summary>
    [HttpPut("devices/{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateDeviceName([FromRoute] int id, [FromBody] UpdateDeviceNameRequest request)
    {
        var device = await _db.NetworkDevices.FirstOrDefaultAsync(d => d.Id == id);
        if (device == null)
        {
            return NotFound(new { message = "Dispositivo não encontrado." });
        }

        device.CustomName = request.CustomName;
        await _db.SaveChangesAsync();

        return Ok(device);
    }
}

public record WakeDeviceRequest(string MacAddress);
public record UpdateDeviceNameRequest(string? CustomName);
