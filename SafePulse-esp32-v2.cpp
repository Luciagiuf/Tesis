#include <Wire.h>
#include <MPU6050.h>
#include <WiFi.h>
#include <WiFiManager.h>      // ← NUEVO: instalar desde Library Manager (tzapu/tablatronix)
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <Preferences.h>      // ← NUEVO: para guardar DEVICE_ID en flash

MPU6050 mpu;

// ===== IDENTIFICADOR DE DISPOSITIVO =====
// Ya no está hardcodeado: se genera automáticamente desde la MAC del ESP32
// y se guarda en flash para que sea siempre el mismo.
String DEVICE_ID = "esp32_01"; // valor inicial, se reemplaza en setup()

// ===== WiFi =====
// ¡YA NO HAY ssid ni password hardcodeados!
// El ESP los pide automáticamente la primera vez a través del portal Wi-Fi.
// Para cambiar de red: mantené presionado el botón BOOT (GPIO0) 3 segundos.
#define PIN_RESET_WIFI 0   // Botón BOOT en la mayoría de dev boards ESP32

// ===== MQTT =====
const char* broker = "broker.hivemq.com";
const int   port   = 1883;

// ===== TOPICS MQTT =====
const char* topicEstado = "epilepsia/estado";
const char* topicAlerta = "epilepsia/alerta";
const char* topicEvento = "epilepsia/evento";

WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

// ===== NTP =====
const char* ntpServer        = "pool.ntp.org";
const long  gmtOffset_sec    = -10800; // UTC-3 Argentina
const int   daylightOffset_sec = 0;

// ===== PINES =====
const int buzzerPin = 4;
const int SDA_PIN   = 5;
const int SCL_PIN   = 6;

// ===== VENTANA DE ANÁLISIS =====
const int N = 30;
float ventanaMagnitud[N];
int   indice       = 0;
bool  ventanaLlena = false;

// ===== UMBRALES =====
const float umbralPico       = 0.08;
const int   cantidadPicosMin = 4;
const float umbralRMS        = 0.06;

// ===== REPETITIVIDAD =====
// Sirve para reducir falsos positivos por movimientos lentos o aislados.
// Como el loop usa delay(100), cada muestra equivale aprox. a 100 ms.
const int   separacionMinimaEntrePicos = 2;    // 2 muestras = 200 ms
const int   separacionMaximaEntrePicos = 8;    // 8 muestras = 800 ms
const float toleranciaRitmo             = 0.45; // menor = más estricto

// ===== ESTADO DE CRISIS =====
enum EstadoSistema { NORMAL, MONITOREO, CRISIS };
EstadoSistema estadoActual   = NORMAL;
EstadoSistema estadoAnterior = NORMAL;

int ventanasCriticasConsecutivas = 0;
const int ventanasMinimasParaAlarma = 2;

// ===== TRACKING DE EVENTO =====
time_t inicioEvento  = 0;
float  rmsDelEvento  = 0.0;
int    picosDelEvento = 0;
bool   alertaEnviada = false;

// ===== FILTRO Y BASELINE =====
float magnitudFiltrada = 0.0;
const float alphaFiltro = 0.35;
float baselineMagnitud  = 0.0;
const int   muestrasCalibracion = 100;

// ===== HELPERS =====

String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "1970-01-01T00:00:00";
  }
  char buf[25];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%S", &timeinfo);
  return String(buf);
}

time_t getEpoch() {
  time_t now;
  time(&now);
  return now;
}

const char* nombreEstado(EstadoSistema e) {
  switch(e) {
    case NORMAL:    return "normal";
    case MONITOREO: return "monitoreo";
    case CRISIS:    return "crisis";
    default:        return "desconocido";
  }
}

