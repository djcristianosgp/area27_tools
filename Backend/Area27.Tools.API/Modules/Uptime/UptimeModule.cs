using System;
using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Entities;
using Area27.Tools.Core.Modules;
using Area27.Tools.Infrastructure.Data;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.Uptime;

public class UptimeModule : IToolModule
{
    public string Id => "uptime";
    public string Name => "Monitoramento de URLs (Uptime)";
    public string Description => "Checagem de disponibilidade de URLs em background.";
    public string Icon => "Activity";

    public void RegisterServices(IServiceCollection services)
    {
        services.AddHostedService<UptimeBackgroundWorker>();
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/uptime").WithTags("Uptime");

        // GET /api/uptime/checks
        group.MapGet("/checks", async (AppDbContext db) =>
        {
            var checks = await db.UptimeChecks.ToListAsync();
            return Results.Ok(checks);
        });

        // POST /api/uptime/checks
        group.MapPost("/checks", async (CreateUptimeCheckDto dto, AppDbContext db) =>
        {
            if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Target))
            {
                return Results.BadRequest("Name and Target are required.");
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

            db.UptimeChecks.Add(check);
            await db.SaveChangesAsync();
            return Results.Created($"/api/uptime/checks/{check.Id}", check);
        });

        // PUT /api/uptime/checks/{id}
        group.MapPut("/checks/{id:guid}", async (Guid id, UpdateUptimeCheckDto dto, AppDbContext db) =>
        {
            var check = await db.UptimeChecks.FindAsync(id);
            if (check == null) return Results.NotFound();

            if (!string.IsNullOrWhiteSpace(dto.Name)) check.Name = dto.Name.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Target)) check.Target = dto.Target.Trim();
            if (!string.IsNullOrWhiteSpace(dto.Protocol)) check.Protocol = dto.Protocol.ToUpperInvariant();
            check.Port = dto.Port;
            if (dto.CheckIntervalSeconds.HasValue && dto.CheckIntervalSeconds.Value > 0)
            {
                check.CheckIntervalSeconds = dto.CheckIntervalSeconds.Value;
            }
            if (dto.IsActive.HasValue) check.IsActive = dto.IsActive.Value;

            await db.SaveChangesAsync();
            return Results.Ok(check);
        });

        // DELETE /api/uptime/checks/{id}
        group.MapDelete("/checks/{id:guid}", async (Guid id, AppDbContext db) =>
        {
            var check = await db.UptimeChecks.FindAsync(id);
            if (check == null) return Results.NotFound();

            // Cascade delete history
            var history = await db.UptimeHistories.Where(h => h.UptimeCheckId == id).ToListAsync();
            db.UptimeHistories.RemoveRange(history);
            db.UptimeChecks.Remove(check);

            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        // GET /api/uptime/checks/{id}/history
        group.MapGet("/checks/{id:guid}/history", async (Guid id, AppDbContext db) =>
        {
            var check = await db.UptimeChecks.AnyAsync(c => c.Id == id);
            if (!check) return Results.NotFound();

            var history = await db.UptimeHistories
                .Where(h => h.UptimeCheckId == id)
                .OrderByDescending(h => h.Timestamp)
                .Take(50)
                .ToListAsync();

            // Reverse to return chronological order
            history.Reverse();

            return Results.Ok(history);
        });
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}

public record CreateUptimeCheckDto(string Name, string Target, string Protocol, int? Port, int CheckIntervalSeconds);
public record UpdateUptimeCheckDto(string? Name, string? Target, string? Protocol, int? Port, int? CheckIntervalSeconds, bool? IsActive);
