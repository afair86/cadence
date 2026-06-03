import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { ActivityType, Contact } from '@cadence/shared';
import { DEFAULT_POINTS } from '@cadence/shared';
import { api } from '../api';

const TYPES: ActivityType[] = ['call', 'sms', 'email', 'meeting', 'coffee'];

export default function LogActivityScreen() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState('');
  const [type, setType] = useState<ActivityType>('call');
  const [notes, setNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      api.contacts().then((c) => {
        setContacts(c);
        if (c.length) setContactId(c[0].id);
      });
    }, []),
  );

  async function submit() {
    if (!contactId) return;
    try {
      await api.logActivity({ contactId, type, notes: notes || undefined });
      Alert.alert('Logged!', `+${DEFAULT_POINTS[type]} points earned`);
      setNotes('');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Log Activity</Text>

      <Text style={styles.label}>Contact</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {contacts.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.chip, contactId === c.id && styles.chipActive]}
            onPress={() => setContactId(c.id)}
          >
            <Text style={[styles.chipText, contactId === c.id && styles.chipTextActive]}>
              {c.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Type</Text>
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, type === t && styles.typeBtnActive]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
              {t} ({DEFAULT_POINTS[t]})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={styles.input}
        multiline
        placeholder="Outcome, next steps…"
        value={notes}
        onChangeText={setNotes}
      />

      <TouchableOpacity style={styles.btn} onPress={submit}>
        <Text style={styles.btnText}>Save activity</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  label: { fontWeight: '600', marginBottom: 8, marginTop: 8 },
  chips: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  chipText: { fontSize: 13 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  typeBtnActive: { backgroundColor: '#eef2ff', borderColor: '#6366f1' },
  typeText: { fontSize: 12, textTransform: 'capitalize' },
  typeTextActive: { color: '#6366f1', fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  btn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 32,
  },
  btnText: { color: '#fff', fontWeight: '600' },
});
