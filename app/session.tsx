import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { generateCode, supabase } from '../services/supabase';

const GENRES = [
  { label: '💥 Action', value: 'Action' },
  { label: '😂 Comedy', value: 'Comedy' },
  { label: '😱 Thriller', value: 'Thriller' },
  { label: '❤️ Romance', value: 'Romance' },
  { label: '🧠 Sci-Fi', value: 'Sci-Fi' },
  { label: '🧟 Horror', value: 'Horror' },
  { label: '🎭 Drama', value: 'Drama' },
  { label: '🎨 Animation', value: 'Animation' },
  { label: '🔍 Mystery', value: 'Mystery' },
  { label: '📚 Biography', value: 'Biography' },
  { label: '🎵 Musical', value: 'Musical' },
  { label: '🥊 Sport', value: 'Sport' },
  { label: '👨‍👩‍👧 Family', value: 'Family' },
  { label: '🌍 Documentary', value: 'Documentary' },
  { label: '🗡️ Adventure', value: 'Adventure' },
  { label: '😈 Crime', value: 'Crime' },
];

const LANGUAGES = [
  { label: '🇺🇸 English', value: 'en' },
  { label: '🇮🇳 Hindi', value: 'hi' },
  { label: '🇪🇸 Spanish', value: 'es' },
  { label: '🇫🇷 French', value: 'fr' },
  { label: '🇰🇷 Korean', value: 'ko' },
  { label: '🇯🇵 Japanese', value: 'ja' },
  { label: '🇮🇹 Italian', value: 'it' },
  { label: '🇩🇪 German', value: 'de' },
  { label: '🇧🇷 Portuguese', value: 'pt' },
  { label: '🇨🇳 Chinese', value: 'zh' },
];

const VIBES = [
  { label: '😴 Easy watch', value: 'easy' },
  { label: '🤔 Make me think', value: 'thinker' },
  { label: '😭 Have a cry', value: 'cry' },
  { label: '😂 Laugh out loud', value: 'laugh' },
  { label: '😬 Edge of my seat', value: 'edge' },
  { label: '✨ Feel good', value: 'feelgood' },
];

const ERAS = [
  { label: '🕰️ Classic (pre-90s)', value: 'classic' },
  { label: '📼 90s & 00s', value: '90s00s' },
  { label: '🎬 2010s', value: '2010s' },
  { label: '🆕 Recent (2020+)', value: 'recent' },
];

