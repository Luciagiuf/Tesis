import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from "react-native";

export default function App() {
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(true);
  const [logs, setLogs] = useState([
    {
      id: 1,
      type: "alerta",
      badge: "ALERT",
      time: "11:02:14",
      lines: [
        "⚠ CRISIS DETECTED",
        "device: ESP32-EPI-001",
        "ts: 2026-04-17 11:02:14",
      ],
    },
    {
      id: 2,
      type: "evento",
      badge: "EVENT",
      time: "11:02:15",
      lines: [
        "📋 EVENT REGISTERED",
        "start: 2026-04-17 11:01:56",
        "end: 2026-04-17 11:02:14",
        "duration: 18s | RMS: 1.8423 | peaks: 9",
      ],
    },
    {
      id: 3,
      type: "monitoreo",
      badge: "STATE",
      time: "11:01:52",
      lines: ["state → monitoreo", "ts: 2026-04-17 11:01:52"],
    },
  ]);

  const estado = {
    status: "crisis", // normal | monitoreo | crisis | iniciando
    text: "CRISIS",
    icon: "🚨",
    timestamp: "2026-04-17 11:02:14",
    patientName: "Demo patient",
  };

  const device = {
    id: "ESP32-EPI-001",
    lastMessage: "11:02:14",
    activeTopic: "epilepsia/alerta",
    battery: "87%",
    signal: "-72 dBm",
  };

  const metrics = {
    alertas: 12,
    eventos: 5,
    estados: 28,
  };

  const lastEvent = {
    duracion: 18,
    inicio: "2026-04-17 11:01:56",
    fin: "2026-04-17 11:02:14",
    rms: 1.8423,
    picos: 9,
  };

  const rawJson = useMemo(
    () => `{
  "tipo_mensaje": "evento",
  "id_dispositivo": "ESP32-EPI-001",
  "inicio_evento": "2026-04-17 11:01:56",
  "fin_evento": "2026-04-17 11:02:14",
  "duracion_segundos": 18,
  "rms": 1.8423,
  "cantidad_picos": 9
}`,
    []
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setConnected((prev) => !prev);
      setRefreshing(false);
    }, 1000);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <Header connected={connected} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />}
        >
          <HeroBanner estado={estado} connected={connected} />

          <StatusCard estado={estado} device={device} />

          <View style={styles.metricsRow}>
            <MetricCard emoji="🚨" title="Alerts" value={metrics.alertas} subtitle="Total alerts received" />
            <MetricCard emoji="📋" title="Events" value={metrics.eventos} subtitle="Registered events" />
            <MetricCard emoji="📡" title="States" value={metrics.estados} subtitle="State changes" />
          </View>

          <QuickSummary connected={connected} logsCount={logs.length} crisisCount={metrics.alertas} />

          <LastEventCard lastEvent={lastEvent} />

          <RawJsonCard rawJson={rawJson} />

          <LogCard logs={logs} clearLogs={clearLogs} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Header({ connected }) {
  return (
    <View style={styles.header}>
      <View style={styles.logoWrap}>
        <View style={styles.logoDot} />
        <Text style={styles.logoText}>EpiWatch</Text>
      </View>

      <View style={[styles.connBadge, connected ? styles.connBadgeOn : styles.connBadgeOff]}>
        <View style={[styles.connDot, connected ? styles.connDotOn : styles.connDotOff]} />
        <Text style={[styles.connText, connected ? styles.connTextOn : styles.connTextOff]}>
          {connected ? "Connected" : "Offline"}
        </Text>
      </View>
    </View>
  );
}

function HeroBanner({ estado, connected }) {
  const isCritical = estado.status === "crisis";

  return (
    <View style={[styles.heroBanner, isCritical ? styles.heroBannerCritical : styles.heroBannerNormal]}>
      <View style={styles.heroTopRow}>
        <Text style={styles.heroTitle}>{isCritical ? "Critical episode detected" : "System monitoring active"}</Text>
        <Text style={styles.heroPill}>{connected ? "LIVE" : "OFFLINE"}</Text>
      </View>
      <Text style={styles.heroText}>
        {isCritical
          ? "Immediate caregiver attention may be required. Review the latest event details and log entries below."
          : "The wearable is sending state updates correctly. Pull down to simulate a refresh."}
      </Text>
    </View>
  );
}

