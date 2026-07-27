using System;
using System.Collections.Generic;
using System.Linq;
using Area27.Tools.Core.Modules;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Area27.Tools.API.Modules.GitDeploy;

public class GitDeployModule : IToolModule
{
    public string Id => "git-deploy";
    public string Name => "Git & Deploy Automatizado";
    public string Description => "Gerenciamento de repositórios locais e deploys por webhook git pull.";
    public string Icon => "GitBranch";

    public void RegisterServices(IServiceCollection services)
    {
    }

    public void RegisterRoutes(IEndpointRouteBuilder endpoints)
    {
        // Handled by Controllers (GitDeployController)
    }

    public IEnumerable<IHostedService> GetBackgroundServices()
    {
        return Enumerable.Empty<IHostedService>();
    }
}
