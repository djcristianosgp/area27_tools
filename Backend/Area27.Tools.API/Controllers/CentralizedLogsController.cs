using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Docker.DotNet;
using Docker.DotNet.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller responsável pela centralização, pesquisa e consulta de logs do sistema.
/// </summary>
[Authorize]
[ApiController]
[Route("api/logs")]
[Produces("application/json")]
public class CentralizedLogsController : ControllerBase
{
    private readonly AppDbContext _context;

    public CentralizedLogsController(AppDbContext context)
    {
        _context = context;
    }

    private DockerClient CreateDockerClient()
    {
        var isWindows = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
        var dockerUri = isWindows ? "npipe://./pipe/docker_engine" : "unix:///var/run/docker.sock";
        var config = new DockerClientConfiguration(new Uri(dockerUri));
        return config.CreateClient();
    }

    /// <summary>
    /// Obtém todas as fontes de logs cadastradas.
    /// </summary>
    [HttpGet("sources")]
    public async Task<IActionResult> GetSources()
    {
        var sources = await _context.LogSources.ToListAsync();
        return Ok(sources);
    }

    /// <summary>
    /// Cadastra uma nova fonte de logs (Arquivo local, Docker, Journalctl).
    /// </summary>
    [HttpPost("sources")]
    public async Task<IActionResult> CreateSource([FromBody] CreateLogSourceDto dto)
    {
        var source = new LogSource
        {
            Name = dto.Name,
            Type = dto.Type,
            Path = dto.Path
        };

        _context.LogSources.Add(source);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSources), new { id = source.Id }, source);
    }

    /// <summary>
    /// Remove uma fonte de logs pelo ID.
    /// </summary>
    [HttpDelete("sources/{id}")]
    public async Task<IActionResult> DeleteSource(int id)
    {
        var source = await _context.LogSources.FindAsync(id);
        if (source == null) return NotFound(new { message = "Fonte de logs não encontrada." });

        _context.LogSources.Remove(source);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Fonte de logs removida com sucesso." });
    }

    /// <summary>
    /// Consulta os logs de uma determinada fonte com filtros.
    /// </summary>
    [HttpGet("query")]
    public async Task<IActionResult> QueryLogs(
        [FromQuery] int sourceId,
        [FromQuery] string? query = null,
        [FromQuery] string? severity = null,
        [FromQuery] int limit = 100)
    {
        var source = await _context.LogSources.FindAsync(sourceId);
        if (source == null) return NotFound(new { message = "Fonte de logs não encontrada." });

        try
        {
            List<string> lines = new List<string>();

            if (source.Type.Equals("File", StringComparison.OrdinalIgnoreCase))
            {
                lines = await QueryFileLogsAsync(source.Path, limit);
            }
            else if (source.Type.Equals("Docker", StringComparison.OrdinalIgnoreCase))
            {
                lines = await QueryDockerLogsAsync(source.Path, limit);
            }
            else if (source.Type.Equals("Journal", StringComparison.OrdinalIgnoreCase))
            {
                lines = await QueryJournalLogsAsync(limit);
            }

            // Aplicar filtros de pesquisa e severidade em memória
            var filtered = lines.AsEnumerable();

            if (!string.IsNullOrEmpty(query))
            {
                filtered = filtered.Where(l => l.Contains(query, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrEmpty(severity))
            {
                filtered = filtered.Where(l => l.Contains(severity, StringComparison.OrdinalIgnoreCase));
            }

            return Ok(filtered.Take(limit).ToList());
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Erro ao ler logs: {ex.Message}" });
        }
    }

    private async Task<List<string>> QueryFileLogsAsync(string filePath, int limit)
    {
        if (!System.IO.File.Exists(filePath))
        {
            throw new FileNotFoundException($"Arquivo de log não encontrado: {filePath}");
        }

        // Lê as últimas linhas do arquivo de forma segura
        var lines = new List<string>();
        using (var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
        using (var sr = new StreamReader(fs))
        {
            string? line;
            while ((line = await sr.ReadLineAsync()) != null)
            {
                lines.Add(line);
            }
        }

        if (lines.Count > limit)
        {
            return lines.Skip(lines.Count - limit).ToList();
        }
        return lines;
    }

    private async Task<List<string>> QueryDockerLogsAsync(string containerIdOrName, int limit)
    {
        using var client = CreateDockerClient();
        var logParams = new ContainerLogsParameters
        {
            ShowStdout = true,
            ShowStderr = true,
            Tail = limit.ToString(),
            Timestamps = true
        };

        using var stream = await client.Containers.GetContainerLogsAsync(containerIdOrName, false, logParams);
        var (stdout, stderr) = await stream.ReadOutputToEndAsync(default);

        var lines = new List<string>();
        if (!string.IsNullOrEmpty(stdout))
        {
            lines.AddRange(stdout.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries));
        }
        if (!string.IsNullOrEmpty(stderr))
        {
            lines.AddRange(stderr.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries));
        }

        return lines.OrderBy(l => l).TakeLast(limit).ToList();
    }

    private async Task<List<string>> QueryJournalLogsAsync(int limit)
    {
        var lines = new List<string>();

        if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = "journalctl",
                Arguments = $"-n {limit} --no-pager",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(startInfo);
            if (process != null)
            {
                await process.WaitForExitAsync();
                var output = await process.StandardOutput.ReadToEndAsync();
                lines.AddRange(output.Split(new[] { "\n" }, StringSplitOptions.RemoveEmptyEntries));
            }
        }
        else
        {
            // Simulação de logs no Windows
            var now = DateTime.UtcNow;
            lines.Add($"[{now:yyyy-MM-dd HH:mm:ss}] [INFO] [System] Windows Journalctl simulator active.");
            lines.Add($"[{now:yyyy-MM-dd HH:mm:ss}] [INFO] [Kernel] Inicializando subsistema de virtualização de logs.");
            lines.Add($"[{now:yyyy-MM-dd HH:mm:ss}] [WARNING] [Disk] Disco C: atingiu 82% de ocupação.");
            lines.Add($"[{now:yyyy-MM-dd HH:mm:ss}] [ERROR] [Network] Falha ao resolver DNS primário 1.1.1.1 temporariamente.");
            lines.Add($"[{now:yyyy-MM-dd HH:mm:ss}] [INFO] [Security] Logon efetuado com sucesso para usuário: admin.");
        }

        return lines;
    }
}

public record CreateLogSourceDto(
    string Name,
    string Type, // "File", "Docker", "Journal"
    string Path
);
