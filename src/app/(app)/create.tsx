import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  SafeAreaView, Pressable, Platform, KeyboardAvoidingView, FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useHangouts } from '../../hooks/useHangouts';
import Button from '../../components/Button';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

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

export default function CreateScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { createHangout } = useHangouts(session!.user.id);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
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

  async function handleCreate() {
    if (!title.trim()) {
      setError('Give it a name — what are you planning?');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const hangout = await createHangout({
        title: title.trim(),
        note: note.trim() || undefined,
        location: location.trim() || undefined,
      });
      router.replace(`/(app)/hangout/${hangout!.id}` as any);
    } catch (e) {
      console.error('createHangout failed:', e);
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>NEW</Text>
            <Text style={styles.headerTitle}>HANGOUT</Text>
          </View>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.hint}>
            Name it, then invite the crew — everyone proposes times and votes on what works.
          </Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WHAT'S THE PLAN</Text>
            <TextInput
              style={styles.input}
              placeholder="Park day, poker night, golf morning…"
              placeholderTextColor={Colors.textFaint}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              autoFocus
              accessibilityLabel="Hangout name"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WHERE <Text style={styles.optional}>(OPTIONAL)</Text></Text>
            <Text style={styles.fieldHint}>Set a location and it'll pre-fill every time slot.</Text>
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
                    data={suggestions}
                    keyExtractor={item => String(item.place_id)}
                    keyboardShouldPersistTaps="handled"
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.dropdownDivider} />}
                    renderItem={({ item }) => (
                      <Pressable
                        style={({ pressed }) => [styles.dropdownItem, pressed && styles.dropdownItemPressed]}
                        onPress={() => { setLocation(item.display_name); setSuggestions([]); setShowSuggestions(false); }}
                      >
                        <Text style={styles.dropdownName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.dropdownAddress} numberOfLines={1}>
                          {item.display_name.split(',').slice(1, 3).join(',').trim()}
                        </Text>
                      </Pressable>
                    )}
                  />
                </View>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DETAILS <Text style={styles.optional}>(OPTIONAL)</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any context the crew needs to know…"
              placeholderTextColor={Colors.textFaint}
              value={note}
              onChangeText={setNote}
              maxLength={400}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Hangout details"
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button label="Create & Invite Crew" onPress={handleCreate} loading={loading} fullWidth style={styles.btn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.primary,
  },
  cancelBtn: { minWidth: 70, minHeight: 44, justifyContent: 'center' },
  cancelText: { ...Typography.bodyMd, color: 'rgba(255,255,255,0.75)' },
  headerCenter: { alignItems: 'center' },
  headerEyebrow: { ...Typography.label, color: 'rgba(255,255,255,0.5)', letterSpacing: 3, fontSize: 9 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.white, letterSpacing: 3 },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  hint: { ...Typography.bodyMd, color: Colors.textDim, lineHeight: 22 },
  field: { gap: Spacing.xs },
  fieldLabel: { ...Typography.label, color: Colors.textFaint, letterSpacing: 1.5 },
  fieldHint: { ...Typography.bodySm, color: Colors.textFaint, marginTop: -2 },
  optional: { ...Typography.label, color: Colors.border, letterSpacing: 1 },
  input: {
    backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 2,
    borderColor: Colors.border, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4, ...Typography.bodyMd, color: Colors.text, minHeight: 52,
  },
  textArea: { minHeight: 88, paddingTop: Spacing.sm + 4 },
  locationWrapper: { position: 'relative', zIndex: 10 },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0,
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, marginTop: 4,
    ...Shadow.md, overflow: 'hidden', zIndex: 20,
  },
  dropdownItem: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, gap: 2 },
  dropdownItemPressed: { backgroundColor: Colors.surfaceAlt },
  dropdownName: { ...Typography.titleSm, color: Colors.text },
  dropdownAddress: { ...Typography.bodySm, color: Colors.textFaint },
  dropdownDivider: { height: 1, backgroundColor: Colors.border },
  errorBox: {
    backgroundColor: Colors.noBg, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.no, padding: Spacing.md,
  },
  errorText: { ...Typography.bodySm, color: Colors.no, textAlign: 'center' },
  btn: { marginTop: Spacing.sm },
});
