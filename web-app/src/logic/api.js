import { httpsCallable } from "firebase/functions";

import { functions } from "../firebase-config";

export const getAvailableGenreSeeds = httpsCallable(functions, "Spotify-getAvailableGenreSeeds");
export const getRandomStartingArtists = httpsCallable(functions, "Spotify-getRandomStartingArtists");
export const getArtistWithPhotoUrl = httpsCallable(functions, "Spotify-getArtistWithPhotoUrl");
export const searchForTracksWithQuery = httpsCallable(functions, "Spotify-searchForTracksWithQuery");
