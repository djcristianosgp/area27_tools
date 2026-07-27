using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using Area27.Tools.Core.Entities;
using Area27.Tools.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Area27.Tools.API.Modules.NetworkScanner;

public class NetworkScannerService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NetworkScannerService> _logger;
    private static bool _isScanning = false;

    [DllImport("iphlpapi.dll", ExactSpelling = true)]
    private static extern int SendARP(uint destIp, uint srcIp, byte[] macAddr, ref uint physicalAddrLen);

    public NetworkScannerService(IServiceScopeFactory scopeFactory, ILogger<NetworkScannerService> _logger)
    {
        this._scopeFactory = scopeFactory;
        this._logger = _logger;
    }

    public bool IsScanning => _isScanning;

    public async Task ScanNetworkAsync()
    {
        if (_isScanning) return;
        _isScanning = true;

        try
        {
            _logger.LogInformation("Iniciando escaneamento de rede local...");
            var localIp = GetLocalIPv4Address();
            if (localIp == null)
            {
                _logger.LogWarning("Não foi possível determinar o IP local.");
                return;
            }

            var baseIp = string.Join(".", localIp.ToString().Split('.').Take(3)) + ".";
            _logger.LogInformation("Varrendo sub-rede: {Subnet}0/24", baseIp);

            var tasks = Enumerable.Range(1, 254).Select(async i =>
            {
                var ipStr = baseIp + i;
                return await ScanDeviceAsync(ipStr);
            });

            var results = (await Task.WhenAll(tasks)).Where(r => r != null).Cast<NetworkDevice>().ToList();

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var existingDevices = await db.NetworkDevices.ToListAsync();

            // Set all existing devices to offline first
            foreach (var dev in existingDevices)
            {
                dev.IsOnline = false;
            }

            foreach (var scanned in results)
            {
                var match = existingDevices.FirstOrDefault(d => d.IpAddress == scanned.IpAddress);
                if (match != null)
                {
                    match.IsOnline = true;
                    match.LatencyMs = scanned.LatencyMs;
                    match.LastSeen = DateTime.UtcNow;
                    if (!string.IsNullOrEmpty(scanned.MacAddress)) match.MacAddress = scanned.MacAddress;
                    if (!string.IsNullOrEmpty(scanned.Hostname)) match.Hostname = scanned.Hostname;
                    if (!string.IsNullOrEmpty(scanned.Vendor)) match.Vendor = scanned.Vendor;
                }
                else
                {
                    scanned.LastSeen = DateTime.UtcNow;
                    db.NetworkDevices.Add(scanned);
                }
            }

            await db.SaveChangesAsync();
            _logger.LogInformation("Escaneamento de rede concluído. {Count} dispositivos ativos encontrados.", results.Count(r => r.IsOnline));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro durante escaneamento de rede.");
        }
        finally
        {
            _isScanning = false;
        }
    }

    private async Task<NetworkDevice?> ScanDeviceAsync(string ipStr)
    {
        using var ping = new Ping();
        try
        {
            var reply = await ping.SendPingAsync(ipStr, 250); // 250ms timeout
            if (reply.Status == IPStatus.Success)
            {
                string? hostname = null;
                try
                {
                    var entry = await Dns.GetHostEntryAsync(ipStr);
                    hostname = entry.HostName;
                }
                catch {}

                string? mac = GetMacAddress(ipStr);
                string? vendor = mac != null ? ResolveMacVendor(mac) : null;

                return new NetworkDevice
                {
                    IpAddress = ipStr,
                    MacAddress = mac,
                    Hostname = hostname,
                    Vendor = vendor,
                    LatencyMs = reply.RoundtripTime,
                    IsOnline = true,
                    LastSeen = DateTime.UtcNow
                };
            }
        }
        catch {}
        return null;
    }

    private IPAddress? GetLocalIPv4Address()
    {
        try
        {
            var host = Dns.GetHostEntry(Dns.GetHostName());
            return host.AddressList.FirstOrDefault(ip => ip.AddressFamily == AddressFamily.InterNetwork && !IPAddress.IsLoopback(ip));
        }
        catch
        {
            // Fallback via network interfaces
            return NetworkInterface.GetAllNetworkInterfaces()
                .Where(n => n.OperationalStatus == OperationalStatus.Up && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                .SelectMany(n => n.GetIPProperties().UnicastAddresses)
                .FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork)?.Address;
        }
    }

    private string? GetMacAddress(string ipAddress)
    {
        if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
        {
            try
            {
                if (IPAddress.TryParse(ipAddress, out var parsedIp))
                {
                    #pragma warning disable CS0618
                    uint destIp = BitConverter.ToUInt32(parsedIp.GetAddressBytes(), 0);
                    #pragma warning restore CS0618
                    byte[] macAddr = new byte[6];
                    uint macAddrLen = (uint)macAddr.Length;
                    if (SendARP(destIp, 0, macAddr, ref macAddrLen) == 0)
                    {
                        return string.Join(":", macAddr.Select(b => b.ToString("X2")));
                    }
                }
            }
            catch {}
        }
        else
        {
            try
            {
                if (File.Exists("/proc/net/arp"))
                {
                    var lines = File.ReadAllLines("/proc/net/arp");
                    foreach (var line in lines.Skip(1))
                    {
                        var parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
                        if (parts.Length >= 4 && parts[0] == ipAddress)
                        {
                            var mac = parts[3];
                            if (mac != "00:00:00:00:00:00")
                            {
                                return mac.ToUpper();
                            }
                        }
                    }
                }
            }
            catch {}
        }
        return null;
    }

    private string? ResolveMacVendor(string mac)
    {
        // Simple OUI prefix resolver or generic vendor
        if (mac.StartsWith("00:15:5D", StringComparison.OrdinalIgnoreCase)) return "Microsoft Hyper-V";
        if (mac.StartsWith("00:0C:29", StringComparison.OrdinalIgnoreCase) || mac.StartsWith("00:50:56", StringComparison.OrdinalIgnoreCase)) return "VMware";
        if (mac.StartsWith("08:00:27", StringComparison.OrdinalIgnoreCase)) return "VirtualBox";
        if (mac.StartsWith("00:11:32", StringComparison.OrdinalIgnoreCase)) return "Synology";
        if (mac.StartsWith("B8:27:EB", StringComparison.OrdinalIgnoreCase) || mac.StartsWith("D8:3A:DD", StringComparison.OrdinalIgnoreCase)) return "Raspberry Pi";
        return null;
    }

    public void SendWakeOnLan(string macAddress)
    {
        byte[] macBytes = macAddress.Split(new[] { ':', '-' })
                                    .Select(s => Convert.ToByte(s, 16))
                                    .ToArray();

        byte[] packet = new byte[6 + 16 * macBytes.Length];
        for (int i = 0; i < 6; i++) packet[i] = 0xFF;
        for (int i = 0; i < 16; i++)
        {
            Array.Copy(macBytes, 0, packet, 6 + i * macBytes.Length, macBytes.Length);
        }

        using var client = new UdpClient();
        client.Connect(IPAddress.Broadcast, 9);
        client.Send(packet, packet.Length);
    }
}