// ===== CONFIGURAR Wi-Fi CON PORTAL CAUTIVO =====
// - Si hay credenciales guardadas → conecta directo, sin intervención.
// - Si no hay red o falla la conexión → abre el AP "SafePulse-Setup".
//   Conectate al AP desde el celu y abrí http://192.168.4.1 para configurar.
// - Para olvidar la red actual: mantenés BOOT presionado 3 segundos.
void setupWiFi() {
  WiFiManager wm;

  wm.setTitle("SafePulse - Configuracion Wi-Fi");
  wm.setConfigPortalTimeout(180); // Portal se cierra solo a los 3 minutos
  wm.setConnectTimeout(20);       // 20 seg máximo para conectar

  // Callback: se llama cuando NO puede conectar y abre el AP
  wm.setAPCallback([](WiFiManager* wm) {
    Serial.println("\n[WiFi] No se pudo conectar a la red guardada.");
    Serial.println("[WiFi] AP abierto: SafePulse-Setup");
    Serial.println("[WiFi] Conectate a esa red y abre: http://192.168.4.1");
  });

  wm.setSaveConfigCallback([]() {
    Serial.println("[WiFi] Credenciales guardadas en flash.");
  });

  bool ok = wm.autoConnect("SafePulse-Setup");

  if (ok) {
    Serial.println("[WiFi] Conectado a: " + WiFi.SSID());
    Serial.println("[WiFi] IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("[WiFi] No se pudo conectar ni configurar. Reiniciando...");
    delay(3000);
    ESP.restart();
  }
}

// ===== PUBLICAR ESTADO =====
void publicarEstado(const char* estadoStr) {
  StaticJsonDocument<256> doc;
  doc["tipo_mensaje"]   = "estado";
  doc["id_dispositivo"] = DEVICE_ID;
  doc["timestamp"]      = getTimestamp();
  doc["estado_actual"]  = estadoStr;

  char payload[256];
  serializeJson(doc, payload);
  mqtt.publish(topicEstado, payload);

  Serial.print("[MQTT estado] ");
  Serial.println(payload);
}

// ===== PUBLICAR ALERTA =====
void publicarAlerta(time_t inicio) {
  struct tm ti;
  localtime_r(&inicio, &ti);
  char bufInicio[25];
  strftime(bufInicio, sizeof(bufInicio), "%Y-%m-%dT%H:%M:%S", &ti);

  StaticJsonDocument<256> doc;
  doc["tipo_mensaje"]   = "alerta";
  doc["id_dispositivo"] = DEVICE_ID;
  doc["timestamp"]      = getTimestamp();
  doc["deteccion"]      = true;
  doc["inicio_crisis"]  = bufInicio;

  char payload[256];
  serializeJson(doc, payload);
  mqtt.publish(topicAlerta, payload);

  Serial.print("[MQTT alerta] ");
  Serial.println(payload);
}

// ===== PUBLICAR EVENTO =====
void publicarEvento(time_t inicio, time_t fin, float rms, int picos) {
  long duracion = (long)(fin - inicio);

  struct tm ti, tf;
  localtime_r(&inicio, &ti);
  localtime_r(&fin,    &tf);

  char bufInicio[25], bufFin[25];
  strftime(bufInicio, sizeof(bufInicio), "%Y-%m-%dT%H:%M:%S", &ti);
  strftime(bufFin,    sizeof(bufFin),    "%Y-%m-%dT%H:%M:%S", &tf);

  StaticJsonDocument<512> doc;
  doc["tipo_mensaje"]      = "evento";
  doc["id_dispositivo"]    = DEVICE_ID;
  doc["inicio_evento"]     = bufInicio;
  doc["fin_evento"]        = bufFin;
  doc["duracion_segundos"] = duracion;
  doc["rms"]               = rms;
  doc["cantidad_picos"]    = picos;

  char payload[512];
  serializeJson(doc, payload);
  mqtt.publish(topicEvento, payload);

  Serial.print("[MQTT evento] ");
  Serial.println(payload);
}

// ===== RECONEXIÓN MQTT =====
void reconnectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Reconectando broker...");
    String clientId = String("esp32_") + DEVICE_ID;
    if (mqtt.connect(clientId.c_str())) {
      Serial.println(" OK");
    } else {
      delay(2000);
    }
  }
}

