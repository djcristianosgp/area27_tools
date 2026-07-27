# Guia: Criação de Novo Módulo

Este documento orienta detalhadamente como criar e acoplar um novo módulo ao ecossistema do **Area27 Tools**.

---

## 🛠️ Passo 1: Implementação no Backend

1. Crie uma pasta para o seu módulo em `Backend/Area27.Tools.API/Modules/[NomeDoModulo]`.
2. Crie a classe do módulo implementando `IToolModule`:

```csharp
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.MeuModulo;

public class MeuModulo : IToolModule
{
    public string Id          => "meu-modulo";
    public string Name        => "Meu Novo Módulo";
    public string Description => "Módulo de exemplo de integração.";
    public string Icon        => "Cpu"; // Nome do ícone Lucide React

    public void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<IMeuServico, MeuServico>();
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/meu-modulo")
            .RequireAuthorization()
            .WithTags("MeuModulo");

        group.MapGet("/", (IMeuServico servico) => 
        {
            return Results.Ok(servico.ObterDados());
        });
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
        => Enumerable.Empty<IHostedService>();
}
```

3. Registre o módulo no `Program.cs`:

```csharp
builder.Services.AddModuleRegistry(registry =>
{
    // ...
    registry.RegisterModule(new Area27.Tools.API.Modules.MeuModulo.MeuModulo());
});
```

4. Adicione o seed inicial em `Backend/Area27.Tools.Infrastructure/Data/DbInitializer.cs`:

```csharp
new ToolModuleState { Id = "meu-modulo", Name = "Meu Novo Módulo", IsEnabled = true }
```

---

## 💻 Passo 2: Implementação no Frontend

> 💡 **Nota de Arquitetura**: A estrutura do frontend é plana sob `Frontend/area27-ui/src/components/`. Todos os widgets são renderizados diretamente no `Dashboard.tsx`.

1. Crie o componente do widget em `Frontend/area27-ui/src/components/MeuModuloWidget.tsx`.
2. Adicione as chamadas de API usando React Query (`useQuery`) e recupere o token via `useAuthStore`.
3. Registre o widget em `Frontend/area27-ui/src/components/Dashboard.tsx`:
   - Importe `MeuModuloWidget`.
   - Adicione `mod.id === 'meu-modulo'` na checagem `isWidget` do painel de customização.
   - Adicione `{widgetId === 'meu-modulo' && <MeuModuloWidget />}` no grid principal.
