import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  SafeAreaView, Pressable, Platform, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useEvents } from '../../hooks/useEvents';
import Button from '../../components/Button';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../constants/theme';

export default function CreateScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { createEvent } = useEvents(session!.user.id);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!title.trim()) {
      setError('Give it a name — what are you planning?');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createEvent({
        title: title.trim(),
        location: location.trim() || undefined,
        note: note.trim() || undefined,
        date,
      });
      router.back();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit',
  });

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.cancelBtn}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEyebrow}>NEW</Text>
            <Text style={styles.headerTitle}>HANGOUT</Text>
          </View>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* What */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WHAT'S HAPPENING</Text>
            <TextInput
              style={styles.input}
              placeholder="Game night, golf, bar crawl, poker…"
              placeholderTextColor={Colors.textFaint}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              autoFocus
              accessibilityLabel="Event name"
            />
          </View>

          {/* When */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WHEN</Text>
            <View style={styles.dateRow}>
              <Pressable
                style={({ pressed }) => [styles.dateChip, pressed && styles.dateChipPressed]}
                onPress={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false); }}
                accessibilityRole="button"
                accessibilityLabel={`Date: ${formattedDate}. Tap to change.`}
              >
                <Text style={styles.dateChipEye}>DATE</Text>
                <Text style={styles.dateChipVal}>{formattedDate}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.dateChip, pressed && styles.dateChipPressed]}
                onPress={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false); }}
                accessibilityRole="button"
                accessibilityLabel={`Time: ${formattedTime}. Tap to change.`}
              >
                <Text style={styles.dateChipEye}>TIME</Text>
                <Text style={styles.dateChipVal}>{formattedTime}</Text>
              </Pressable>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={(_, selected) => {
                  if (selected) {
                    const updated = new Date(date);
                    updated.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                    setDate(updated);
                  }
                  if (Platform.OS !== 'ios') setShowDatePicker(false);
                }}
                accentColor={Colors.primary}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={date}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => {
                  if (selected) {
                    const updated = new Date(date);
                    updated.setHours(selected.getHours(), selected.getMinutes());
                    setDate(updated);
                  }
                  if (Platform.OS !== 'ios') setShowTimePicker(false);
                }}
                accentColor={Colors.primary}
              />
            )}
          </View>

          {/* Where */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WHERE <Text style={styles.optional}>(OPTIONAL)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Address, spot name, TBD…"
              placeholderTextColor={Colors.textFaint}
              value={location}
              onChangeText={setLocation}
              maxLength={120}
              accessibilityLabel="Event location"
            />
          </View>

          {/* Note */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>DETAILS <Text style={styles.optional}>(OPTIONAL)</Text></Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Anything the crew needs to know…"
              placeholderTextColor={Colors.textFaint}
              value={note}
              onChangeText={setNote}
              maxLength={500}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              accessibilityLabel="Event details"
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Button
            label="Create & Share"
            onPress={handleCreate}
            loading={loading}
            fullWidth
            style={styles.createBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    backgroundColor: Colors.primary,
  },
  cancelBtn: {
    minWidth: 70,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    ...Typography.bodyMd,
    color: 'rgba(255,255,255,0.75)',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 0,
  },
  headerEyebrow: {
    ...Typography.label,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 3,
    fontSize: 9,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.white,
    letterSpacing: 3,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  field: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    ...Typography.label,
    color: Colors.textFaint,
    letterSpacing: 1.5,
  },
  optional: {
    ...Typography.label,
    color: Colors.border,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    ...Typography.bodyMd,
    color: Colors.text,
    minHeight: 52,
  },
  textArea: {
    minHeight: 88,
    paddingTop: Spacing.sm + 4,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dateChip: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: 2,
    ...Shadow.sm,
  },
  dateChipPressed: {
    opacity: 0.75,
  },
  dateChipEye: {
    ...Typography.label,
    color: Colors.primaryMid,
    letterSpacing: 1.5,
    fontSize: 9,
  },
  dateChipVal: {
    ...Typography.titleSm,
    color: Colors.primary,
  },
  errorBox: {
    backgroundColor: Colors.noBg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.no,
    padding: Spacing.md,
  },
  errorText: {
    ...Typography.bodySm,
    color: Colors.no,
    textAlign: 'center',
  },
  createBtn: {
    marginTop: Spacing.sm,
  },
});
