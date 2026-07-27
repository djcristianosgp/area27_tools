using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Area27.Tools.API.Modules.SslDns;

public class SslCheckerService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SslCheckerService> _logger;
    private readonly HttpClient _httpClient;

    public SslCheckerService(IServiceScopeFactory scopeFactory, ILogger<SslCheckerService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/dns-json");
    }

    public async Task CheckAllCertificatesAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var domains = await db.SslDomains.ToListAsync();

        _logger.LogInformation("Verificando expiração de certificados para {Count} domínios...", domains.Count);

        foreach (var domain in domains)
        {
            await CheckCertificateAsync(domain);
        }

        await db.SaveChangesAsync();
        _logger.LogInformation("Verificação de certificados concluída.");
    }

    public async Task CheckCertificateAsync(SslDomain domain)
    {
        try
        {
            using var tcpClient = new TcpClient();
            
            // Connect with timeout
            var connectTask = tcpClient.ConnectAsync(domain.Domain, domain.Port);
            var delayTask = Task.Delay(5000); // 5s timeout
            
            var completedTask = await Task.WhenAny(connectTask, delayTask);
            if (completedTask == delayTask)
            {
                throw new TimeoutException($"Tempo limite esgotado ao conectar a {domain.Domain}:{domain.Port}");
            }

            // Await connection to propagate potential connection exceptions
            await connectTask;

            using var sslStream = new SslStream(tcpClient.GetStream(), false, 
                (sender, certificate, chain, sslPolicyErrors) => true); // accept invalid for verification

            await sslStream.AuthenticateAsClientAsync(domain.Domain);

            var serverCertificate = sslStream.RemoteCertificate;
            if (serverCertificate == null)
            {
                throw new InvalidOperationException("Não foi possível obter o certificado remoto.");
            }

            using var x509 = new X509Certificate2(serverCertificate);

            domain.Issuer = x509.Issuer;
            domain.ExpirationDate = x509.NotAfter;
            domain.IsValid = x509.NotAfter > DateTime.UtcNow;
            domain.ErrorMessage = null;
            domain.LastChecked = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Falha ao checar certificado SSL para {Domain}", domain.Domain);
            domain.IsValid = false;
            domain.ErrorMessage = ex.Message;
            domain.LastChecked = DateTime.UtcNow;
        }
    }

    public async Task<DnsResolveResponse?> ResolveDnsAsync(string domain, string recordType)
    {
        try
        {
            var url = $"https://cloudflare-dns.com/dns-query?name={Uri.EscapeDataString(domain)}&type={Uri.EscapeDataString(recordType)}";
            var response = await _httpClient.GetFromJsonAsync<DnsResolveResponse>(url);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro resolvendo DNS para {Domain} do tipo {Type}", domain, recordType);
            return null;
        }
    }
}

// Dns Models matching Cloudflare DNS JSON format
public class DnsResolveResponse
{
    [JsonPropertyName("Status")]
    public int Status { get; set; }

    [JsonPropertyName("TC")]
    public bool Truncated { get; set; }

    [JsonPropertyName("RD")]
    public bool RecursionDesired { get; set; }

    [JsonPropertyName("RA")]
    public bool RecursionAvailable { get; set; }

    [JsonPropertyName("AD")]
    public bool AuthenticatedData { get; set; }

    [JsonPropertyName("CD")]
    public bool CheckingDisabled { get; set; }

    [JsonPropertyName("Question")]
    public List<DnsQuestion>? Question { get; set; }

    [JsonPropertyName("Answer")]
    public List<DnsAnswer>? Answer { get; set; }
}

public class DnsQuestion
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public int Type { get; set; }
}

public class DnsAnswer
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public int Type { get; set; }

    [JsonPropertyName("TTL")]
    public int Ttl { get; set; }

    [JsonPropertyName("data")]
    public string Data { get; set; } = string.Empty;
}
