using System;
using System.Linq;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Core.Modules;
using Area27.Tools.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller responsável por gerenciar o estado dos módulos do sistema.
/// </summary>
[Authorize]
[ApiController]
[Route("api/modules")]
[Produces("application/json")]
public class ModulesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ModuleRegistry _registry;

    /// <summary>
    /// Inicializa uma nova instância de <see cref="ModulesController"/>.
    /// </summary>
    public ModulesController(AppDbContext db, ModuleRegistry registry)
    {
        _db = db;
        _registry = registry;
    }

    /// <summary>
    /// Obtém todos os módulos registrados e seus status atuais (ativo/inativo).
    /// </summary>
    /// <response code="200">Lista de módulos obtida com sucesso.</response>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetModules()
    {
        var dbModules = await _db.Modules.ToListAsync();
        
        var result = _registry.Modules.Select(m => new
        {
            id = m.Id,
            name = m.Name,
            description = m.Description,
            icon = m.Icon,
            isEnabled = dbModules.FirstOrDefault(dm => dm.Id == m.Id)?.IsEnabled ?? true
        });

        return Ok(result);
    }

    /// <summary>
    /// Altera o estado (ativo/inativo) de um módulo específico.
    /// </summary>
    /// <param name="id">Identificador único do módulo.</param>
    /// <response code="200">Estado do módulo alterado com sucesso.</response>
    [HttpPost("{id}/toggle")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ToggleModule([FromRoute] string id)
    {
        var dbModule = await _db.Modules.SingleOrDefaultAsync(m => m.Id == id);
        if (dbModule == null)
        {
            dbModule = new ToolModuleState
            {
                Id = id,
                Name = id,
                IsEnabled = false
            };
            _db.Modules.Add(dbModule);
        }
        else
        {
            dbModule.IsEnabled = !dbModule.IsEnabled;
        }

        await _db.SaveChangesAsync();
        return Ok(new { id = dbModule.Id, isEnabled = dbModule.IsEnabled });
    }
}
