using System;
using System.Linq;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Area27.Tools.API.Modules.IotMqtt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Area27.Tools.API.Controllers;

[Authorize]
[ApiController]
[Route("api/iot")]
[Produces("application/json")]
public class IotMqttController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly MqttBackgroundService _mqttService;

    public IotMqttController(AppDbContext db, MqttBackgroundService mqttService)
    {
        _db = db;
        _mqttService = mqttService;
    }

    [HttpGet("devices")]
    [ProducesResponseType(typeof(IotDevice[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDevices()
    {
        var devices = await _db.IotDevices.ToListAsync();
        return Ok(devices);
    }

    [HttpGet("devices/{id:int}")]
    [ProducesResponseType(typeof(IotDevice), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDevice(int id)
    {
        var device = await _db.IotDevices.FindAsync(id);
        if (device == null) return NotFound();
        return Ok(device);
    }

    [HttpPost("devices")]
    [ProducesResponseType(typeof(IotDevice), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateDevice([FromBody] CreateIotDeviceDto dto)
    {
        var device = new IotDevice
        {
            DeviceName = dto.DeviceName,
            Topic = dto.Topic,
            PayloadType = dto.PayloadType,
            LastValue = dto.PayloadType == "Switch" ? "OFF" : (dto.PayloadType == "Sensor" ? "20.0" : ""),
            LastUpdated = DateTime.UtcNow
        };

        _db.IotDevices.Add(device);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetDevice), new { id = device.Id }, device);
    }

    [HttpPut("devices/{id:int}")]
    [ProducesResponseType(typeof(IotDevice), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateDevice(int id, [FromBody] UpdateIotDeviceDto dto)
    {
        var device = await _db.IotDevices.FindAsync(id);
        if (device == null) return NotFound();

        if (dto.DeviceName != null) device.DeviceName = dto.DeviceName;
        if (dto.Topic != null) device.Topic = dto.Topic;
        if (dto.PayloadType != null) device.PayloadType = dto.PayloadType;
        if (dto.LastValue != null) device.LastValue = dto.LastValue;
        device.LastUpdated = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(device);
    }

    [HttpDelete("devices/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteDevice(int id)
    {
        var device = await _db.IotDevices.FindAsync(id);
        if (device == null) return NotFound();

        _db.IotDevices.Remove(device);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("devices/{id:int}/publish")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Publish(int id, [FromBody] PublishPayloadDto dto)
    {
        var device = await _db.IotDevices.FindAsync(id);
        if (device == null) return NotFound();

        await _mqttService.PublishAsync(device.Topic, dto.Payload);
        return Ok(new { Message = "Payload published successfully", Topic = device.Topic, Payload = dto.Payload });
    }
}
