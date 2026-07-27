using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller responsável por gerenciar deploys automatizados via repositórios Git locais.
/// </summary>
[ApiController]
[Route("api/git")]
[Produces("application/json")]
public class GitDeployController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<GitDeployController> _logger;

    public GitDeployController(AppDbContext context, IServiceProvider serviceProvider, ILogger<GitDeployController> logger)
    {
        _context = context;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    /// <summary>
    /// Lista os repositórios Git cadastrados no painel.
    /// </summary>
    [Authorize]
    [HttpGet("repositories")]
    public async Task<IActionResult> GetRepositories()
    {
        var repos = await _context.GitRepositories.ToListAsync();
        return Ok(repos);
    }

    /// <summary>
    /// Cadastra um repositório Git local.
    /// </summary>
    [Authorize]
    [HttpPost("repositories")]
    public async Task<IActionResult> CreateRepository([FromBody] CreateGitRepositoryDto dto)
    {
        var webhookToken = Guid.NewGuid().ToString("N");
        var repo = new GitRepository
        {
            Name = dto.Name,
            LocalPath = dto.LocalPath,
            Branch = dto.Branch ?? "main",
            WebhookToken = webhookToken,
            PostDeployCmd = dto.PostDeployCmd,
            LastDeployStatus = "Never"
        };

        _context.GitRepositories.Add(repo);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetRepositories), new { id = repo.Id }, repo);
    }

    /// <summary>
    /// Exclui o cadastro de um repositório.
    /// </summary>
    [Authorize]
    [HttpDelete("repositories/{id}")]
    public async Task<IActionResult> DeleteRepository(int id)
    {
        var repo = await _context.GitRepositories.FindAsync(id);
        if (repo == null) return NotFound(new { message = "Repositório não encontrado." });

        _context.GitRepositories.Remove(repo);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Repositório removido com sucesso." });
    }

    /// <summary>
    /// Executa o deploy manualmente de um repositório.
    /// </summary>
    [Authorize]
    [HttpPost("repositories/{id}/deploy")]
    public async Task<IActionResult> TriggerManualDeploy(int id)
    {
        var repo = await _context.GitRepositories.FindAsync(id);
        if (repo == null) return NotFound(new { message = "Repositório não encontrado." });

        // Executa em segundo plano para não travar a requisição HTTP
        _ = Task.Run(() => RunDeployAsync(repo.Id));

        return Ok(new { message = "Deploy manual iniciado." });
    }

    /// <summary>
    /// Webhook público para automação via GitHub/GitLab (sem autenticação JWT).
    /// </summary>
    [AllowAnonymous]
    [HttpPost("webhook/{token}")]
    public async Task<IActionResult> WebhookDeploy(string token)
    {
        var repo = await _context.GitRepositories.FirstOrDefaultAsync(r => r.WebhookToken == token);
        if (repo == null) return NotFound(new { message = "Token de webhook inválido." });

        // Executa em segundo plano
        _ = Task.Run(() => RunDeployAsync(repo.Id));

        return Ok(new { message = "Deploy por webhook agendado." });
    }

    private async Task RunDeployAsync(int repoId)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var repo = await context.GitRepositories.FindAsync(repoId);
        if (repo == null) return;

        var logWriter = new StringWriter();
        logWriter.WriteLine($"=== DEPLOY INICIADO EM {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss UTC} ===");
        logWriter.WriteLine($"Diretório Local: {repo.LocalPath}");
        logWriter.WriteLine($"Branch: {repo.Branch}");

        bool success = true;

        try
        {
            if (!Directory.Exists(repo.LocalPath))
            {
                throw new DirectoryNotFoundException($"Diretório local não encontrado: {repo.LocalPath}");
            }

            // 1. Executar Git Pull
            logWriter.WriteLine("\n--- Executando: git checkout & pull ---");
            var gitCheck = await RunCommandAsync("git", $"checkout {repo.Branch}", repo.LocalPath);
            logWriter.WriteLine(gitCheck.output);
            if (gitCheck.exitCode != 0)
            {
                throw new Exception($"Erro no git checkout (Exit Code {gitCheck.exitCode}): {gitCheck.error}");
            }

            var gitPull = await RunCommandAsync("git", "pull", repo.LocalPath);
            logWriter.WriteLine(gitPull.output);
            if (gitPull.exitCode != 0)
            {
                throw new Exception($"Erro no git pull (Exit Code {gitPull.exitCode}): {gitPull.error}");
            }

            // 2. Executar Comando pós-deploy
            if (!string.IsNullOrEmpty(repo.PostDeployCmd))
            {
                logWriter.WriteLine("\n--- Executando Comando Pós-Deploy ---");
                logWriter.WriteLine($"Comando: {repo.PostDeployCmd}");
                
                var cmdName = RuntimeInformation.IsOSPlatform(OSPlatform.Windows) ? "cmd.exe" : "/bin/sh";
                var cmdArgs = RuntimeInformation.IsOSPlatform(OSPlatform.Windows) 
                    ? $"/c {repo.PostDeployCmd}" 
                    : $"-c \"{repo.PostDeployCmd}\"";

                var postDeploy = await RunCommandAsync(cmdName, cmdArgs, repo.LocalPath);
                logWriter.WriteLine(postDeploy.output);
                if (postDeploy.exitCode != 0)
                {
                    throw new Exception($"Erro no comando pós-deploy (Exit Code {postDeploy.exitCode}): {postDeploy.error}");
                }
            }

            repo.LastDeployStatus = "Success";
            logWriter.WriteLine("\n=== DEPLOY CONCLUÍDO COM SUCESSO ===");
        }
        catch (Exception ex)
        {
            success = false;
            repo.LastDeployStatus = "Failed";
            logWriter.WriteLine($"\nFALHA NO DEPLOY: {ex.Message}");
            _logger.LogError(ex, $"Deploy failed for repo {repo.Name}");
        }
        finally
        {
            repo.LastDeployTime = DateTime.UtcNow;
            repo.LastDeployLog = logWriter.ToString();

            context.Entry(repo).State = EntityState.Modified;
            await context.SaveChangesAsync();
        }
    }

    private async Task<(int exitCode, string output, string error)> RunCommandAsync(string fileName, string arguments, string workingDirectory)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var process = Process.Start(startInfo);
        if (process == null) return (-1, "", "Falha ao iniciar o processo.");

        await process.WaitForExitAsync();
        var output = await process.StandardOutput.ReadToEndAsync();
        var error = await process.StandardError.ReadToEndAsync();

        return (process.ExitCode, output, error);
    }
}

public record CreateGitRepositoryDto(
    string Name,
    string LocalPath,
    string? Branch,
    string? PostDeployCmd
);
