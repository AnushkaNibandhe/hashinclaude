import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

const TIMELINE = [
  { step: 'Submitted',   done: true,  note: 'Report received by system'       },
  { step: 'In Progress', done: true,  note: 'Assigned to municipal crew'      },
  { step: 'Resolved',    done: false, note: 'Awaiting completion confirmation' },
];

export default function ComplaintDetailScreen() {
  const { id } = useLocalSearchParams();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Header */}
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Complaint Details</Text>
      <Text style={styles.id}>Report ID: #{id}</Text>

      {/* Info Card */}
      <View style={styles.card}>
        <Row label="Issue"       value="Large pothole on MG Road"  />
        <Row label="Category"    value="Pothole"                   />
        <Row label="Submitted"   value="2 June 2025, 10:34 AM"     />
        <Row label="Status"      value="In Progress" isStatus       />
        <Row label="Description" value="Deep pothole near the bus stop causing vehicle damage. Needs urgent repair." last />
      </View>

      {/* Timeline */}
      <Text style={styles.sectionTitle}>Progress Timeline</Text>
      <View style={styles.timeline}>
        {TIMELINE.map((item, index) => (
          <View key={item.step} style={styles.timelineRow}>
            {/* Dot + line */}
            <View style={styles.dotColumn}>
              <View style={[styles.dot, item.done ? styles.dotDone : styles.dotPending]} />
              {index < TIMELINE.length - 1 && (
                <View style={[styles.line, item.done ? styles.lineDone : styles.linePending]} />
              )}
            </View>
            {/* Content */}
            <View style={styles.timelineContent}>
              <Text style={[styles.stepLabel, item.done && styles.stepLabelDone]}>
                {item.step}
              </Text>
              <Text style={styles.stepNote}>{item.note}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

type RowProps = {
  label: string;
  value: string;
  isStatus?: boolean;
  last?: boolean;
};

function Row({ label, value, isStatus = false, last = false }: RowProps) {
  const STATUS_COLOR: Record<string, string> = {
    'In Progress': '#1E40AF',
    Pending: '#92400E',
    Resolved: '#065F46',
  };
  const STATUS_BG: Record<string, string> = {
    'In Progress': '#DBEAFE',
    Pending: '#FEF3C7',
    Resolved: '#D1FAE5',
  };

  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      {isStatus ? (
        <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[value] || '#F3F4F6' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[value] || '#374151' }]}>
            {value}
          </Text>
        </View>
      ) : (
        <Text style={styles.rowValue}>{value}</Text>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F7F8FA' },
  container: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 48 },
  back: { fontSize: 15, color: '#2563EB', fontWeight: '500', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  id: { fontSize: 13, color: '#9CA3AF', marginBottom: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    marginBottom: 28,
  },
  row: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500', flex: 1 },
  rowValue: { fontSize: 14, color: '#1A1A2E', fontWeight: '500', flex: 2, textAlign: 'right' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E', marginBottom: 20 },
  timeline: { paddingLeft: 4 },
  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  dotColumn: { alignItems: 'center', marginRight: 16, width: 20 },
  dot: { width: 18, height: 18, borderRadius: 9, marginTop: 2 },
  dotDone: { backgroundColor: '#2563EB' },
  dotPending: { backgroundColor: '#E5E7EB', borderWidth: 1.5, borderColor: '#D1D5DB' },
  line: { width: 2, flex: 1, minHeight: 36, marginVertical: 4 },
  lineDone: { backgroundColor: '#2563EB' },
  linePending: { backgroundColor: '#E5E7EB' },
  timelineContent: { flex: 1, paddingBottom: 28 },
  stepLabel: { fontSize: 15, fontWeight: '600', color: '#9CA3AF', marginBottom: 4 },
  stepLabelDone: { color: '#1A1A2E' },
  stepNote: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
});