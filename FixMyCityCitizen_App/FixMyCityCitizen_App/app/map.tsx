import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';

const DUMMY_MARKERS: { id: number; label: string; type: string; severity: SeverityLevel; reports: number }[] = [
  { id: 1, label: 'MG Road Junction',  type: 'Pothole',     severity: 'High',   reports: 14 },
  { id: 2, label: 'Central Park Area', type: 'Garbage',     severity: 'Medium', reports: 8  },
  { id: 3, label: 'Sector 5 Crossing', type: 'Streetlight', severity: 'Low',    reports: 3  },
  { id: 4, label: 'Market Street',     type: 'Water Leak',  severity: 'High',   reports: 11 },
];

type SeverityLevel = 'High' | 'Medium' | 'Low';

const SEVERITY_COLORS: Record<SeverityLevel, { dot: string; bg: string; text: string }> = {
  High:   { dot: '#EF4444', bg: '#FEE2E2', text: '#991B1B' },
  Medium: { dot: '#F59E0B', bg: '#FEF3C7', text: '#92400E' },
  Low:    { dot: '#10B981', bg: '#D1FAE5', text: '#065F46' },
};

export default function MapScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Hotspot Map</Text>
        <Text style={styles.subtitle}>Areas with highest reported issues</Text>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapEmoji}>🗺️</Text>
        <Text style={styles.mapLabel}>Interactive Map</Text>
        <Text style={styles.mapHint}>
          Integrate react-native-maps{'\n'}or Mapbox for live hotspots
        </Text>
        {/* Dummy pin indicators */}
        <View style={styles.pinRow}>
          {['📍', '📍', '📍', '📍'].map((pin, i) => (
            <Text key={i} style={[styles.pin, { opacity: 1 - i * 0.15 }]}>{pin}</Text>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        {Object.entries(SEVERITY_COLORS).map(([level, colors]) => (
          <View key={level} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.dot }]} />
            <Text style={styles.legendLabel}>{level}</Text>
          </View>
        ))}
      </View>

      {/* Hotspot List */}
      <Text style={styles.sectionLabel}>Top Hotspots</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {DUMMY_MARKERS.map((marker) => {
          const colors = SEVERITY_COLORS[marker.severity];
          return (
            <View key={marker.id} style={styles.markerCard}>
              <View style={styles.markerLeft}>
                <View style={[styles.markerDot, { backgroundColor: colors.dot }]} />
                <View>
                  <Text style={styles.markerTitle}>{marker.label}</Text>
                  <Text style={styles.markerType}>{marker.type} · {marker.reports} reports</Text>
                </View>
              </View>
              <View style={[styles.severityBadge, { backgroundColor: colors.bg }]}>
                <Text style={[styles.severityText, { color: colors.text }]}>
                  {marker.severity}
                </Text>
              </View>
            </View>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', paddingHorizontal: 20, paddingTop: 60 },
  header: { marginBottom: 20 },
  back: { fontSize: 15, color: '#2563EB', fontWeight: '500', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  mapPlaceholder: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 16,
  },
  mapEmoji: { fontSize: 36, marginBottom: 8 },
  mapLabel: { fontSize: 16, fontWeight: '600', color: '#2563EB', marginBottom: 4 },
  mapHint: { fontSize: 12, color: '#93C5FD', textAlign: 'center', lineHeight: 18 },
  pinRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  pin: { fontSize: 22 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  markerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  markerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  markerDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  markerTitle: { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginBottom: 2 },
  markerType: { fontSize: 12, color: '#9CA3AF' },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  severityText: { fontSize: 11, fontWeight: '700' },
});