import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  SafeAreaView, Pressable, ActivityIndicator, Platform,
  KeyboardAvoidingView,
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
  const [date, setDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!title.trim()) {
      setError('Give it a name.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createEvent({
        title: title.trim(),
        location: location.trim() || undefined,
        date,
      });
      router.back();
    } catch (e) {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
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
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={styles.cancel}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>New Hangout</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WHAT'S HAPPENING</Text>
            <TextInput
              style={styles.input}
              placeholder="Game night, golf, bar crawl…"
              placeholderTextColor={Colors.textFaint}
              value={title}
              onChangeText={setTitle}
              maxLength={80}
              autoFocus
            />
          </View>

          {/* Date */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WHEN</Text>
            <View style={styles.dateRow}>
              <Pressable
                style={styles.dateChip}
                onPress={() => { setShowDatePicker(!showDatePicker); setShowTimePicker(false); }}
              >
                <Text style={styles.dateChipText}>{formattedDate}</Text>
              </Pressable>
              <Pressable
                style={styles.dateChip}
                onPress={() => { setShowTimePicker(!showTimePicker); setShowDatePicker(false); }}
              >
                <Text style={styles.dateChipText}>{formattedTime}</Text>
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

          {/* Location */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>WHERE (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              placeholder="Address or spot name"
              placeholderTextColor={Colors.textFaint}
              value={location}
              onChangeText={setLocation}
              maxLength={120}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

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
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.titleMd,
    color: Colors.text,
  },
  cancel: {
    ...Typography.bodyMd,
    color: Colors.primary,
    minWidth: 60,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  field: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    ...Typography.label,
    color: Colors.textFaint,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    ...Typography.bodyMd,
    color: Colors.text,
    minHeight: 52,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  dateChip: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    ...Shadow.sm,
  },
  dateChipText: {
    ...Typography.titleSm,
    color: Colors.primary,
  },
  error: {
    ...Typography.bodySm,
    color: Colors.no,
    textAlign: 'center',
  },
  createBtn: {
    marginTop: Spacing.sm,
  },
});
