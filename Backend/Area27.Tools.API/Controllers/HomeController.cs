using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Area27.Tools.API.Controllers;

/// <summary>
/// Controller base para checagem básica da saúde da API.
/// </summary>
[ApiController]
[Route("")]
[Produces("application/json")]
public class HomeController : ControllerBase
{
    /// <summary>
    /// Retorna o status de funcionamento da API.
    /// </summary>
    /// <returns>Objeto contendo o nome da aplicação e o status atual.</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Index()
    {
        return Ok(new { app = "Area27 Tools API", status = "Running" });
    }
}
