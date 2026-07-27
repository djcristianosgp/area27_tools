using System.Collections.Generic;
using Area27.Tools.API.Modules.ServerMetrics;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller responsável por expor as métricas de hardware e temperatura do servidor.
/// </summary>
[Authorize]
[ApiController]
[Route("api/server-metrics")]
[Produces("application/json")]
public class ServerMetricsController : ControllerBase
{
    private readonly SystemMetricsProvider _metricsProvider;
    private readonly ServerMetricsBackgroundService _metricsService;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="ServerMetricsController"/>.
    /// </summary>
    public ServerMetricsController(SystemMetricsProvider metricsProvider, ServerMetricsBackgroundService metricsService)
    {
        _metricsProvider = metricsProvider;
        _metricsService = metricsService;
    }

    /// <summary>
    /// Obtém as métricas de hardware atuais (CPU, RAM, Disco e Temperatura).
    /// </summary>
    /// <response code="200">Métricas atuais lidas com sucesso.</response>
    [HttpGet("current")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetCurrentMetrics()
    {
        var cpu = _metricsProvider.GetCpuUsage();
        var ram = _metricsProvider.GetRamUsage();
        var disk = _metricsProvider.GetDiskUsage();
        var temp = _metricsProvider.GetTemperature();

        return Ok(new
        {
            cpuUsage = cpu,
            ramTotalBytes = ram.TotalBytes,
            ramUsedBytes = ram.UsedBytes,
            diskTotalBytes = disk.TotalBytes,
            diskUsedBytes = disk.UsedBytes,
            temperature = temp
        });
    }

    /// <summary>
    /// Obtém a série temporal das últimas 15 coletas de CPU e RAM para gráficos históricos.
    /// </summary>
    /// <response code="200">Histórico de métricas lido com sucesso.</response>
    [HttpGet("history")]
    [ProducesResponseType(typeof(IEnumerable<ServerMetricHistoryPoint>), StatusCodes.Status200OK)]
    public IActionResult GetMetricsHistory()
    {
        var history = _metricsService.GetHistory();
        return Ok(history);
    }
}
