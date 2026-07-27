# Módulos de Monitoramento e Rede

Estes módulos são focados em telemetria em tempo real, conectividade e visualização de dispositivos locais e meteorológicos.

---

## 🟢 1. Monitoramento de URLs (Uptime)
Inspirado no *Uptime Kuma*, realiza checagens periódicas de serviços para identificar lentidão ou quedas.

### Funcionalidades
* **Tipos de Checagem**: HTTP(S), Ping (ICMP), TCP Port (ex: 5432 para Postgres, 80 para Apache).
* **Métricas**: Tempo de resposta, histórico de status online/offline, taxa de disponibilidade (SLD).
* **Alertas**: Notificações imediatas se o serviço ficar fora do ar por $N$ verificações consecutivas.

---

## 🖥️ 2. Rede Local (Network Scanner)
Mapeamento ativo e passivo de dispositivos dentro da rede local (ex: `192.168.0.0/24`).

### Funcionalidades
* **Descoberta**: Escaneamento ARP e ICMP para listar dispositivos conectados.
* **Dados Coletados**: IP, MAC Address, Hostname, Fabricante (com base no prefixo MAC), Latência média.
* **Ações Rápidas**:
  * **Wake-on-LAN (WOL)**: Envia pacotes mágicos para ligar servidores remotamente.
  * **Atalhos**: Links rápidos para SSH, RDP ou interfaces HTTP do dispositivo mapeado.

---

## 📹 3. Painel de Câmeras
Visualizador de fluxos de segurança unificado diretamente na interface web.

### Funcionalidades
* **Protocolos Suportados**: RTSP, ONVIF (para descoberta e movimentação PTZ), fluxos HTTP/HLS.
* **Exibição**: Grid personalizável de câmeras, modo tela cheia, captura de instantâneos (snapshots).
* **Gravação**: Gravação local configurável baseada em agendamento.

---

## 🌤️ 4. Clima (Weather)
Exibição de dados meteorológicos para planejamento de operações externas ou painéis de monitoramento domésticos.

### Funcionalidades
* **Fontes**: OpenWeatherMap, WeatherAPI ou dados públicos do INMET.
* **Visualizações**: Temperatura atual, umidade, vento, previsão de chuva e mapa de radar se disponível.

---

## 🔌 5. Painel IoT (MQTT)
Central de controle leve para dispositivos de automação doméstica ou industrial.

### Funcionalidades
* **Broker MQTT**: Conexão com brokers existentes para assinar e publicar tópicos.
* **Componentes**: Widgets de switch (liga/desliga), leituras de temperatura e status de relés.