function StatusCard({ estado, device }) {
  const stateStyle = getStateStyle(estado.status);

  return (
    <View style={styles.card}>
      <SectionLabel text="Device status" />

      <View style={[styles.estadoBadge, stateStyle.badge]}>
        <Text style={styles.estadoIcon}>{estado.icon}</Text>
        <Text style={[styles.estadoText, stateStyle.text]}>{estado.text}</Text>
        <Text style={styles.estadoTs}>{estado.timestamp}</Text>
      </View>

      <View style={styles.patientBanner}>
        <Text style={styles.patientLabel}>Patient</Text>
        <Text style={styles.patientValue}>{estado.patientName}</Text>
      </View>

      <View style={styles.sectionGap}>
        <SectionLabel text="Device" />
        <InfoRow label="ID" value={device.id} accent />
        <InfoRow label="Last message" value={device.lastMessage} />
        <InfoRow label="Active topic" value={device.activeTopic} />
        <InfoRow label="Battery" value={device.battery} />
        <InfoRow label="Signal" value={device.signal} />
      </View>
    </View>
  );
}

function MetricCard({ emoji, title, value, subtitle }) {
  return (
    <View style={[styles.card, styles.metricCard]}>
      <View style={styles.metricChip}>
        <Text style={styles.metricChipText}>{emoji} {title}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricSubtitle}>{subtitle}</Text>
    </View>
  );
}

function QuickSummary({ connected, logsCount, crisisCount }) {
  return (
    <View style={styles.summaryRow}>
      <SummaryPill label="Connection" value={connected ? "Stable" : "Lost"} valueStyle={connected ? styles.summaryGreen : styles.summaryRed} />
      <SummaryPill label="Log items" value={String(logsCount)} valueStyle={styles.summaryBlue} />
      <SummaryPill label="Crisis alerts" value={String(crisisCount)} valueStyle={styles.summaryRed} />
    </View>
  );
}

function SummaryPill({ label, value, valueStyle }) {
  return (
    <View style={styles.summaryPill}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function LastEventCard({ lastEvent }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <SectionLabel text="Last event" />
        <Text style={styles.cardHeaderAction}>Latest</Text>
      </View>

      <View style={styles.eventDetail}>
        <View style={styles.fullWidthField}>
          <Text style={styles.evLabel}>Duration</Text>
          <Text style={styles.evValueBig}>{lastEvent.duracion}s</Text>
        </View>

        <EventField label="Start" value={lastEvent.inicio} />
        <EventField label="End" value={lastEvent.fin} />
        <EventField label="RMS" value={String(lastEvent.rms)} />
        <EventField label="Peaks" value={String(lastEvent.picos)} />
      </View>
    </View>
  );
}

function RawJsonCard({ rawJson }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <SectionLabel text="Last JSON received" />
        <Text style={styles.cardHeaderAction}>Raw</Text>
      </View>
      <View style={styles.rawBox}>
        <Text style={styles.rawText}>{rawJson}</Text>
      </View>
    </View>
  );
}