// ===== SETUP =====
void setup() {
  Serial.begin(115200);
  pinMode(PIN_RESET_WIFI, INPUT_PULLUP);
  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, LOW);

  // ── Verificar pulsación larga de BOOT para resetear Wi-Fi ──────────────
  Serial.println("[WiFi] Manten BOOT 3s para resetear red guardada...");
  unsigned long tBtn = millis();
  while (digitalRead(PIN_RESET_WIFI) == LOW) {
    if (millis() - tBtn > 3000) {
      Serial.println("[WiFi] Reseteando credenciales Wi-Fi...");
      WiFiManager wm;
      wm.resetSettings();
      Serial.println("[WiFi] Listo. Reiniciando...");
      delay(1000);
      ESP.restart();
    }
    delay(50);
  }

  // ── Configurar Wi-Fi (portal cautivo si es necesario) ──────────────────
  setupWiFi();

  // ── Generar DEVICE_ID único desde MAC (se guarda en flash) ─────────────
  Preferences prefs;
  prefs.begin("safepulse", false);
  if (!prefs.isKey("device_id")) {
    uint8_t mac[6];
    WiFi.macAddress(mac);
    char buf[20];
    snprintf(buf, sizeof(buf), "esp32_%02X%02X%02X", mac[3], mac[4], mac[5]);
    prefs.putString("device_id", buf);
  }
  DEVICE_ID = prefs.getString("device_id", "esp32_01");
  prefs.end();
  Serial.println("[Sistema] DEVICE_ID: " + DEVICE_ID);

  // ── MPU6050 ────────────────────────────────────────────────────────────
  Wire.begin(SDA_PIN, SCL_PIN);
  mpu.initialize();
  if (!mpu.testConnection()) {
    Serial.println("Error: MPU6050 no detectado");
    while (1);
  }

  // ── NTP ────────────────────────────────────────────────────────────────
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.print("Sincronizando NTP");
  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK");
  Serial.print("Hora actual: ");
  Serial.println(getTimestamp());

  // ── MQTT ───────────────────────────────────────────────────────────────
  mqtt.setServer(broker, port);
  Serial.print("Conectando broker");
  while (!mqtt.connected()) {
    String clientId = String("esp32_") + DEVICE_ID;
    mqtt.connect(clientId.c_str());
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK");

  publicarEstado("iniciando");

  // ── Calibración baseline ───────────────────────────────────────────────
  Serial.println("Calibrando baseline...");
  float sumaBaseline = 0.0;
  for (int i = 0; i < muestrasCalibracion; i++) {
    int16_t axRaw, ayRaw, azRaw;
    mpu.getAcceleration(&axRaw, &ayRaw, &azRaw);
    float ax = axRaw / 16384.0;
    float ay = ayRaw / 16384.0;
    float az = azRaw / 16384.0;
    sumaBaseline += sqrt(ax*ax + ay*ay + az*az);
    delay(20);
  }
  baselineMagnitud = sumaBaseline / muestrasCalibracion;
  Serial.print("Baseline: ");
  Serial.println(baselineMagnitud);

  publicarEstado("normal");
  Serial.println("Sistema listo");
}

