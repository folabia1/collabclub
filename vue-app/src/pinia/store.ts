import { defineStore } from "pinia";

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
    screen: "home",
  }),

  // computed values
  getters: {
    selectedGenres: (state) =>
      Object.entries(state.genres)
        .filter(([_, isSelected]) => isSelected)
        .map(([name, _]) => name),
  },

  // actions
  actions: {
    selectGenre(genreName: string) {
      this.genres[genreName] = !this.genres[genreName];
    },
    goToScreen(gameMode: string) {
      this.screen = gameMode;
    },
  },

  // return { genres, screen, genreSelected };
});
