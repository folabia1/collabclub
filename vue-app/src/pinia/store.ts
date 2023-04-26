import { defineStore } from "pinia";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";

export type Artist = {
  id: string;
  name: string;
  photoUrl: string;
};
export type PathArtist = {
  id: string;
  name: string;
  photoUrl: string;
  track?: PathTrack;
};
export type Track = {
  id: string;
  name: string;
  artists: Artist[];
};
export type PathTrack = {
  name: string;
  artistNames: string[];
};

const getRandomStartingArtists = httpsCallable<
  { genreName: string | null | undefined },
  { genre: string; artists: Artist[] }
>(functions, "Spotify-getRandomStartingArtists");

const getArtistWithPhotoUrl = httpsCallable<{ artistId: string | undefined }, Artist>(
  functions,
  "Spotify-getArtistWithPhotoUrl"
);

type SearchQuery = {
  trackName: string;
  artistName: string;
  requireMultipleArtists: boolean;
  requireThisArtist: boolean;
  requireSimilarName: boolean;
  strictMode: boolean;
};
const searchForTracksWithQuery = httpsCallable<SearchQuery, Track[]>(functions, "Spotify-searchForTracksWithQuery");

export const useAppStore = defineStore("app", {
  // initial state
  state: () => ({
    genres: {} as { [index: string]: boolean },
    currentGameGenre: null as string | null,
    screen: "home",
    pathArtists: [] as PathArtist[],
    finalArtist: null as Artist | null,
    hasMadeAttempt: false,
    isLoadingResults: false,
    isLoadingNewArtists: false,
    suggestedTracks: [] as Track[],
    hadErrorFetchingResults: false,
    isGameOver: false,
    streak: 0,
  }),

  // computed values
  getters: {
    sortedGenresArray: (state) =>
      Object.entries(state.genres).sort((genreA, genreB) => {
        if (state.genres[genreA[0]] && !state.genres[genreB[0]]) return -1;
        else if (!state.genres[genreA[0]] && state.genres[genreB[0]]) return 1;
        else return 0;
      }),
    genreNames: (state) => Object.keys(state.genres),
    selectedGenres: (state) =>
      Object.entries(state.genres)
        .filter(([_, isSelected]) => isSelected)
        .map(([name, _]) => name),
    initialPathArtist: (state) => state.pathArtists[0],
    currentPathArtist: (state) => {
      if (state.pathArtists.length === 0) return null;
      return state.pathArtists[state.pathArtists.length - 1];
    },
    resultsMessage: (state) =>
      state.isLoadingResults
        ? "Loading..."
        : state.suggestedTracks.length === 0 && state.hasMadeAttempt
        ? "No results."
        : state.hadErrorFetchingResults
        ? "Error fetching results. Try again."
        : null,
  },

  // actions
  actions: {
    /* Screen */
    goToScreen(gameMode: string) {
      this.screen = gameMode;
      this.resetGame();
    },
    /* Genres */
    setAvailableGenres(avilableGenres: string[]) {
      avilableGenres.forEach((genreName) => {
        this.genres[genreName] = this.genres[genreName] || false;
      });
    },
    toggleGenreSelected(genreName: string) {
      this.genres[genreName] = !this.genres[genreName];
    },
    toggleAllGenresSelected(value?: boolean) {
      this.genreNames.forEach(
        (genreName) => (this.genres[genreName] = value === true || value === false ? value : this.genres[genreName])
      );
    },
    setCurrentGameGenre(genreName: string) {
      this.genres[genreName] = true;
      this.currentGameGenre = genreName;
    },
    resetCurrentGameGenre() {
      this.currentGameGenre = null;
    },
    chooseRandomGenreFromSelected() {
      if (!this.selectedGenres.length) this.toggleAllGenresSelected(true);
      this.currentGameGenre = this.selectedGenres[Math.floor(Math.random() * this.selectedGenres.length)];
    },
    /* Artists */
    pushPathArtist(artist: PathArtist) {
      this.pathArtists.push(artist);
    },
    setFinalArtist(artist: Artist) {
      this.finalArtist = artist;
    },
    setIsLoadingNewArtists(value: boolean) {
      this.isLoadingNewArtists = value;
    },
    async refreshArtists(correctAnswer: boolean) {
      if (correctAnswer) this.streak++;
      else this.streak = 0;

      this.chooseRandomGenreFromSelected();
      this.setIsLoadingNewArtists(true);
      try {
        const artistsResponse = await getRandomStartingArtists({ genreName: this.currentGameGenre });
        this.pathArtists = [];
        this.finalArtist = null;
        this.suggestedTracks = [];
        this.setHasMadeAttempt(false);
        this.pushPathArtist(artistsResponse.data.artists[0]);
        this.setFinalArtist(artistsResponse.data.artists[1]);
        this.setIsLoadingNewArtists(false);
      } catch (error) {
        console.error(error);
        this.setIsLoadingNewArtists(false);
      }
    },
    async handleUserSelectsArtist(artist: Artist, track: Track) {
      try {
        const fullArtist = (await getArtistWithPhotoUrl({ artistId: artist.id })).data;
        this.pushPathArtist({
          name: fullArtist.name,
          id: fullArtist.id,
          photoUrl: fullArtist.photoUrl,
          track: { name: track.name, artistNames: track.artists.map((artist) => artist.name) },
        });
        this.setSuggestedTracks([]);
        this.streak++;
      } catch {}
    },
    /* Suggested Tracks */
    setHasMadeAttempt(value: boolean) {
      this.hasMadeAttempt = value;
    },
    setIsLoadingResults(value: boolean) {
      this.isLoadingResults = value;
    },
    setSuggestedTracks(tracks: Track[]) {
      this.suggestedTracks = tracks;
    },
    setHadErrorFetchingResults(value: boolean) {
      this.hadErrorFetchingResults = value;
    },
    async suggestTracks(trackGuess: string) {
      this.setIsLoadingResults(true);
      this.setHasMadeAttempt(true);
      try {
        const tracksResponse = await searchForTracksWithQuery({
          trackName: trackGuess,
          artistName: this.currentPathArtist?.name ?? "",
          requireMultipleArtists: true,
          requireThisArtist: true,
          requireSimilarName: true,
          strictMode: false,
        });
        // display tracks for user to choose from
        this.setSuggestedTracks(tracksResponse.data);
      } finally {
        this.setIsLoadingResults(false);
      }
    },
    // Game Over
    setIsGameOver(value: boolean) {
      this.isGameOver = value;
    },
    resetGame() {
      // leave genres the same
      this.currentGameGenre = null;
      this.pathArtists = [];
      this.finalArtist = null;
      this.hasMadeAttempt = false;
      this.isLoadingResults = false;
      this.isLoadingNewArtists = false;
      this.suggestedTracks = [];
      this.hadErrorFetchingResults = false;
      this.isGameOver = false;
      this.streak = 0;
    },
  },

  // return { genres, screen, genreSelected };
});
