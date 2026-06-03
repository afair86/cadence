import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { Contact } from '@cadence/shared';
import { api } from '../api';

const healthColor: Record<string, string> = {
  healthy: '#22c55e',
  cooling: '#f59e0b',
  at_risk: '#ef4444',
};

export default function ContactsScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const c = await api.contacts();
    setContacts(c);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <FlatList
      style={styles.container}
      data={contacts}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Contacts</Text>
          <Text style={styles.sub}>{contacts.length} relationships</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          </View>
          <View style={styles.body}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.co}>{item.company}</Text>
            <Text style={[styles.health, { color: healthColor[item.healthStatus] ?? '#64748b' }]}>
              {item.healthScore}% · {item.healthStatus.replace('_', ' ')}
            </Text>
            {item.lastContactDaysAgo != null ? (
              <Text style={styles.meta}>Last contact {item.lastContactDaysAgo}d ago</Text>
            ) : null}
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb' },
  header: { padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  sub: { color: '#64748b' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700' },
  body: { flex: 1 },
  name: { fontWeight: '700', fontSize: 15 },
  co: { color: '#64748b', fontSize: 12 },
  health: { fontSize: 12, fontWeight: '600', marginTop: 4, textTransform: 'capitalize' },
  meta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
});
