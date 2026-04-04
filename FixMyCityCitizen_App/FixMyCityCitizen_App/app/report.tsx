import { View, Text, Pressable, TextInput, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import PrimaryButton from '../components/PrimaryButton';

const CATEGORIES = ['Pothole', 'Garbage', 'Water Leak', 'Streetlight', 'Other'];

export default function ReportScreen() {
  const [description, setDescription]     = useState('');
  const [selectedCategory, setCategory]   = useState('');

  const handleSubmit = () => {
    if (!selectedCategory || !description.trim()) {
      Alert.alert('Incomplete', 'Please select a category and add a description.');
      return;
    }
    router.push('/success');
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Report Issue</Text>
        <Text style={styles.subtitle}>Help us fix your neighbourhood</Text>
      </View>

      {/* Image Upload */}
      <Text style={styles.label}>Photo</Text>
      <Pressable style={styles.imagePlaceholder}>
        <Text style={styles.cameraEmoji}>📷</Text>
        <Text style={styles.imageText}>Tap to upload image</Text>
        <Text style={styles.imageHint}>JPG or PNG, max 5MB</Text>
      </Pressable>

      {/* Category Selector */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Describe the issue in detail..."
        placeholderTextColor="#9CA3AF"
        multiline
        numberOfLines={5}
        value={description}
        onChangeText={setDescription}
        textAlignVertical="top"
      />

      {/* Submit */}
      <View style={styles.submitWrap}>
        <PrimaryButton label="Submit Report" onPress={handleSubmit} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F7F8FA' },
  container: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 28 },
  back: { fontSize: 15, color: '#2563EB', fontWeight: '500', marginBottom: 14 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 20,
  },
  imagePlaceholder: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 32,
    alignItems: 'center',
  },
  cameraEmoji: { fontSize: 32, marginBottom: 8 },
  imageText: { fontSize: 15, color: '#2563EB', fontWeight: '600' },
  imageHint: { fontSize: 12, color: '#93C5FD', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#FFFFFF' },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1A2E',
    minHeight: 130,
    lineHeight: 22,
  },
  submitWrap: { marginTop: 32 },
});