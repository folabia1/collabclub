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

export const useAppStore = defineStore("app", {
  // initial state
  state: () => ({
    genres: {
      "hip-hop": true,
      "afro-beats": false,
      "uk rap": false,
      "charts": false,
      "latinx": false,
      "old-school hip-hop": false,
    } as { [index: string]: boolean },
    currentGameGenre: null as string | null,
    screen: "home",
    pathArtists: [] as PathArtist[],
    finalArtist: null as Artist | null,
    hasMadeAttempt: false,
    isLoadingResults: false,
    isLoadingNewArtists: false,
    suggestedTracks: [] as Track[],
    hadErrorFetchingResults: false,
  }),

  // computed values
  getters: {
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
    selectDefaultGenres() {
      this.genreNames.slice(0, 3).forEach((genreName) => {
        this.genres[genreName] = true;
      });
    },
    setCurrentGameGenre(genreName: string) {
      this.genres[genreName] = true;
      this.currentGameGenre = genreName;
    },
    resetCurrentGameGenre() {
      this.currentGameGenre = null;
    },
    setRandomCurrentGameGenreFromSelected() {
      this.currentGameGenre = this.selectedGenres[Math.floor(Math.random() * this.selectedGenres.length)];
    },
    /* Artists */
    resetPathArtistsToEmpty() {
      this.pathArtists = [];
      this.finalArtist = null;
    },
    pushPathArtist(artist: PathArtist) {
      this.pathArtists.push(artist);
    },
    setFinalArtist(artist: Artist) {
      this.finalArtist = artist;
    },
    setIsLoadingNewArtists(value: boolean) {
      this.isLoadingNewArtists = value;
    },
    async refreshArtists() {
      this.setRandomCurrentGameGenreFromSelected();
      try {
        const artistsResponse = await getRandomStartingArtists({ genreName: this.currentGameGenre });
        this.resetPathArtistsToEmpty();
        this.setHasMadeAttempt(false);
        this.pushPathArtist(artistsResponse.data.artists[0]);
        this.setFinalArtist(artistsResponse.data.artists[1]);
        this.setCurrentGameGenre(artistsResponse.data.genre);
        this.setIsLoadingNewArtists(false);
      } catch (error) {
        console.error(error);
        this.setIsLoadingNewArtists(false);
      }
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
  },

  // return { genres, screen, genreSelected };
});
