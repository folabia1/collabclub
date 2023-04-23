import { defineStore } from "pinia";

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
    } as { [index: string]: boolean },
    currentGameGenre: null as string | null,
    screen: "home",
    pathArtists: [] as PathArtist[],
    finalArtist: null as Artist | null,
  }),

  // computed values
  getters: {
    genreNames: (state) => Object.keys(state.genres),
    selectedGenres: (state) =>
      Object.entries(state.genres)
        .filter(([_, isSelected]) => isSelected)
        .map(([name, _]) => name),
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
  },

  // return { genres, screen, genreSelected };
});
