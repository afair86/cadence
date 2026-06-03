import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { DashboardData } from '@cadence/shared';
import { api } from '../api';
import { useAuth } from '../AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.dashboard();
      setData(d);
    } catch {
      setData(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading your plan…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.greeting}>
        {data.greeting}, {user?.name.split(' ')[0]} 👋
      </Text>
      <Text style={styles.date}>Friday plan · {data.estimatedMinutes} min total</Text>

      <View style={styles.pointsCard}>
        <Text style={styles.pointsValue}>{data.kpis.find((k) => k.id === 'points')?.value ?? 0}</Text>
        <Text style={styles.pointsLabel}>Points today</Text>
        <Text style={styles.pointsTarget}>
          {data.monthlyPoints.current} / {data.monthlyPoints.target} monthly
        </Text>
      </View>

      <View style={styles.healthCard}>
        <Text style={styles.sectionTitle}>Relationship Health</Text>
        <Text style={styles.healthValue}>{data.relationshipHealth.healthy}% Healthy</Text>
      </View>

      <Text style={styles.sectionTitle}>Today&apos;s Smart Plan</Text>
      {data.smartPlan.map((item) => (
        <View key={item.id} style={styles.planItem}>
          <Text style={styles.planName}>{item.contactName}</Text>
          <Text style={styles.planCo}>{item.company}</Text>
          <Text style={styles.planInsight}>{item.insight}</Text>
          <View style={styles.planRow}>
            <Text style={styles.planTime}>{item.scheduledTime}</Text>
            <TouchableOpacity style={styles.planBtn}>
              <Text style={styles.planBtnText}>{item.actionLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {data.automation ? (
        <View style={styles.autoCard}>
          <Text style={styles.sectionTitle}>Upcoming Message</Text>
          <Text style={styles.autoMsg}>&ldquo;{data.automation.message}&rdquo;</Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => api.approveAutomation(data.automation!.id).then(load)}
          >
            <Text style={styles.btnText}>Approve & Send</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: '#64748b' },
  greeting: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  date: { color: '#64748b', marginBottom: 16 },
  pointsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  pointsValue: { fontSize: 36, fontWeight: '700', color: '#6366f1' },
  pointsLabel: { color: '#64748b' },
  pointsTarget: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  healthCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  healthValue: { fontSize: 18, fontWeight: '600', color: '#22c55e' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  planItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  planName: { fontWeight: '700', fontSize: 15 },
  planCo: { color: '#64748b', fontSize: 12 },
  planInsight: { color: '#64748b', fontSize: 13, marginVertical: 6 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planTime: { fontWeight: '600' },
  planBtn: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  planBtnText: { fontSize: 12, fontWeight: '600' },
  autoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  autoMsg: { fontStyle: 'italic', marginBottom: 12, color: '#334155' },
  btn: { backgroundColor: '#6366f1', borderRadius: 8, padding: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
});