export default function SessionScreen() {
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Action', 'Thriller']);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['en']);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [selectedEras, setSelectedEras] = useState<string[]>([]);
  const [userName, setUserName] = useState('');
  const [actors, setActors] = useState('');
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const createSession = async () => {
    if (!userName.trim()) return alert('Enter your name first!');
    setLoading(true);
    try {
      const code = generateCode();
      const { data, error } = await supabase
        .from('sessions')
        .insert({ code, host_name: userName.trim(), status: 'active' })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('session_members').insert({
        session_id: data.id,
        user_name: userName.trim(),
      });

      router.push({
        pathname: '/swipe',
        params: {
          sessionId: data.id,
          sessionCode: code,
          userName: userName.trim(),
          languages: selectedLanguages.join(','),
          genres: selectedGenres.join(','),
        },
      });
    } catch (e) {
      alert('Failed to create session. Try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async () => {
    if (!userName.trim()) return alert('Enter your name first!');
    if (!joinCode.trim()) return alert('Enter a session code!');
    setJoining(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select()
        .eq('code', joinCode.trim().toUpperCase())
        .single();

      if (error || !data) throw new Error('Session not found');

      await supabase.from('session_members').insert({
        session_id: data.id,
        user_name: userName.trim(),
      });

      router.push({
        pathname: '/swipe',
        params: {
          sessionId: data.id,
          sessionCode: data.code,
          userName: userName.trim(),
        },
      });
    } catch (e) {
      alert('Session not found. Check the code and try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Fixed header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>New session</Text>
          <Text style={styles.headerSub}>Customise your movie night</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name..."
            placeholderTextColor="#444"
            value={userName}
            onChangeText={setUserName}
            autoCapitalize="words"
          />
        </View>

        {/* Genres */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>GENRES</Text>
          <Text style={styles.sectionHint}>Pick as many as you like</Text>
          <View style={styles.chipGrid}>
            {GENRES.map(g => (
              <TouchableOpacity
                key={g.value}
                style={[styles.chip, selectedGenres.includes(g.value) && styles.chipSelected]}
                onPress={() => toggle(selectedGenres, g.value, setSelectedGenres)}
              >
                <Text style={[styles.chipText, selectedGenres.includes(g.value) && styles.chipTextSelected]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Vibe */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>TONIGHT'S VIBE</Text>
          <Text style={styles.sectionHint}>What mood are you in?</Text>
          <View style={styles.chipGrid}>
            {VIBES.map(v => (
              <TouchableOpacity
                key={v.value}
                style={[styles.chip, selectedVibes.includes(v.value) && styles.chipSelected]}
                onPress={() => toggle(selectedVibes, v.value, setSelectedVibes)}
              >
                <Text style={[styles.chipText, selectedVibes.includes(v.value) && styles.chipTextSelected]}>
                  {v.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>LANGUAGES</Text>
          <Text style={styles.sectionHint}>Include movies in these languages</Text>
          <View style={styles.chipGrid}>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l.value}
                style={[styles.chip, selectedLanguages.includes(l.value) && styles.chipSelected]}
                onPress={() => toggle(selectedLanguages, l.value, setSelectedLanguages)}
              >
                <Text style={[styles.chipText, selectedLanguages.includes(l.value) && styles.chipTextSelected]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Era */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ERA</Text>
          <Text style={styles.sectionHint}>How old should the movies be?</Text>
          <View style={styles.chipGrid}>
            {ERAS.map(e => (
              <TouchableOpacity
                key={e.value}
                style={[styles.chip, selectedEras.includes(e.value) && styles.chipSelected]}
                onPress={() => toggle(selectedEras, e.value, setSelectedEras)}
              >
                <Text style={[styles.chipText, selectedEras.includes(e.value) && styles.chipTextSelected]}>
                  {e.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Actors */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>FAVOURITE ACTORS</Text>
          <Text style={styles.sectionHint}>Optional — separate with commas</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Tom Hanks, Priyanka Chopra..."
            placeholderTextColor="#444"
            value={actors}
            onChangeText={setActors}
          />
        </View>

        {/* Join existing */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>JOIN EXISTING SESSION</Text>
          <Text style={styles.sectionHint}>Have a code? Jump straight in</Text>
          <View style={styles.joinRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="e.g. XKQ72P"
              placeholderTextColor="#444"
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity style={styles.joinBtn} onPress={joinSession}>
              {joining
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.joinBtnText}>Join →</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Fixed bottom button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.btnPrimary} onPress={createSession} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnPrimaryText}>Create session →</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080810' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#1a1a24',
  },
  backBtn: {
    width: 38, height: 38, backgroundColor: '#1a1a24',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: '#2a2a35',
  },
  backText: { color: '#888', fontSize: 18 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#f0ede6', fontFamily: 'System' },
  headerSub: { fontSize: 12, color: '#555', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 24 },
  section: { marginBottom: 28 },
  sectionLabel: {
    fontSize: 11, color: '#FF6B6B',
    letterSpacing: 1.5, marginBottom: 4, fontWeight: '600',
  },
  sectionHint: { fontSize: 12, color: '#555', marginBottom: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#111120',
    borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 0.5, borderColor: '#2a2a35',
  },
  chipSelected: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderColor: '#FF6B6B',
  },
  chipText: { fontSize: 13, color: '#666' },
  chipTextSelected: { color: '#FF6B6B', fontWeight: '600' },
  input: {
    backgroundColor: '#111120',
    borderRadius: 12, padding: 14,
    fontSize: 14, color: '#f0ede6',
    borderWidth: 0.5, borderColor: '#2a2a35',
  },
  joinRow: { flexDirection: 'row', gap: 10 },
  joinBtn: {
    backgroundColor: '#1a1a24', borderRadius: 12,
    paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: '#2a2a35', minWidth: 80,
  },
  joinBtnText: { color: '#f0ede6', fontSize: 14, fontWeight: '600' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#080810',
    paddingHorizontal: 24, paddingBottom: 36, paddingTop: 16,
    borderTopWidth: 0.5, borderTopColor: '#1a1a24',
  },
  btnPrimary: {
    backgroundColor: '#FF6B6B', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});