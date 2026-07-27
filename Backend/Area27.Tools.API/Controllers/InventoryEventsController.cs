using System;
using System.Linq;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Area27.Tools.API.Modules.InventoryEvents;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Area27.Tools.API.Controllers;

[Authorize]
[ApiController]
[Route("api/inventory-events")]
[Produces("application/json")]
public class InventoryEventsController : ControllerBase
{
    private readonly AppDbContext _db;

    public InventoryEventsController(AppDbContext db)
    {
        _db = db;
    }

    #region Inventory Items (CRUD)

    [HttpGet("inventory")]
    [ProducesResponseType(typeof(InventoryItem[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInventory()
    {
        var items = await _db.InventoryItems.ToListAsync();
        return Ok(items);
    }

    [HttpGet("inventory/{id:int}")]
    [ProducesResponseType(typeof(InventoryItem), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetInventoryItem(int id)
    {
        var item = await _db.InventoryItems.FindAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpPost("inventory")]
    [ProducesResponseType(typeof(InventoryItem), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateInventoryItem([FromBody] CreateInventoryItemDto dto)
    {
        var item = new InventoryItem
        {
            Name = dto.Name,
            SerialNumber = dto.SerialNumber,
            Category = dto.Category,
            Location = dto.Location,
            Status = dto.Status
        };

        _db.InventoryItems.Add(item);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetInventoryItem), new { id = item.Id }, item);
    }

    [HttpPut("inventory/{id:int}")]
    [ProducesResponseType(typeof(InventoryItem), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateInventoryItem(int id, [FromBody] UpdateInventoryItemDto dto)
    {
        var item = await _db.InventoryItems.FindAsync(id);
        if (item == null) return NotFound();

        if (dto.Name != null) item.Name = dto.Name;
        if (dto.SerialNumber != null) item.SerialNumber = dto.SerialNumber;
        if (dto.Category != null) item.Category = dto.Category;
        if (dto.Location != null) item.Location = dto.Location;
        if (dto.Status != null) item.Status = dto.Status;

        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("inventory/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteInventoryItem(int id)
    {
        var item = await _db.InventoryItems.FindAsync(id);
        if (item == null) return NotFound();

        _db.InventoryItems.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Events (CRUD)

    [HttpGet("events")]
    [ProducesResponseType(typeof(Event[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetEvents()
    {
        var events = await _db.Events.ToListAsync();
        return Ok(events);
    }

    [HttpGet("events/{id:int}")]
    [ProducesResponseType(typeof(Event), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetEvent(int id)
    {
        var ev = await _db.Events.FindAsync(id);
        if (ev == null) return NotFound();
        return Ok(ev);
    }

    [HttpPost("events")]
    [ProducesResponseType(typeof(Event), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventDto dto)
    {
        var ev = new Event
        {
            Name = dto.Name,
            Date = dto.Date,
            Location = dto.Location,
            TeamMembers = dto.TeamMembers,
            Status = dto.Status,
            Description = dto.Description
        };

        _db.Events.Add(ev);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetEvent), new { id = ev.Id }, ev);
    }

    [HttpPut("events/{id:int}")]
    [ProducesResponseType(typeof(Event), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateEvent(int id, [FromBody] UpdateEventDto dto)
    {
        var ev = await _db.Events.FindAsync(id);
        if (ev == null) return NotFound();

        if (dto.Name != null) ev.Name = dto.Name;
        if (dto.Date.HasValue) ev.Date = dto.Date.Value;
        if (dto.Location != null) ev.Location = dto.Location;
        if (dto.TeamMembers != null) ev.TeamMembers = dto.TeamMembers;
        if (dto.Status != null) ev.Status = dto.Status;
        if (dto.Description != null) ev.Description = dto.Description;

        await _db.SaveChangesAsync();
        return Ok(ev);
    }

    [HttpDelete("events/{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteEvent(int id)
    {
        var ev = await _db.Events.FindAsync(id);
        if (ev == null) return NotFound();

        _db.Events.Remove(ev);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    #endregion

    #region Event Checklist

    [HttpGet("events/{eventId:int}/checklist")]
    public async Task<IActionResult> GetEventChecklist(int eventId)
    {
        var checklist = await _db.EventChecklistItems
            .Where(c => c.EventId == eventId)
            .ToListAsync();

        var itemIds = checklist.Select(c => c.InventoryItemId).ToList();
        var items = await _db.InventoryItems
            .Where(i => itemIds.Contains(i.Id))
            .ToListAsync();

        var result = checklist.Select(c => new
        {
            c.Id,
            c.EventId,
            c.InventoryItemId,
            c.IsChecked,
            ItemName = items.FirstOrDefault(i => i.Id == c.InventoryItemId)?.Name ?? "Item Desconhecido",
            ItemCategory = items.FirstOrDefault(i => i.Id == c.InventoryItemId)?.Category ?? "Outros",
            ItemSerialNumber = items.FirstOrDefault(i => i.Id == c.InventoryItemId)?.SerialNumber ?? ""
        });

        return Ok(result);
    }

    [HttpPost("events/{eventId:int}/checklist")]
    public async Task<IActionResult> AddToChecklist(int eventId, [FromBody] AddChecklistItemDto dto)
    {
        var exists = await _db.EventChecklistItems.AnyAsync(c => c.EventId == eventId && c.InventoryItemId == dto.InventoryItemId);
        if (exists) return BadRequest("Item already on the checklist.");

        var checklistItem = new EventChecklistItem
        {
            EventId = eventId,
            InventoryItemId = dto.InventoryItemId,
            IsChecked = false
        };

        _db.EventChecklistItems.Add(checklistItem);
        await _db.SaveChangesAsync();
        return Ok(checklistItem);
    }

    [HttpPost("events/{eventId:int}/checklist/toggle")]
    public async Task<IActionResult> ToggleChecklistItem(int eventId, [FromBody] ToggleChecklistItemDto dto)
    {
        var item = await _db.EventChecklistItems.FirstOrDefaultAsync(c => c.EventId == eventId && c.InventoryItemId == dto.InventoryItemId);
        if (item == null) return NotFound();

        item.IsChecked = dto.IsChecked;
        await _db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("events/{eventId:int}/checklist/{inventoryItemId:int}")]
    public async Task<IActionResult> RemoveFromChecklist(int eventId, int inventoryItemId)
    {
        var item = await _db.EventChecklistItems.FirstOrDefaultAsync(c => c.EventId == eventId && c.InventoryItemId == inventoryItemId);
        if (item == null) return NotFound();

        _db.EventChecklistItems.Remove(item);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    #endregion
}
