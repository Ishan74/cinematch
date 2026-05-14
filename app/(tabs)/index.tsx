import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>
          Cine<Text style={styles.logoAccent}>Match</Text>
        </Text>
        <Text style={styles.tagline}>Group movie night, solved.</Text>
      </View>

      {/* Hero text */}
      <View style={styles.heroContainer}>
        <Text style={styles.heroTitle}>Stop arguing.{'\n'}Start watching.</Text>
        <Text style={styles.heroSub}>
          Everyone swipes. When your group all likes the same movie — it's a match.
        </Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/session')}>
          <Text style={styles.btnPrimaryText}>Start a session →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost}>
          <Text style={styles.btnGhostText}>Join existing session</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080810',
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'flex-start',
  },
  logoText: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '800',
    color: '#f0ede6',
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: '#FF6B6B',
  },
  tagline: {
    fontSize: 13,
    color: '#666672',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#f0ede6',
    lineHeight: 52,
    letterSpacing: -1.5,
    marginBottom: 20,
  },
  heroSub: {
    fontSize: 16,
    color: '#666672',
    lineHeight: 26,
    fontWeight: '300',
  },
  buttonContainer: {
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#2a2a35',
  },
  btnGhostText: {
    color: '#666672',
    fontSize: 14,
  },
});