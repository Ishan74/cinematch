const API_KEY = 'aeea545315bdaafcd699ed2d5bef65ed';
const BASE_URL = 'https://api.themoviedb.org/3';
export const IMG_BASE = 'https://image.tmdb.org/t/p/w780';

const GENRE_MAP: Record<string, number> = {
  'Action': 28, 'Comedy': 35, 'Thriller': 53, 'Romance': 10749,
  'Sci-Fi': 878, 'Horror': 27, 'Drama': 18, 'Animation': 16,
  'Mystery': 9648, 'Biography': 36, 'Musical': 10402,
  'Sport': 9805, 'Family': 10751, 'Documentary': 99,
  'Adventure': 12, 'Crime': 80,
};

export async function fetchMovies(genres: string[] = [], languages: string[] = ['en'], page = 1) {
  try {
    const genreIds = genres
      .map(g => GENRE_MAP[g])
      .filter(Boolean)
      .join(',');

    const lang = languages[0] || 'en';

    const params = new URLSearchParams({
      api_key: API_KEY,
      sort_by: 'popularity.desc',
      'vote_count.gte': '50',
      language: `${lang}-US`,
      with_original_language: languages.join('|'),
      page: String(page),
      ...(genreIds && { with_genres: genreIds }),
    });

    const url = `${BASE_URL}/discover/movie?${params}`;
    console.log('Fetching page', page, 'genres:', genreIds, 'langs:', languages.join('|'));
    const res = await fetch(url);
    const data = await res.json();
    return {
      results: data.results ?? [],
      totalPages: data.total_pages ?? 1,
    };
  } catch (e) {
    console.error('TMDB fetch failed:', e);
    return { results: [], totalPages: 1 };
  }
}

export async function fetchWatchProviders(movieId: number) {
  try {
    const url = `${BASE_URL}/movie/${movieId}/watch/providers?api_key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results?.AU || data.results?.US || null;
  } catch (e) {
    return null;
  }
}