function LogCard({ logs, clearLogs }) {
  return (
    <View style={styles.card}>
      <View style={styles.logHeader}>
        <Text style={styles.logTitle}>// MESSAGE LOG</Text>
        <TouchableOpacity style={styles.clearButton} onPress={clearLogs}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {logs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🗑️</Text>
          <Text style={styles.emptyTitle}>Log cleared</Text>
          <Text style={styles.emptySubtitle}>New messages will appear here.</Text>
        </View>
      ) : (
        <View style={styles.logList}>
          {logs.map((log) => {
            const typeStyle = getLogStyle(log.type);
            return (
              <View key={log.id} style={[styles.logEntry, typeStyle]}>
                <View style={styles.logEntryTop}>
                  <Text style={styles.logTime}>{log.time}</Text>
                  <View style={styles.logBadge}>
                    <Text style={styles.logBadgeText}>{log.badge}</Text>
                  </View>
                </View>
                <View style={styles.logContent}>
                  {log.lines.map((line, i) => (
                    <Text key={i} style={i === 0 ? styles.logMainLine : styles.logSubLine}>
                      {line}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function SectionLabel({ text }) {
  return <Text style={styles.sectionLabel}>{text}</Text>;
}

function InfoRow({ label, value, accent = false }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, accent && styles.infoAccent]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function EventField({ label, value }) {
  return (
    <View style={styles.evField}>
      <Text style={styles.evLabel}>{label}</Text>
      <Text style={styles.evValue}>{value}</Text>
    </View>
  );
}

function getStateStyle(status) {
  switch (status) {
    case "normal":
      return {
        badge: { borderColor: "#22d3a0", backgroundColor: "rgba(34,211,160,0.08)" },
        text: { color: "#22d3a0" },
      };
    case "monitoreo":
      return {
        badge: { borderColor: "#f59e0b", backgroundColor: "rgba(245,158,11,0.08)" },
        text: { color: "#f59e0b" },
      };
    case "crisis":
      return {
        badge: { borderColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.10)" },
        text: { color: "#ef4444" },
      };
    default:
      return {
        badge: { borderColor: "#38bdf8", backgroundColor: "rgba(56,189,248,0.08)" },
        text: { color: "#38bdf8" },
      };
  }
}

function getLogStyle(type) {
  switch (type) {
    case "alerta":
      return { borderLeftColor: "#ef4444" };
    case "evento":
      return { borderLeftColor: "#38bdf8" };
    case "monitoreo":
      return { borderLeftColor: "#f59e0b" };
    case "normal":
      return { borderLeftColor: "#22d3a0" };
    default:
      return { borderLeftColor: "#64748b" };
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0b0f1a",
  },
  container: {
    flex: 1,
    backgroundColor: "#0b0f1a",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2d45",
    backgroundColor: "#111827",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#38bdf8",
    marginRight: 10,
  },
  logoText: {
    color: "#38bdf8",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
  },
  connBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  connBadgeOn: {
    borderColor: "#22d3a0",
    backgroundColor: "rgba(34,211,160,0.08)",
  },
  connBadgeOff: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239,68,68,0.10)",
  },
  connDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginRight: 7,
  },
  connDotOn: {
    backgroundColor: "#22d3a0",
  },
  connDotOff: {
    backgroundColor: "#ef4444",
  },
  connText: {
    fontSize: 12,
    fontWeight: "600",
  },
  connTextOn: {
    color: "#22d3a0",
  },
  connTextOff: {
    color: "#ef4444",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 32,
  },
  heroBanner: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  heroBannerCritical: {
    backgroundColor: "rgba(239,68,68,0.12)",
    borderColor: "rgba(239,68,68,0.45)",
  },
  heroBannerNormal: {
    backgroundColor: "rgba(56,189,248,0.10)",
    borderColor: "rgba(56,189,248,0.35)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  heroTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
  },
  heroPill: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(11,15,26,0.45)",
    overflow: "hidden",
  },
  heroText: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#111827",
    borderColor: "#1f2d45",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardHeaderAction: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionLabel: {
    color: "#64748b",
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 10,
    fontWeight: "600",
  },
  estadoBadge: {
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 14,
    backgroundColor: "#1a2235",
  },
  estadoIcon: {
    fontSize: 42,
  },
  estadoText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },
  estadoTs: {
    color: "#64748b",
    fontSize: 12,
  },
  patientBanner: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: "#1a2235",
    borderWidth: 1,
    borderColor: "#1f2d45",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  patientLabel: {
    color: "#94a3b8",
    fontSize: 13,
  },
  patientValue: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionGap: {
    marginTop: 18,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2d45",
    gap: 16,
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 14,
  },
  infoValue: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
  },
  infoAccent: {
    color: "#38bdf8",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minHeight: 116,
  },
  metricChip: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#38bdf8",
    backgroundColor: "rgba(56,189,248,0.08)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  metricChipText: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "600",
  },
  metricValue: {
    color: "#e2e8f0",
    fontSize: 28,
    fontWeight: "800",
  },
  metricSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  summaryPill: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2d45",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: 11,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "800",
  },
  summaryGreen: {
    color: "#22d3a0",
  },
  summaryRed: {
    color: "#ef4444",
  },
  summaryBlue: {
    color: "#38bdf8",
  },
  eventDetail: {
    backgroundColor: "#1a2235",
    borderWidth: 1,
    borderColor: "#1f2d45",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  fullWidthField: {
    width: "100%",
  },
  evField: {
    width: "47%",
  },
  evLabel: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 4,
  },
  evValue: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "600",
  },
  evValueBig: {
    color: "#ef4444",
    fontSize: 30,
    fontWeight: "800",
  },
  rawBox: {
    backgroundColor: "#070d1a",
    borderColor: "#1f2d45",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  rawText: {
    color: "#7dd3fc",
    fontSize: 12,
    lineHeight: 19,
    fontFamily: "monospace",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logTitle: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  clearButton: {
    borderWidth: 1,
    borderColor: "#1f2d45",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#1a2235",
    borderWidth: 1,
    borderColor: "#1f2d45",
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyTitle: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubtitle: {
    color: "#94a3b8",
    fontSize: 13,
  },
  logList: {
    gap: 8,
  },
  logEntry: {
    backgroundColor: "#1a2235",
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 12,
  },
  logEntryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 12,
  },
  logTime: {
    color: "#64748b",
    fontSize: 11,
  },
  logBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(100,116,139,0.18)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logBadgeText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "700",
  },
  logContent: {
    gap: 3,
  },
  logMainLine: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "700",
  },
  logSubLine: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 18,
  },
});