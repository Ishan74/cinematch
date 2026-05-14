import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../services/supabase';
import { fetchMovies, IMG_BASE } from '../services/tmdb';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const PREFETCH_THRESHOLD = 5; // fetch more when 5 cards left

type Movie = {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  overview: string;
  poster_path: string;
  backdrop_path: string;
};

export default function SwipeScreen() {
  const { sessionId, sessionCode, userName, genres, languages } = useLocalSearchParams<{
    sessionId: string;
    sessionCode: string;
    userName: string;
    genres: string;
    languages: string;
  }>();

  const position = useRef(new Animated.ValueXY()).current;
  const currentIndexRef = useRef(0);
  const moviesRef = useRef<Movie[]>([]);
  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matched, setMatched] = useState<Movie | null>(null);

    const genreList = genres ? genres.split(',') : [];
    const languageList = languages ? languages.split(',') : ['en'];

  const loadMoreMovies = async (page: number) => {
  if (isFetchingRef.current) return;
  isFetchingRef.current = true;
  try {
      const { results } = await fetchMovies(genreList, languageList, page);
      if (results.length > 0) {
        moviesRef.current = [...moviesRef.current, ...results];
        setMovies(prev => [...prev, ...results]);
        pageRef.current = page + 1;
      }
    } finally {
      isFetchingRef.current = false;
    }
  };

  // Initial fetch
  useEffect(() => {
    loadMoreMovies(1).then(() => setLoading(false));
  }, []);

  // Realtime match subscription
  useEffect(() => {
    if (!sessionId) return;
    const subscription = supabase
      .channel(`votes:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
        filter: `session_id=eq.${sessionId}`,
      }, async (payload) => {
        const newVote = payload.new as any;
        if (newVote.vote !== 'like') return;

        const { data: allVotes } = await supabase
          .from('votes').select('*')
          .eq('session_id', sessionId)
          .eq('movie_id', newVote.movie_id)
          .eq('vote', 'like');

        const { data: members } = await supabase
          .from('session_members').select('*')
          .eq('session_id', sessionId);

        const memberCount = members?.length ?? 1;
        const likeCount = allVotes?.length ?? 0;

        if (likeCount >= memberCount) {
          const matchedMovie = moviesRef.current.find(m => m.id === newVote.movie_id);
          if (matchedMovie) setMatched(matchedMovie);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [sessionId]);

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  };

  const swipeCard = (direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(async () => {
      position.setValue({ x: 0, y: 0 });
      const idx = currentIndexRef.current;
      const movie = moviesRef.current[idx];

      if (sessionId && movie) {
        const { error } = await supabase.from('votes').insert({
          session_id: sessionId,
          user_name: userName || 'Anonymous',
          movie_id: movie.id,
          movie_title: movie.title,
          vote: direction === 'right' ? 'like' : 'nope',
        });
        if (error) console.error('Vote error:', error);
      }

      const nextIdx = idx + 1;
      currentIndexRef.current = nextIdx;
      setCurrentIndex(nextIdx);

      // Prefetch more movies when running low
      const remaining = moviesRef.current.length - nextIdx;
      if (remaining <= PREFETCH_THRESHOLD) {
        loadMoreMovies(pageRef.current);
      }

      if (direction === 'right' && sessionId && movie) {
        const { data: allVotes } = await supabase
          .from('votes').select('*')
          .eq('session_id', sessionId)
          .eq('movie_id', movie.id)
          .eq('vote', 'like');

        const { data: members } = await supabase
          .from('session_members').select('*')
          .eq('session_id', sessionId);

        const memberCount = members?.length ?? 1;
        const likeCount = allVotes?.length ?? 0;
        console.log(`${movie.title} — ${likeCount}/${memberCount}`);
        if (likeCount >= memberCount) setMatched(movie);
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > Math.abs(gesture.dy * 2);
      },
      onPanResponderGrant: () => {
        position.setOffset({ x: (position.x as any)._value, y: 0 });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        position.flattenOffset();
        if (gesture.dx > SWIPE_THRESHOLD) swipeCard('right');
        else if (gesture.dx < -SWIPE_THRESHOLD) swipeCard('left');
        else resetPosition();
      },
      onPanResponderTerminate: () => {
        position.flattenOffset();
        resetPosition();
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp',
  });

  const cardScale = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: [0.95, 1, 0.95],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.matchContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={[styles.matchSub, { marginTop: 16 }]}>Finding movies...</Text>
        {sessionCode && (
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            <Text style={{ color: '#555', fontSize: 12, marginBottom: 6 }}>SESSION CODE</Text>
            <Text style={{ color: '#FF6B6B', fontSize: 28, fontWeight: '800', letterSpacing: 4 }}>
              {sessionCode}
            </Text>
            <Text style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Share with friends</Text>
          </View>
        )}
      </View>
    );
  }

  if (matched) {
    return (
      <View style={styles.matchContainer}>
        <StatusBar style="light" />
        <Text style={styles.matchEmoji}>🎉</Text>
        <Text style={styles.matchEyebrow}>IT'S A MATCH</Text>
        <Text style={styles.matchTitle}>Everyone agrees!</Text>
        <Text style={styles.matchSub}>Your group matched on</Text>
        <View style={styles.matchCard}>
          {matched.poster_path && (
            <Image
              source={{ uri: `${IMG_BASE}${matched.poster_path}` }}
              style={styles.matchPoster}
            />
          )}
          <Text style={styles.matchMovie}>{matched.title}</Text>
          <Text style={styles.matchMeta}>
            {matched.release_date?.split('-')[0]} · ★ {matched.vote_average.toFixed(1)}
          </Text>
          <View style={styles.matchBadge}>
            <Text style={styles.matchBadgeText}>✓ 100% group match</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/')}>
          <Text style={styles.btnPrimaryText}>Back to home →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const movie = movies[currentIndex];
  const nextMovie = movies[currentIndex + 1];

  if (!movie) {
    return (
      <View style={styles.matchContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={[styles.matchSub, { marginTop: 16 }]}>Loading more movies...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>CineMatch</Text>
          <Text style={styles.sessionInfo}>
            {sessionCode ? `${sessionCode} · ` : ''}{currentIndex} swiped
          </Text>
        </View>
        <View style={styles.progressPills}>
          {[0,1,2,3,4,5,6,7].map(i => (
            <View key={i} style={[
              styles.pill,
              i < (currentIndex % 8) && styles.pillDone,
              i === (currentIndex % 8) && styles.pillActive,
            ]} />
          ))}
        </View>
      </View>

      <View style={styles.votersRow}>
        <View style={styles.voterChip}>
          <View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} />
          <Text style={styles.voterText}>{userName || 'You'} 👀</Text>
        </View>
      </View>

      <View style={styles.cardStack}>
        {/* Back card */}
        {nextMovie && (
          <View style={[styles.card, styles.cardBack, { backgroundColor: '#1a1a24' }]}>
            {nextMovie.backdrop_path && (
              <Image
                source={{ uri: `${IMG_BASE}${nextMovie.backdrop_path}` }}
                style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
                resizeMode="cover"
              />
            )}
            <View style={styles.overlay} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{nextMovie.title}</Text>
            </View>
          </View>
        )}

        {/* Top card */}
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: '#1a1a24' },
            {
              transform: [
                { translateX: position.x },
                { rotate },
                { scale: cardScale },
              ]
            },
          ]}
          {...panResponder.panHandlers}
        >
          {movie.backdrop_path && (
            <Image
              source={{ uri: `${IMG_BASE}${movie.backdrop_path}` }}
              style={[StyleSheet.absoluteFillObject, { borderRadius: 20 }]}
              resizeMode="cover"
            />
          )}
          <View style={styles.overlay} />

          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOpacity }]}>
            <Text style={styles.stampLikeText}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOpacity }]}>
            <Text style={styles.stampNopeText}>NOPE</Text>
          </Animated.View>

          <View style={styles.cardRating}>
            <Text style={styles.cardRatingText}>★ {movie.vote_average.toFixed(1)}</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardYear}>{movie.release_date?.split('-')[0]}</Text>
            <Text style={styles.cardTitle}>{movie.title}</Text>
            <Text style={styles.cardOverview} numberOfLines={2}>{movie.overview}</Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.actionBtns}>
        <TouchableOpacity
          style={styles.btnNope}
          onPress={() => swipeCard('left')}
          activeOpacity={0.7}
        >
          <Text style={styles.btnNopeText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnLike}
          onPress={() => swipeCard('right')}
          activeOpacity={0.7}
        >
          <Text style={styles.btnLikeText}>♥</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>swipe or tap · {movies.length - currentIndex} cards left</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#080810',
    paddingTop: 60, paddingBottom: 32, paddingHorizontal: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  backBtn: {
    width: 36, height: 36, backgroundColor: '#1a1a24',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: '#2a2a35',
  },
  backText: { color: '#888', fontSize: 18 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#f0ede6' },
  sessionInfo: { fontSize: 11, color: '#666672' },
  progressPills: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  pill: { width: 16, height: 4, borderRadius: 2, backgroundColor: '#2a2a35' },
  pillDone: { backgroundColor: '#FF6B6B' },
  pillActive: { backgroundColor: '#ff9494' },
  votersRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  voterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#1a1a24', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 0.5, borderColor: '#2a2a35',
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  voterText: { fontSize: 11, color: '#ccc' },
  cardStack: { flex: 1, position: 'relative', marginBottom: 16 },
  card: {
    position: 'absolute', width: '100%', height: '100%',
    borderRadius: 20, padding: 20, justifyContent: 'flex-end', overflow: 'hidden',
  },
  cardBack: { transform: [{ scale: 0.95 }, { translateY: 10 }] },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  stamp: {
    position: 'absolute', top: '38%', left: '50%',
    borderWidth: 3, borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16, zIndex: 10,
  },
  stampLike: { borderColor: '#4ade80', transform: [{ translateX: -55 }, { rotate: '-15deg' }] },
  stampNope: { borderColor: '#FF6B6B', transform: [{ translateX: -55 }, { rotate: '15deg' }] },
  stampLikeText: { fontSize: 28, fontWeight: '900', color: '#4ade80' },
  stampNopeText: { fontSize: 28, fontWeight: '900', color: '#FF6B6B' },
  cardRating: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, zIndex: 5,
  },
  cardRatingText: { fontSize: 12, color: '#FFD700' },
  cardContent: { position: 'relative', zIndex: 1 },
  cardYear: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  cardTitle: { fontSize: 26, fontWeight: '800', color: '#fff', lineHeight: 30 },
  cardOverview: { fontSize: 12, color: 'rgba(255,255,255,0.65)', lineHeight: 18, marginTop: 6 },
  actionBtns: { flexDirection: 'row', justifyContent: 'center', gap: 28, marginBottom: 8 },
  btnNope: {
    width: 66, height: 66, borderRadius: 33, backgroundColor: '#1a1a24',
    borderWidth: 0.5, borderColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center',
  },
  btnNopeText: { fontSize: 26, color: '#FF6B6B' },
  btnLike: {
    width: 66, height: 66, borderRadius: 33, backgroundColor: '#1a1a24',
    borderWidth: 0.5, borderColor: '#4ade80', alignItems: 'center', justifyContent: 'center',
  },
  btnLikeText: { fontSize: 26, color: '#4ade80' },
  hint: { textAlign: 'center', fontSize: 11, color: '#444' },
  matchContainer: {
    flex: 1, backgroundColor: '#080810',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  matchEmoji: { fontSize: 64, marginBottom: 16 },
  matchEyebrow: { fontSize: 11, color: '#FF6B6B', letterSpacing: 2, marginBottom: 8 },
  matchTitle: { fontSize: 36, fontWeight: '800', color: '#f0ede6', marginBottom: 4 },
  matchSub: { fontSize: 14, color: '#666672', marginBottom: 28 },
  matchCard: {
    backgroundColor: '#1a1a24', borderRadius: 20, padding: 24,
    width: '100%', marginBottom: 28, borderWidth: 0.5,
    borderColor: '#2a2a35', alignItems: 'center',
  },
  matchPoster: { width: 100, height: 150, borderRadius: 10, marginBottom: 16 },
  matchMovie: { fontSize: 22, fontWeight: '800', color: '#f0ede6', marginBottom: 4, textAlign: 'center' },
  matchMeta: { fontSize: 13, color: '#666672', marginBottom: 12 },
  matchBadge: {
    backgroundColor: 'rgba(74,222,128,0.1)', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 0.5, borderColor: 'rgba(74,222,128,0.3)',
  },
  matchBadgeText: { fontSize: 13, color: '#4ade80' },
  btnPrimary: {
    backgroundColor: '#FF6B6B', borderRadius: 14,
    paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});