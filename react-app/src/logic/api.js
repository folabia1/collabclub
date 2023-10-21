import { httpsCallable } from "firebase/functions";

import { functions } from "../firebase-config";

export const getAvailableGenreSeeds = httpsCallable(functions, "Spotify-getAvailableGenreSeeds");
export const getRandomStartingArtists = httpsCallable(functions, "Spotify-getRandomStartingArtists");
export const getArtistWithPhotoUrl = httpsCallable(functions, "Spotify-getArtistWithPhotoUrl");
export const searchForTracksWithQuery = httpsCallable(functions, "Spotify-searchForTracksWithQuery");

export async function suggestTracks(trackGuess, filter) {
  try {
    const tracksResponse = await searchForTracksWithQuery({
      trackName: trackGuess,
      artistName: this.currentPathArtist?.name ?? "",
      requireMultipleArtists: filter,
      requireThisArtist: filter,
      requireSimilarName: true,
      strictMode: false,
    });
    // display tracks for user to choose from
    this.setSuggestedTracks(tracksResponse.data);
  } finally {
    this.setIsLoadingResults(false);
  }
}
