import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  Pressable, Platform, KeyboardAvoidingView, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../context/AuthContext';
import { useHangouts } from '../../../hooks/useHangouts';
import Button from '../../../components/Button';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';

type PlaceSuggestion = { place_id: number; display_name: string; name: string };

async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (query.length < 3) return [];
  const params = new URLSearchParams({ q: query, format: 'json', limit: '5', addressdetails: '0' });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'User-Agent': 'DadTimeApp/1.0' },
  });
  if (!res.ok) return [];
  const data: any[] = await res.json();
  return data.map(r => ({
    place_id: r.place_id,
    display_name: r.display_name,
    name: r.name || r.display_name.split(',')[0],
  }));
}

export default function AddOptionScreen() {
  const { hangoutId, defaultLocation } = useLocalSearchParams<{ hangoutId: string; defaultLocation?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { addOption } = useHangouts(session!.user.id);

  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 10, 0);
  const defaultEnd   = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [includeEnd, setIncludeEnd] = useState(true);
  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);
  const [location, setLocation] = useState(defaultLocation ?? '');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  function onLocationChange(text: string) {
    setLocation(text);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSuggestions(await searchPlaces(text));
    }, 400);
  }

  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const fmtTime = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  async function handleSave() {
    setError('');
    setLoading(true);
    try {
      await addOption(hangoutId, {
        starts_at: startDate,
        ends_at: includeEnd ? endDate : undefined,
        location: location.trim() || undefined,
        note: note.trim() || undefined,
      });
      router.back();
    } catch (e) {
      console.error('addOption failed:', e);
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.cancelBtn} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>PROPOSE A</Text>
            <Text style={styles.headerTitle}>TIME SLOT</Text>
          </View>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DATE</Text>
            <Pressable style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]} onPress={() => { setShowStartDate(!showStartDate); setShowStartTime(false); setShowEndTime(false); }}>
              <Text style={styles.chipEye}>DATE</Text>
              <Text style={styles.chipVal}>{fmtDate(startDate)}</Text>
            </Pressable>
            {showStartDate && (
              <DateTimePicker
                value={startDate} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={(_, d) => {
                  if (d) {
                    const s = new Date(startDate);
                    s.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                    const e2 = new Date(s.getTime() + (endDate.getTime() - startDate.getTime()));
                    setStartDate(s); setEndDate(e2);
                  }
                  if (Platform.OS !== 'ios') setShowStartDate(false);
                }}
                accentColor={Colors.primary}
              />
            )}
          </View>

          {/* Start + end time */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>TIME</Text>
            <View style={styles.timeRow}>
              <Pressable style={({ pressed }) => [styles.chip, { flex: 1 }, pressed && styles.chipPressed]} onPress={() => { setShowStartTime(!showStartTime); setShowStartDate(false); setShowEndTime(false); }}>
                <Text style={styles.chipEye}>FROM</Text>
                <Text style={styles.chipVal}>{fmtTime(startDate)}</Text>
              </Pressable>

              {includeEnd ? (
                <Pressable style={({ pressed }) => [styles.chip, { flex: 1 }, pressed && styles.chipPressed]} onPress={() => { setShowEndTime(!showEndTime); setShowStartDate(false); setShowStartTime(false); }}>
                  <Text style={styles.chipEye}>UNTIL</Text>
                  <Text style={styles.chipVal}>{fmtTime(endDate)}</Text>
                </Pressable>
              ) : (
                <Pressable style={styles.addEndBtn} onPress={() => setIncludeEnd(true)}>
                  <Text style={styles.addEndText}>+ End time</Text>
                </Pressable>
              )}
            </View>

            {includeEnd && (
              <Pressable onPress={() => setIncludeEnd(false)} hitSlop={8} style={styles.removeEnd}>
                <Text style={styles.removeEndText}>Remove end time</Text>
              </Pressable>
            )}

            {showStartTime && (
              <DateTimePicker value={startDate} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => { if (d) setStartDate(d); if (Platform.OS !== 'ios') setShowStartTime(false); }}
                accentColor={Colors.primary}
              />
            )}
            {showEndTime && (
              <DateTimePicker value={endDate} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => { if (d) setEndDate(d); if (Platform.OS !== 'ios') setShowEndTime(false); }}
                accentColor={Colors.primary}
              />
            )}
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>LOCATION <Text style={styles.optional}>(OPTIONAL)</Text></Text>
            <View style={styles.locationWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Start typing a place name…"
                placeholderTextColor={Colors.textFaint}
                value={location}
                onChangeText={onLocationChange}
                onFocus={() => location.length >= 3 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                maxLength={200}
                accessibilityLabel="Location"
              />
              {showSuggestions && suggestions.length > 0 && (
                <View style={styles.dropdown}>
                  <FlatList
                    data={suggestions} keyExtractor={item => String(item.place_id)}
                    keyboardShouldPersistTaps="handled" scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.dropdownDivider} />}
                    renderItem={({ item }) => (
                      <Pressable style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                        onPress={() => { setLocation(item.display_name); setSuggestions([]); setShowSuggestions(false); }}>
                        <Text style={styles.dropdownName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.dropdownAddress} numberOfLines={1}>{item.display_name.split(',').slice(1, 3).join(',').trim()}</Text>
                      </Pressable>
                    )}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Note */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>NOTE <Text style={styles.optional}>(OPTIONAL)</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. works around nap time, bring snacks…"
              placeholderTextColor={Colors.textFaint}
              value={note} onChangeText={setNote}
              maxLength={200} multiline numberOfLines={2} textAlignVertical="top"
              accessibilityLabel="Note"
            />
          </View>

          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

          <Button label="Propose This Time" onPress={handleSave} loading={loading} fullWidth style={styles.btn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4, backgroundColor: Colors.primary,
  },
  cancelBtn: { minWidth: 70, minHeight: 44, justifyContent: 'center' },
  cancelText: { ...Typography.bodyMd, color: 'rgba(255,255,255,0.75)' },
  headerCenter: { alignItems: 'center' },
  headerEyebrow: { ...Typography.label, color: 'rgba(255,255,255,0.5)', letterSpacing: 3, fontSize: 9 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.white, letterSpacing: 3 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  field: { gap: Spacing.xs },
  fieldLabel: { ...Typography.label, color: Colors.textFaint, letterSpacing: 1.5 },
  optional: { ...Typography.label, color: Colors.border, letterSpacing: 1 },
  chip: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 2,
    borderColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 2, ...Shadow.sm,
  },
  chipPressed: { opacity: 0.75 },
  chipEye: { ...Typography.label, color: Colors.primaryMid, letterSpacing: 1.5, fontSize: 9 },
  chipVal: { ...Typography.titleSm, color: Colors.primary },
  timeRow: { flexDirection: 'row', gap: Spacing.sm },
  addEndBtn: {
    flex: 1, borderRadius: Radius.md, borderWidth: 2, borderColor: Colors.border,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.sm,
  },
  addEndText: { ...Typography.bodySm, color: Colors.primaryMid, fontWeight: '600' },
  removeEnd: { alignSelf: 'flex-end' },
  removeEndText: { ...Typography.caption, color: Colors.textFaint },
  input: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 2,
    borderColor: Colors.border, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4,
    ...Typography.bodyMd, color: Colors.text, minHeight: 52,
  },
  textArea: { minHeight: 72, paddingTop: Spacing.sm + 4 },
  locationWrapper: { position: 'relative', zIndex: 10 },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, marginTop: 4, ...Shadow.md, overflow: 'hidden', zIndex: 20,
  },
  dropdownItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, gap: 2 },
  dropdownItemPressed: { backgroundColor: Colors.surfaceAlt },
  dropdownName: { ...Typography.titleSm, color: Colors.text },
  dropdownAddress: { ...Typography.bodySm, color: Colors.textFaint },
  dropdownDivider: { height: 1, backgroundColor: Colors.border },
  errorBox: { backgroundColor: Colors.noBg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.no, padding: Spacing.md },
  errorText: { ...Typography.bodySm, color: Colors.no, textAlign: 'center' },
  btn: { marginTop: Spacing.sm },
});
