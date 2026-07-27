using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Area27.Tools.API.Services;

/// <summary>
/// Singleton service that manages Rock10 API authentication (JWT token cache)
/// and provides typed access to the Rock10 REST API.
/// </summary>
public sealed class Rock10Service
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<Rock10Service> _logger;

    // Mutable credentials (can be updated at runtime via PUT /rock10/configure)
    private string _baseUrl;
    private string _user;
    private string _pass;

    // JWT cache
    private string? _accessToken;
    private DateTime _tokenExpiresAt = DateTime.MinValue;

    public Rock10Service(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<Rock10Service> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        var section = configuration.GetSection("Rock10");
        _baseUrl = section["BaseUrl"] ?? "https://replay.rock10.com.br/api";
        _user    = section["User"] ?? string.Empty;
        _pass    = section["Pass"] ?? string.Empty;
    }

    public bool HasCredentials => !string.IsNullOrWhiteSpace(_user) && !string.IsNullOrWhiteSpace(_pass);

    public string BaseUrl => _baseUrl;

    /// <summary>Update credentials at runtime (no restart required).</summary>
    public void Configure(string baseUrl, string user, string pass)
    {
        _baseUrl       = baseUrl;
        _user          = user;
        _pass          = pass;
        _accessToken   = null; // invalidate cached token
        _tokenExpiresAt = DateTime.MinValue;
    }

    // ─── Auth ──────────────────────────────────────────────────────────────

    /// <summary>Returns a valid Bearer token, re-authenticating when expired.</summary>
    public async Task<string?> GetTokenAsync()
    {
        if (!HasCredentials) return null;
        if (_accessToken != null && DateTime.UtcNow < _tokenExpiresAt.AddSeconds(-30))
            return _accessToken;

        try
        {
            var client  = _httpClientFactory.CreateClient("Rock10");
            var payload = new { user = _user, pass = _pass };
            var resp    = await client.PostAsJsonAsync($"{_baseUrl}/auth", payload);
            resp.EnsureSuccessStatusCode();
            var auth    = await resp.Content.ReadFromJsonAsync<AuthResponse>();
            _accessToken   = auth?.access_token;
            _tokenExpiresAt = DateTime.UtcNow.AddSeconds(auth?.expires_in ?? 3600);
            return _accessToken;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Rock10 authentication failed: {Msg}", ex.Message);
            return null;
        }
    }

    // ─── Endpoints ─────────────────────────────────────────────────────────

    public async Task<bool> PingAsync()
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Rock10");
            var resp   = await client.GetAsync($"{_baseUrl}/ping");
            return resp.IsSuccessStatusCode;
        }
        catch { return false; }
    }

    public async Task<DashboardStats?> GetDashboardAsync()
    {
        var token = await GetTokenAsync();
        if (token == null) return null;

        try
        {
            var client = BuildAuthClient(token);
            return await client.GetFromJsonAsync<DashboardStats>($"{_baseUrl}/dashboard");
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Rock10 /dashboard failed: {Msg}", ex.Message);
            return null;
        }
    }

    public async Task<List<Rock10Arena>?> GetArenasAsync()
    {
        try
        {
            // /arenas is public (no auth needed for basic fields)
            var client = _httpClientFactory.CreateClient("Rock10");
            return await client.GetFromJsonAsync<List<Rock10Arena>>($"{_baseUrl}/arenas");
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Rock10 /arenas failed: {Msg}", ex.Message);
            return null;
        }
    }

    public async Task<List<Rock10Video>?> GetVideosAsync(string? arenaSlug = null, int limit = 20, int page = 1)
    {
        try
        {
            var client = _httpClientFactory.CreateClient("Rock10");
            var url    = $"{_baseUrl}/videos?limit={limit}&page={page}";
            if (!string.IsNullOrWhiteSpace(arenaSlug)) url += $"&arena_slug={Uri.EscapeDataString(arenaSlug)}";
            return await client.GetFromJsonAsync<List<Rock10Video>>(url);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Rock10 /videos failed: {Msg}", ex.Message);
            return null;
        }
    }

    // ─── Helpers ───────────────────────────────────────────────────────────

    private HttpClient BuildAuthClient(string token)
    {
        var client = _httpClientFactory.CreateClient("Rock10");
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    // ─── DTOs ──────────────────────────────────────────────────────────────

    private sealed class AuthResponse
    {
        public string? access_token  { get; set; }
        public string? refresh_token { get; set; }
        public int     expires_in    { get; set; }
    }
}

// ─── Public DTOs (used by controller) ──────────────────────────────────────

public class DashboardStats
{
    public ArenasStats? Arenas   { get; set; }
    public ArenasStats? Quadras  { get; set; }
    public int          Downloads { get; set; }
    public int          Curtidas  { get; set; }
    public VideosStats? Videos    { get; set; }

    public class ArenasStats
    {
        public int Total { get; set; }
        public int Ativas { get; set; }
    }

    public class VideosStats
    {
        public int Total     { get; set; }
        [JsonPropertyName("ano_atual")]
        public int AnoAtual  { get; set; }
        [JsonPropertyName("mes_atual")]
        public int MesAtual  { get; set; }
    }
}

public class Rock10Arena
{
    public int     Id                  { get; set; }
    public string? Nome                { get; set; }
    public string? Slug                { get; set; }
    public string? Uf                  { get; set; }
    public string? Cidade              { get; set; }
    [JsonPropertyName("logo_url")]
    public string? LogoUrl             { get; set; }
    public bool    Ativo               { get; set; }
    [JsonPropertyName("total_quadras_ativas")]
    public int     TotalQuadrasAtivas  { get; set; }
}

public class Rock10Video
{
    public int      Id          { get; set; }
    public string?  Nome        { get; set; }
    public DateTime? Dthr       { get; set; }
    public string?  Url         { get; set; }
    public string?  Poster      { get; set; }
    public int      Downloads   { get; set; }
    public int      Curtidas    { get; set; }
    [JsonPropertyName("quadra_nome")]
    public string?  QuadraNome  { get; set; }
    [JsonPropertyName("arena_nome")]
    public string?  ArenaNome   { get; set; }
    [JsonPropertyName("arena_slug")]
    public string?  ArenaSlug   { get; set; }
    [JsonPropertyName("is_vertical")]
    public bool     IsVertical  { get; set; }
}
