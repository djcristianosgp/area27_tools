# Módulos de Monitoramento e Rede

Estes módulos são focados em telemetria em tempo real, conectividade e visualização de dispositivos locais e dispositivos IoT.

---

## 🟢 1. Monitoramento de URLs (Uptime)
Inspirado no *Uptime Kuma*, realiza checagens periódicas de serviços para identificar lentidão ou quedas.

### Funcionalidades
* **Tipos de Checagem**: HTTP(S), Ping (ICMP), TCP Port.
* **Métricas**: Tempo de resposta, histórico de status online/offline.
* **Controller**: `UptimeController.cs` (`/api/uptime`).
* **Widget**: `UptimeWidget.tsx`.

---

## 🖥️ 2. Rede Local (Network Scanner)
Mapeamento ativo e passivo de dispositivos dentro da rede local.

### Funcionalidades
* **Descoberta**: Escaneamento ARP e Ping em lote para listar dispositivos conectados.
* **Dados Coletados**: IP, MAC Address, Hostname, Fabricante, Latência.
* **Ações Rápidas**: Wake-on-LAN (WOL), atalhos SSH/HTTP.
* **Controller**: `NetworkScannerController.cs` (`/api/network-scanner`).
* **Widget**: `NetworkScannerWidget.tsx`.

---

## 📹 3. Painel de Câmeras
Visualizador de fluxos de segurança diretamente na interface web.

### Funcionalidades
* **Protocolos**: RTSP / HTTP.
* **Exibição**: Grid de câmeras configurável com status de conexão.
* **Controller**: `CameraController.cs` (`/api/cameras`).
* **Widget**: `CameraPanelWidget.tsx`.

---

## 🔌 4. Painel IoT (MQTT)
Central de controle para dispositivos e sensores conectáveis via broker MQTT.

### Funcionalidades
* **Conexão**: Publicação e assinatura de tópicos MQTT.
* **Componentes**: Leitura de sensores e envio de comandos/chaves.
* **Controller**: `IotMqttController.cs` (`/api/iot-mqtt`).
* **Widget**: `IotMqttWidget.tsx`.
