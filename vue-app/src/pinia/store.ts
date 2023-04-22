import { defineStore } from "pinia";

export type GenreName = "hip-hop" | "afro-beats" | "uk rap" | "charts" | "latinx" | "old-school hip-hop";
export type Artist = {
  id: string;
  name: string;
  photoUrl: string;
};

export const useAppStore = defineStore("app", {
  // initial state
  state: () => ({
    genres: {
      "hip-hop": false,
      "afro-beats": false,
      "uk rap": false,
      "charts": false,
      "latinx": false,
      "old-school hip-hop": false,
    },
    currentGameGenre: null as GenreName | null,
    screen: "home",
    pathArtists: [] as Artist[],
    finalArtist: null as Artist | null,
  }),

  // computed values
  getters: {
    selectedGenres: (state) =>
      Object.entries(state.genres)
        .filter(([_, isSelected]) => isSelected)
        .map(([name, _]) => name) as GenreName[],
    genreNames: (state) => Object.keys(state.genres) as GenreName[],
    currentPathArtist: (state) => {
      if (state.pathArtists.length === 0) return null;
      return state.pathArtists[state.pathArtists.length - 1];
    },
  },

  // actions
  actions: {
    /* Screen */
    goToScreen(gameMode: string) {
      this.screen = gameMode;
    },
    /* Genres */
    toggleGenreSelected(genreName: GenreName) {
      this.genres[genreName] = !this.genres[genreName];
    },
    resetCurrentGameGenre() {
      this.currentGameGenre = null;
    },
    setRandomGameGenreFromSelected() {
      this.currentGameGenre = this.selectedGenres[Math.floor(Math.random() * this.selectedGenres.length)];
    },
    /* Artists */
    resetPathArtistsToEmpty() {
      this.pathArtists = [];
      this.finalArtist = null;
    },
    pushPathArtist(artist: Artist) {
      this.pathArtists.push(artist);
    },
    setFinalArtist(artist: Artist) {
      this.finalArtist = artist;
    },
  },

  // return { genres, screen, genreSelected };
});
