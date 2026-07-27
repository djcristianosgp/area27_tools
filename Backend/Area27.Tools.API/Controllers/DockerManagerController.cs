using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Docker.DotNet;
using Docker.DotNet.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller responsável pelo gerenciamento de contêineres Docker locais.
/// </summary>
[Authorize]
[ApiController]
[Route("api/docker")]
[Produces("application/json")]
public class DockerManagerController : ControllerBase
{
    private DockerClient CreateDockerClient()
    {
        var isWindows = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
        var dockerUri = isWindows ? "npipe://./pipe/docker_engine" : "unix:///var/run/docker.sock";
        var config = new DockerClientConfiguration(new Uri(dockerUri));
        return config.CreateClient();
    }

    /// <summary>
    /// Lista todos os contêineres Docker locais.
    /// </summary>
    [HttpGet("containers")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetContainers()
    {
        try
        {
            using var client = CreateDockerClient();
            var containers = await client.Containers.ListContainersAsync(new ContainersListParameters { All = true });
            
            var result = containers.Select(c => new
            {
                id = c.ID,
                name = c.Names.FirstOrDefault()?.TrimStart('/'),
                image = c.Image,
                state = c.State,
                status = c.Status,
                ports = c.Ports.Select(p => new { privatePort = p.PrivatePort, publicPort = p.PublicPort, type = p.Type }),
                created = c.Created
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Erro ao acessar Docker daemon: " + ex.Message });
        }
    }

    /// <summary>
    /// Inicia um contêiner pelo ID.
    /// </summary>
    [HttpPost("containers/{id}/start")]
    public async Task<IActionResult> StartContainer(string id)
    {
        try
        {
            using var client = CreateDockerClient();
            await client.Containers.StartContainerAsync(id, new ContainerStartParameters());
            return Ok(new { message = "Contêiner iniciado com sucesso." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Para um contêiner pelo ID.
    /// </summary>
    [HttpPost("containers/{id}/stop")]
    public async Task<IActionResult> StopContainer(string id)
    {
        try
        {
            using var client = CreateDockerClient();
            await client.Containers.StopContainerAsync(id, new ContainerStopParameters { WaitBeforeKillSeconds = 10 });
            return Ok(new { message = "Contêiner parado com sucesso." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Reinicia um contêiner pelo ID.
    /// </summary>
    [HttpPost("containers/{id}/restart")]
    public async Task<IActionResult> RestartContainer(string id)
    {
        try
        {
            using var client = CreateDockerClient();
            await client.Containers.RestartContainerAsync(id, new ContainerRestartParameters());
            return Ok(new { message = "Contêiner reiniciado com sucesso." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Obtém os últimos logs do contêiner.
    /// </summary>
    [HttpGet("containers/{id}/logs")]
    public async Task<IActionResult> GetContainerLogs(string id, [FromQuery] int tail = 200)
    {
        try
        {
            using var client = CreateDockerClient();
            var logParams = new ContainerLogsParameters
            {
                ShowStdout = true,
                ShowStderr = true,
                Tail = tail.ToString(),
                Timestamps = false
            };

            using var stream = await client.Containers.GetContainerLogsAsync(id, false, logParams);
            var (stdout, stderr) = await stream.ReadOutputToEndAsync(default);
            
            var logs = new List<string>();
            if (!string.IsNullOrEmpty(stdout))
            {
                logs.AddRange(stdout.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None));
            }
            if (!string.IsNullOrEmpty(stderr))
            {
                logs.AddRange(stderr.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None));
            }

            return Ok(logs);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
