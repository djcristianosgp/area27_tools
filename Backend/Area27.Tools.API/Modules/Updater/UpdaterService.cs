using System.Reflection;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Area27.Tools.API.Modules.Updater;

/// <summary>
/// Result of an update check against GitHub Releases.
/// </summary>
public record UpdateCheckResult(
    string CurrentVersion,
    string LatestVersion,
    bool UpdateAvailable,
    string? ChangelogUrl,
    string? ReleaseNotes,
    string? PublishedAt
);

/// <summary>
/// Service responsible for checking for new releases on GitHub
/// and optionally triggering a self-update of the backend.
/// </summary>
public class UpdaterService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<UpdaterService> _logger;

    private static readonly string CurrentVersion =
        Assembly.GetExecutingAssembly()
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion
            ?.Split('+')[0]  // strip git hash suffix if present
        ?? "1.0.0";

    public UpdaterService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<UpdaterService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Returns the current running version of the backend.
    /// </summary>
    public string GetCurrentVersion() => CurrentVersion;

    /// <summary>
    /// Queries the GitHub Releases API and compares with the current version.
    /// </summary>
    public async Task<UpdateCheckResult> CheckForUpdateAsync(CancellationToken ct = default)
    {
        var owner = _configuration["Updater:GitHubOwner"] ?? "";
        var repo  = _configuration["Updater:GitHubRepo"] ?? "";

        if (string.IsNullOrWhiteSpace(owner) || string.IsNullOrWhiteSpace(repo))
        {
            _logger.LogWarning("Updater: GitHubOwner or GitHubRepo not configured — skipping check.");
            return new UpdateCheckResult(CurrentVersion, CurrentVersion, false, null, null, null);
        }

        try
        {
            var client = _httpClientFactory.CreateClient("Updater");
            var url = $"https://api.github.com/repos/{owner}/{repo}/releases/latest";
            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("User-Agent", "Area27Tools-Updater/1.0");

            using var response = await client.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Updater: GitHub API returned {StatusCode}", response.StatusCode);
                return new UpdateCheckResult(CurrentVersion, CurrentVersion, false, null, null, null);
            }

            var json = await response.Content.ReadAsStringAsync(ct);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var latestTag   = root.GetProperty("tag_name").GetString() ?? CurrentVersion;
            var latestVer   = latestTag.TrimStart('v');
            var changelogUrl = root.TryGetProperty("html_url", out var htmlUrl)
                ? htmlUrl.GetString() : null;
            var releaseNotes = root.TryGetProperty("body", out var body)
                ? body.GetString() : null;
            var publishedAt  = root.TryGetProperty("published_at", out var pub)
                ? pub.GetString() : null;

            var updateAvailable = IsNewerVersion(latestVer, CurrentVersion);

            _logger.LogInformation(
                "Updater: current={Current}, latest={Latest}, update={Update}",
                CurrentVersion, latestVer, updateAvailable);

            return new UpdateCheckResult(
                CurrentVersion, latestVer, updateAvailable,
                changelogUrl, releaseNotes, publishedAt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Updater: failed to check for updates");
            return new UpdateCheckResult(CurrentVersion, CurrentVersion, false, null, null, null);
        }
    }

    /// <summary>
    /// Returns basic system info: version, environment, and uptime.
    /// </summary>
    public SystemInfo GetSystemInfo()
    {
        var uptime = DateTime.UtcNow - System.Diagnostics.Process.GetCurrentProcess().StartTime.ToUniversalTime();
        return new SystemInfo(
            CurrentVersion,
            Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
            (long)uptime.TotalSeconds,
            Environment.MachineName,
            Environment.OSVersion.ToString(),
            _configuration["DatabaseProvider"]?.ToLowerInvariant() == "postgresql" ? "PostgreSQL" : "SQLite"
        );
    }

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------

    private static bool IsNewerVersion(string latest, string current)
    {
        if (!Version.TryParse(latest, out var latestVer))  return false;
        if (!Version.TryParse(current, out var currentVer)) return false;
        return latestVer > currentVer;
    }
}

/// <summary>
/// General system information returned by the /info endpoint.
/// </summary>
public record SystemInfo(
    string Version,
    string Environment,
    long UptimeSeconds,
    string MachineName,
    string OsVersion,
    string DatabaseProvider
);
