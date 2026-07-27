using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Cronos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller responsável por gerenciar tarefas agendadas e backups.
/// </summary>
[Authorize]
[ApiController]
[Route("api/backup-cron")]
[Produces("application/json")]
public class BackupCronController : ControllerBase
{
    private readonly AppDbContext _context;

    public BackupCronController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lista todas as tarefas agendadas configuradas.
    /// </summary>
    [HttpGet("tasks")]
    public async Task<IActionResult> GetTasks()
    {
        var tasks = await _context.BackupCronTasks.OrderByDescending(t => t.CreatedAt).ToListAsync();
        return Ok(tasks);
    }

    /// <summary>
    /// Cria uma nova tarefa agendada.
    /// </summary>
    [HttpPost("tasks")]
    public async Task<IActionResult> CreateTask([FromBody] CreateBackupCronTaskDto dto)
    {
        try
        {
            // Valida a expressão Cron
            var cron = CronExpression.Parse(dto.CronExpression);
            var nextRun = cron.GetNextOccurrence(DateTime.UtcNow);

            var task = new BackupCronTask
            {
                Name = dto.Name,
                CronExpression = dto.CronExpression,
                BackupType = dto.BackupType,
                SourcePath = dto.SourcePath,
                DestinationType = dto.DestinationType,
                DestinationSettings = dto.DestinationSettings,
                IsActive = true,
                NextRun = nextRun
            };

            _context.BackupCronTasks.Add(task);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTasks), new { id = task.Id }, task);
        }
        catch (CronFormatException ex)
        {
            return BadRequest(new { message = $"Expressão Cron inválida: {ex.Message}" });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Atualiza uma tarefa agendada existente.
    /// </summary>
    [HttpPut("tasks/{id}")]
    public async Task<IActionResult> UpdateTask(int id, [FromBody] UpdateBackupCronTaskDto dto)
    {
        var task = await _context.BackupCronTasks.FindAsync(id);
        if (task == null) return NotFound(new { message = "Tarefa não encontrada." });

        try
        {
            if (dto.Name != null) task.Name = dto.Name;
            if (dto.CronExpression != null)
            {
                var cron = CronExpression.Parse(dto.CronExpression);
                task.CronExpression = dto.CronExpression;
                task.NextRun = cron.GetNextOccurrence(DateTime.UtcNow);
            }
            if (dto.BackupType != null) task.BackupType = dto.BackupType;
            if (dto.SourcePath != null) task.SourcePath = dto.SourcePath;
            if (dto.DestinationType != null) task.DestinationType = dto.DestinationType;
            if (dto.DestinationSettings != null) task.DestinationSettings = dto.DestinationSettings;
            if (dto.IsActive.HasValue)
            {
                task.IsActive = dto.IsActive.Value;
                if (task.IsActive)
                {
                    var cron = CronExpression.Parse(task.CronExpression);
                    task.NextRun = cron.GetNextOccurrence(DateTime.UtcNow);
                }
                else
                {
                    task.NextRun = null;
                }
            }

            _context.Entry(task).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(task);
        }
        catch (CronFormatException ex)
        {
            return BadRequest(new { message = $"Expressão Cron inválida: {ex.Message}" });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = ex.Message });
        }
    }

    /// <summary>
    /// Remove uma tarefa agendada e seus logs associados.
    /// </summary>
    [HttpDelete("tasks/{id}")]
    public async Task<IActionResult> DeleteTask(int id)
    {
        var task = await _context.BackupCronTasks.FindAsync(id);
        if (task == null) return NotFound(new { message = "Tarefa não encontrada." });

        // Remove logs
        var logs = await _context.BackupCronLogs.Where(l => l.TaskId == id).ToListAsync();
        _context.BackupCronLogs.RemoveRange(logs);

        _context.BackupCronTasks.Remove(task);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Tarefa removida com sucesso." });
    }

    /// <summary>
    /// Executa uma tarefa agendada imediatamente em background.
    /// </summary>
    [HttpPost("tasks/{id}/run")]
    public async Task<IActionResult> TriggerTask(int id)
    {
        var task = await _context.BackupCronTasks.FindAsync(id);
        if (task == null) return NotFound(new { message = "Tarefa não encontrada." });

        // Modifica o NextRun para rodar imediatamente (o background worker vai detectar na próxima iteração)
        task.NextRun = DateTime.UtcNow;
        _context.Entry(task).State = EntityState.Modified;
        await _context.SaveChangesAsync();

        return Ok(new { message = "Tarefa enfileirada para execução imediata." });
    }

    /// <summary>
    /// Lista os logs de execuções das tarefas.
    /// </summary>
    [HttpGet("logs")]
    public async Task<IActionResult> GetLogs([FromQuery] int? taskId, [FromQuery] int limit = 100)
    {
        var query = _context.BackupCronLogs.AsQueryable();
        if (taskId.HasValue)
        {
            query = query.Where(l => l.TaskId == taskId.Value);
        }

        var logs = await query.OrderByDescending(l => l.StartTime).Take(limit).ToListAsync();
        return Ok(logs);
    }
}

public record CreateBackupCronTaskDto(
    string Name,
    string CronExpression,
    string BackupType,
    string? SourcePath,
    string DestinationType,
    string? DestinationSettings
);

public record UpdateBackupCronTaskDto(
    string? Name,
    string? CronExpression,
    string? BackupType,
    string? SourcePath,
    string? DestinationType,
    string? DestinationSettings,
    bool? IsActive
);
