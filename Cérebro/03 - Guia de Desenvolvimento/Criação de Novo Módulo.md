# Guia: Criação de Novo Módulo

Este documento orienta detalhadamente como criar e acoplar um novo módulo ao ecossistema do **Area27 Tools**.

---

## 🛠️ Passo 1: Implementação no Backend

1. Crie uma pasta para o seu módulo em `Backend/Area27.Tools.Modules/[NomeDoModulo]`.
2. Crie a classe do módulo herdando e implementando `IToolModule`:

```csharp
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace Area27.Tools.Modules.MeuModulo;

public class MeuModulo : IToolModule
{
    public string Id => "meu-modulo";
    public string Name => "Meu Novo Módulo";
    public string Description => "Módulo de exemplo de integração.";
    public string Icon => "Cpu"; // Ícone do Lucide React

    public void RegisterServices(IServiceCollection services, IConfiguration configuration)
    {
        // Registre seus serviços e repositórios locais aqui
        services.AddScoped<IMeuServico, MeuServico>();
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/meu-modulo").WithTags("MeuModulo");

        group.MapGet("/", async (IMeuServico servico) => 
        {
            return Results.Ok(await servico.ObterDadosAsync());
        });
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        // Retorne Workers de background se houver checagens periódicas
        yield return new MeuModuloWorker();
    }
}
```

3. Registre o módulo na lista de inicialização do `Program.cs`:

```csharp
builder.Services.AddModule<Area27.Tools.Modules.MeuModulo.MeuModulo>();
```

---

## 💻 Passo 2: Implementação no Frontend

1. Crie a pasta da funcionalidade em `src/features/meu-modulo`.
2. Crie uma view principal (ex: `MeuModuloPage.tsx`) e um componente de widget (ex: `MeuModuloWidget.tsx`).
3. Adicione a rota no gerenciador de rotas em `src/routes.tsx`:

```tsx
{
  path: "/meu-modulo",
  element: <MeuModuloPage />
}
```

4. Cadastre o widget na listagem de widgets no painel principal:
```tsx
// Exemplo no catálogo de widgets
{
  id: "meu-modulo-widget",
  name: "Resumo do Meu Módulo",
  component: <MeuModuloWidget />,
  defaultSize: { w: 2, h: 2 }
}
```