// ===== LOOP =====
void loop() {
  // ── Verificar botón de reset en caliente ──────────────────────────────
  if (digitalRead(PIN_RESET_WIFI) == LOW) {
    unsigned long t = millis();
    while (digitalRead(PIN_RESET_WIFI) == LOW) {
      if (millis() - t > 3000) {
        WiFiManager wm;
        wm.resetSettings();
        Serial.println("[WiFi] Credenciales borradas. Reiniciando...");
        delay(500);
        ESP.restart();
      }
      delay(50);
    }
  }

  if (!mqtt.connected()) reconnectMQTT();
  mqtt.loop();

  // Lectura del acelerómetro
  int16_t axRaw, ayRaw, azRaw;
  mpu.getAcceleration(&axRaw, &ayRaw, &azRaw);
  float ax = axRaw / 16384.0;
  float ay = ayRaw / 16384.0;
  float az = azRaw / 16384.0;
  float magnitudCruda = sqrt(ax*ax + ay*ay + az*az);

  float magnitudSinBaseline = abs(magnitudCruda - baselineMagnitud);
  magnitudFiltrada = alphaFiltro * magnitudSinBaseline + (1.0 - alphaFiltro) * magnitudFiltrada;

  ventanaMagnitud[indice] = magnitudFiltrada;
  indice++;

  bool analizarAhora = false;
  if (indice >= N) {
    indice = 0;
    ventanaLlena = true;
    analizarAhora = true;
  }

  if (ventanaLlena && analizarAhora) {
    float sumaCuadrados = 0.0;
    for (int i = 0; i < N; i++) sumaCuadrados += ventanaMagnitud[i] * ventanaMagnitud[i];
    float rms = sqrt(sumaCuadrados / N);

    int picos = 0;
    int posicionesPicos[N];

    // Primero detectamos todos los picos locales que superen el umbral.
    for (int i = 1; i < N - 1; i++) {
      bool esPico = ventanaMagnitud[i] > umbralPico &&
                    ventanaMagnitud[i] > ventanaMagnitud[i - 1] &&
                    ventanaMagnitud[i] > ventanaMagnitud[i + 1];

      if (esPico) {
        posicionesPicos[picos] = i;
        picos++;
      }
    }

    // Buscamos la cadena consecutiva más larga de picos que estén dentro
    // del rango temporal permitido. Esto evita que picos aislados en el
    // tiempo activen el detector.
    int inicioMejorPatron = 0;
    int largoMejorPatron = (picos > 0) ? 1 : 0;
    int inicioPatronActual = 0;
    int largoPatronActual = (picos > 0) ? 1 : 0;

    for (int i = 1; i < picos; i++) {
      int intervalo = posicionesPicos[i] - posicionesPicos[i - 1];
      bool intervaloValido = intervalo >= separacionMinimaEntrePicos &&
                             intervalo <= separacionMaximaEntrePicos;

      if (intervaloValido) {
        largoPatronActual++;
      } else {
        inicioPatronActual = i;
        largoPatronActual = 1;
      }

      if (largoPatronActual > largoMejorPatron) {
        inicioMejorPatron = inicioPatronActual;
        largoMejorPatron = largoPatronActual;
      }
    }

    int picosEnPatron = largoMejorPatron;
    int intervalosValidos = max(0, picosEnPatron - 1);
    bool picosSuficientementeCercanos = picosEnPatron >= cantidadPicosMin;

    // Si hay una cadena suficientemente larga, revisamos que el ritmo
    // sea más o menos regular.
    bool ritmoRegular = false;
    float variacionRelativa = 999.0;

    if (picosSuficientementeCercanos && intervalosValidos > 0) {
      int sumaIntervalos = 0;

      for (int i = inicioMejorPatron + 1;
           i < inicioMejorPatron + picosEnPatron;
           i++) {
        sumaIntervalos += posicionesPicos[i] - posicionesPicos[i - 1];
      }

      float promedioIntervalos = (float)sumaIntervalos / intervalosValidos;
      float sumaDesvios = 0.0;

      for (int i = inicioMejorPatron + 1;
           i < inicioMejorPatron + picosEnPatron;
           i++) {
        int intervalo = posicionesPicos[i] - posicionesPicos[i - 1];
        sumaDesvios += abs(intervalo - promedioIntervalos);
      }

      float desvioPromedio = sumaDesvios / intervalosValidos;
      variacionRelativa = desvioPromedio / promedioIntervalos;
      ritmoRegular = variacionRelativa <= toleranciaRitmo;
    }

    bool ventanaCritica = (rms > umbralRMS &&
                           picosEnPatron >= cantidadPicosMin &&
                           picosSuficientementeCercanos &&
                           ritmoRegular);

    estadoAnterior = estadoActual;

    if (ventanaCritica) {
      ventanasCriticasConsecutivas++;

      if (rms > rmsDelEvento) {
        rmsDelEvento   = rms;
        picosDelEvento = picosEnPatron;
      }

      if (ventanasCriticasConsecutivas == 1) {
        estadoActual = MONITOREO;
      }
      if (ventanasCriticasConsecutivas >= ventanasMinimasParaAlarma) {
        estadoActual = CRISIS;
      }

    } else {
      if (estadoAnterior == CRISIS) {
        time_t finEvento = getEpoch();
        publicarEvento(inicioEvento, finEvento, rmsDelEvento, picosDelEvento);
        rmsDelEvento   = 0.0;
        picosDelEvento = 0;
        inicioEvento   = 0;
        alertaEnviada  = false;
      }
      ventanasCriticasConsecutivas = 0;
      estadoActual = NORMAL;
    }

    if (estadoActual != estadoAnterior) {
      publicarEstado(nombreEstado(estadoActual));
    }

    if (estadoActual == CRISIS && estadoAnterior != CRISIS) {
      inicioEvento = getEpoch();
      digitalWrite(buzzerPin, HIGH);
      if (!alertaEnviada) {
        publicarAlerta(inicioEvento);
        alertaEnviada = true;
      }
    }

    if (estadoActual != CRISIS) {
      digitalWrite(buzzerPin, LOW);
    }

    Serial.println("------ VENTANA ------");
    Serial.print("RMS: ");                   Serial.println(rms, 4);
    Serial.print("Picos: ");                Serial.println(picos);
    Serial.print("Picos en patron: ");      Serial.println(picosEnPatron);
    Serial.print("Intervalos validos: ");   Serial.println(intervalosValidos);
    Serial.print("Picos cercanos: ");       Serial.println(picosSuficientementeCercanos ? "SI" : "NO");
    Serial.print("Variacion ritmo: ");      Serial.println(variacionRelativa, 3);
    Serial.print("Ritmo regular: ");        Serial.println(ritmoRegular ? "SI" : "NO");
    Serial.print("Ventanas criticas: ");    Serial.println(ventanasCriticasConsecutivas);
    Serial.print("Estado: ");               Serial.println(nombreEstado(estadoActual));
    Serial.println("---------------------");
  }

  delay(100);
}