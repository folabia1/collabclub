import axios from "axios";
import * as functions from "firebase-functions";

export type Artist = {
  id: string;
  name: string;
  photoUrl?: string;
  images?: { url: string }[];
  track?: Track;
};

export type Track = {
  id: string;
  name: string;
  artists: Artist[];
};

export type Album = {
  id: string;
  name: string;
  album_type: string;
  tracks: { items: Track[] };
  total_tracks: number;
  artists: Artist[];
};

const standardRequestHeaders = (accessToken: string) => ({
  "Accept": "application/json",
  "Authorization": `Bearer ${accessToken}`,
  "Content-Type": "application/json",
});

async function getSpotifyAuthToken() {
  const data = {
    grant_type: "client_credentials",
    client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    client_secret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
  };

  try {
    const response = await axios.post<{ access_token: string }>(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams(data).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    return response.data.access_token;
  } catch (error) {
    console.log(`\n[getSpotifyAuthToken] Unable to retrieve Spotify API auth token - ${error}`);
    throw new Error(`\n[getSpotifyAuthToken] Unable to retrieve Spotify API auth token - ${error}`);
  }
}

/* TRACKS */
function createTrackNameVariations(trackName: string) {
  const trackNameVariations = [
    trackName, // original
    trackName.split(" (")[0], // before the brackets
    trackName.split(" -")[0], // before the hyphen
    trackName.split(" /")[0], // before the slash
    ...(trackName.includes("/ ") ? [trackName.split("/ ")[1].split(" (")[0]] : []), // after the slash & before the brackets
  ];
  const bracketsContent = trackName.match(/\(([^()]+)\)/)?.[1];
  if (bracketsContent && !["ft  ", "ft. ", "feat", "with"].includes(bracketsContent?.slice(0, 4))) {
    trackNameVariations.push(bracketsContent);
  }
  return [...new Set(trackNameVariations)];
}

function isTrackNameSimilar(songNameGuess: string, actualSongName: string, strictMode = false) {
  const variations = createTrackNameVariations(actualSongName);
  for (const variation of variations) {
    if (strictMode && songNameGuess.localeCompare(variation, undefined, { sensitivity: "base" }) === 0) return true;
    if (!strictMode && songNameGuess.toLowerCase().startsWith(actualSongName.toLowerCase().slice(0, 4))) return true;
  }
  return false;
}

async function getAllAlbumsByAnArtist(artistId: string, accessToken: string) {
  const searchUrl = `https://api.spotify.com/v1/artists/${artistId}/albums`;

  // do initial request to work out how many more requests are needed to get all albums
  try {
    const initialResponse = await axios.get<{ total: number; items: Album[] }>(searchUrl, {
      params: { include_groups: "album,single,appears_on", offset: "0", limit: "50" },
      headers: standardRequestHeaders(accessToken),
    });

    // batch all remaining requests together
    const totalNumAlbumsWanted = initialResponse.data.total;
    const numAdditionalRequestsToMake = Math.ceil((totalNumAlbumsWanted - 50) / 50);
    const batchRequests = [];
    for (let i = 0; i < numAdditionalRequestsToMake; i++) {
      batchRequests.push(
        axios.get<{ total: number; items: Album[] }>(searchUrl, {
          params: { include_groups: "album,single,appears_on", offset: `${(i + 1) * 50}`, limit: "50" },
          headers: standardRequestHeaders(accessToken),
        })
      );
    }

    // await batched requests and combine initial response with batched response
    const batchResponses = await Promise.all(batchRequests);
    batchResponses.unshift(initialResponse);

    // flatten the array so that it's as if they all came from one response
    const albums: Album[] = [];
    const batchedAlbumsResponses = await Promise.all(batchResponses);
    batchedAlbumsResponses.forEach((response) => albums.push(...response.data.items));

    return albums;
  } catch (error) {
    console.log(`\n[ERROR: getAllAlbumsByAnArtist] Unable to retrieve tracks from Spotify - ${error}`);
    throw new Error(error);
  }
}

async function getTracksFromAlbumIds(albumIds: string[], accessToken: string) {
  const searchUrl = "https://api.spotify.com/v1/albums";
  try {
    const responses = [];
    // endpoint only returns 20 Albums at a time so
    // we send multiple requests and join the responses
    const numRequestsToMake = Math.ceil(albumIds.length / 20);
    for (let i = 0; i < numRequestsToMake; i++) {
      const albumsResponse = await axios.get<{ albums: Album[] }>(searchUrl, {
        params: { ids: albumIds.slice(20 * i, 20 * i + 20).toString() },
        headers: standardRequestHeaders(accessToken),
      });
      responses.push(albumsResponse);
    }

    // flatten batched responses
    const albums: Album[] = [];
    const batchedAlbumsResponses = await Promise.all(responses);
    batchedAlbumsResponses.forEach((response) => albums.push(...response.data.albums));

    // get tracks from each album
    const tracks: Track[] = [];
    albums.forEach((album) => tracks.push(...album.tracks.items));

    return tracks;
  } catch (error) {
    console.log(`\n[ERROR: getTracksFromAlbumIds] - ${error}`);
    throw new Error(error);
  }
}

async function getAllTracksByAnArtist(artistId: string, accessToken: string) {
  // get all the artist's albums as album ids
  const albumsResponse = await getAllAlbumsByAnArtist(artistId, accessToken);
  const albumIds = albumsResponse.map((album) => album.id);

  // get all the tracks from all the albums
  // includes: "album", "single", "appears_on" and "compilation"
  const tracksResponse = await getTracksFromAlbumIds(albumIds, accessToken);
  return tracksResponse;
}

type searchDiscographyArgs = {
  trackName?: string;
  artistId: string;
  requireMultipleArtists: boolean;
  requireThisArtist: boolean;
  strictMode: boolean;
};

/**
 * Takes a track name and artist name as search query and seaches Spotify API for
 * tracks. Filters to only songs that have MULTIPLE artists including the artistName.
 *
 * When using the `strictMode` flag it filters tracks more strongly, only keeping the
 * track(s) with exactly the same name.
 */
async function searchForTracksInArtistDiscography({
  trackName,
  artistId,
  requireMultipleArtists,
  requireThisArtist,
  strictMode,
}: searchDiscographyArgs) {
  try {
    const accessToken = await getSpotifyAuthToken(); // request spotify access token

    // get full artist discography (every track released by or featuring Artist)
    const tracksResponse = await getAllTracksByAnArtist(artistId, accessToken);

    // apply filters
    const filteredTracks = tracksResponse.filter((track) => {
      return (
        (!requireMultipleArtists || track.artists.length > 1) && // multiple artists
        (!requireThisArtist || track.artists.some((artist) => artist.id === artistId)) && // correct artist
        (!trackName || isTrackNameSimilar(trackName, track.name, strictMode)) // name matches trackNameQuery
      );
    });
    console.log(
      `\n[searchForTracksInArtistDiscography] ${tracksResponse.length} tracks found and filtered to ${filteredTracks.length}`
    );

    return filteredTracks;
  } catch (error) {
    console.log(
      `\n[ERROR: searchForTracksInArtistDiscography] Unable to get all tracks from Artist ${artistId}'s discography - ${error}`
    );
    throw new Error(error);
  }
}
exports.searchForTracksInArtistDiscography = functions.https.onCall(searchForTracksInArtistDiscography);

type getFeaturesArgs = { artistId1: string; artistId2: string; strictMode: boolean };
/**
 * Gets all features between two artists using the Spotify API.
 * Filters to only return songs with a name similar to the trackName input.
 *
 * When using the `strictMode` flag it filters tracks more strongly, only keeping the
 * track(s) with exactly the same name.
 *
 * @param {Object} data
 * @param {string} data.artistId1
 * @param {string} data.artistId2
 * @param {boolean} data.strictMode whether to enforce the strong filter requiring name to be exactly correct
 */
async function getFeaturesBetweenTwoArtists({ artistId1, artistId2, strictMode }: getFeaturesArgs) {
  const tracksResponse = await searchForTracksInArtistDiscography({
    artistId: artistId1,
    requireMultipleArtists: true,
    requireThisArtist: true,
    strictMode: strictMode,
  });

  // we know that all the tracks in tracksResponse have artistId1 beacause of `requireThisArtist: true`
  // so we just have to filter to tracks that also include artistId2
  const tracksWithBothArtists = tracksResponse.filter((track) => track.artists.map((artist) => artist.id).includes(artistId2));
  return tracksWithBothArtists;
}

exports.getFeaturesBetweenTwoArtists = functions.https.onCall(getFeaturesBetweenTwoArtists);

type SearchArgs = {
  trackName: string;
  artistName?: string;
  requireMultipleArtists: boolean;
  requireThisArtist: boolean;
  requireSimilarName: boolean;
  limit?: number;
  strictMode: boolean;
};

/**
 * Takes a track name and artist name as search query and seaches Spotify API for
 * tracks. Filters to only songs that have MULTIPLE artists including the artistName.
 *
 * When using the `strictMode` flag it filters tracks more strongly, only keeping the
 * track(s) with exactly the same name.
 */
async function searchForTracksWithQuery({
  trackName,
  artistName,
  requireMultipleArtists,
  requireThisArtist,
  requireSimilarName,
  limit = 50,
  strictMode,
}: SearchArgs) {
  try {
    // request spotify access token
    const accessToken = await getSpotifyAuthToken();

    const url = "https://api.spotify.com/v1/search";

    // do initial request to work out how many more requests are needed to get all songs
    const initialResponse = await axios.get<{ tracks: { total: number; items: Track[] } }>(url, {
      params: {
        q: `${trackName} ${artistName}`,
        type: "track",
        offset: "0",
        limit: `${Math.max(limit ?? 50, 50)}`,
      },
      headers: standardRequestHeaders(accessToken),
    });

    // batch all remaining requests together
    const totalNumTracksWanted = limit ? Math.min(initialResponse.data.tracks.total, limit) : initialResponse.data.tracks.total;
    const numAdditionalRequestsToMake = Math.ceil((totalNumTracksWanted - 50) / 50);
    const batchRequests = [];
    for (let i = 0; i < numAdditionalRequestsToMake; i++) {
      batchRequests.push(
        axios.get<{ tracks: { total: number; items: Track[] } }>(url, {
          params: {
            q: `${trackName.replace(/\s/g, "")}` + `${artistName ? `%20${artistName.replace(/\s/g, "")}` : ""}`,
            type: "track",
            offset: `${(i + 1) * 50}`,
            limit: "50",
          },
          headers: standardRequestHeaders(accessToken),
        })
      );
    }

    // await batched requests and combine initial response with batched response
    const batchResponses = await Promise.all(batchRequests);
    batchResponses.unshift(initialResponse);

    // flatten the batched responses array so that it's as if they all came from one response
    const tracks: Track[] = [];
    const batchedTracksResponses = await Promise.all(batchResponses);
    batchedTracksResponses.forEach((response) => tracks.push(...response.data.tracks.items));

    // apply filters
    // filter to only keep tracks with multiple artists including this artist
    // also filtering out tracks that don't have the same title as data.trackName
    const hasFilters = requireMultipleArtists || requireThisArtist || requireSimilarName;
    const filteredTracks = hasFilters
      ? tracks.filter((track) => {
          return (
            (!requireMultipleArtists || track.artists.length > 1) && // multiple artists
            (!requireThisArtist || track.artists.some((artist) => artist.name === artistName)) && // correct artist
            (!requireSimilarName || isTrackNameSimilar(trackName, track.name, strictMode)) // name is right (or almost right)
          );
        })
      : tracks;
    console.log(`\n[searchForTracksWithQuery] ${tracks.length} tracks found and filtered to ${filteredTracks.length}`);

    return filteredTracks;
  } catch (error) {
    console.log(`\n[ERROR: searchForTracksWithQuery] Unable to retrieve songs from Spotify: ${error}`);
    throw new Error(error);
  }
}

exports.searchForTracksWithQuery = functions.https.onCall(searchForTracksWithQuery);

/* ARTISTS */
async function getAvailableGenreSeeds(accessToken: string | undefined) {
  try {
    accessToken = accessToken || (await getSpotifyAuthToken());
    const searchUrl = "https://api.spotify.com/v1/recommendations/available-genre-seeds";
    const genreResponse = await axios.get<{ genres: string[] }>(searchUrl, { headers: standardRequestHeaders(accessToken) });
    const availableGenres = genreResponse.data.genres;
    return availableGenres;
  } catch (error) {
    console.log(`\n[ERROR: getRandomGenre] Unable to get available genre seeds - ${error}`);
    throw new Error(error);
  }
}

exports.getAvailableGenreSeeds = functions.https.onCall(getAvailableGenreSeeds);

export async function getRandomArtistsFromSameGenre(numArtists: number, genreName: string) {
  if (!genreName) {
    console.log(`\n[ERROR: getRandomArtistsFromSameGenre] No selected genre - ${error}`);
    throw new Error(`[ERROR: getRandomArtistsFromSameGenre] No selected genre - ${error}`);
  }

  try {
    const accessToken = await getSpotifyAuthToken(); // request access token
    const availableGenres = await getAvailableGenreSeeds(accessToken);

    const randomGenre = availableGenres[Math.floor(Math.random() * availableGenres.length)];
    const selectedGenre = genreName && availableGenres.includes(genreName) ? genreName : randomGenre;
    const searchUrl = "https://api.spotify.com/v1/search/";
    const responses = [];
    // carry out an individual resquest for each artist so that each one is random
    for (let i = 0; i < numArtists; i++) {
      responses.push(
        axios.get<{ artists: { items: Artist[] } }>(searchUrl, {
          params: {
            q: `genre:${selectedGenre}`,
            type: "artist",
            limit: 1,
            offset: Math.floor(Math.random() * 50),
          },
          headers: standardRequestHeaders(accessToken),
        })
      );
    }
    const batchedResponses = await Promise.all(responses);

    // flatten batched responses to make it easier to work with
    const randomArtistsFromGenre: Artist[] = [];
    batchedResponses.forEach((response) => randomArtistsFromGenre.push(response.data.artists.items[0]));

    // the search endpoint doesn't return photoUrl for artists
    // get all the artistIds from the tracks
    const artistIds = randomArtistsFromGenre.map((artist) => artist.id);

    // make a request for the artists to get the photoUrl
    const fullRandomArtists = await getMultipleArtists(artistIds, accessToken);

    // add the photoUrl information to the tracks
    fullRandomArtists.forEach((artist, index) => {
      const fullArtist = fullRandomArtists.find((fullArtist) => fullArtist.id === artist.id) as Artist;
      randomArtistsFromGenre[index].photoUrl = fullArtist.images?.[fullArtist.images.length - 1]?.url ?? "";
    });

    return { artists: randomArtistsFromGenre, genre: selectedGenre };
  } catch (error) {
    console.log(`\n[ERROR: getRandomArtistsFromSameGenre] Unable to get artist - ${error}`);
    throw new Error(error);
  }
}

async function getArtistWithPhotoUrl({ artistId, accessToken }: { artistId: string; accessToken: string }) {
  try {
    accessToken = accessToken || (await getSpotifyAuthToken());

    const searchUrl = `https://api.spotify.com/v1/artists/${artistId}`;
    const artistResponse = await axios.get<Artist>(searchUrl, {
      headers: standardRequestHeaders(accessToken),
    });

    // make the photoUrl available as a top level property
    const artist = artistResponse.data;
    artist.photoUrl = artist.images?.[artist.images.length - 1]?.url ?? "";

    return artist;
  } catch (error) {
    console.log(`\n[ERROR: getArtistWithPhotoUrl] - ${error}`);
    throw new Error(error);
  }
}

exports.getArtistWithPhotoUrl = functions.https.onCall(getArtistWithPhotoUrl);

export async function getMultipleArtists(artistsIds: string[], accessToken: string) {
  try {
    const responses = [];
    // endpoint only returns 50 artists at a time so
    // we send multiple requests and join the responses
    const numRequestsToMake = Math.ceil(artistsIds.length / 50);
    for (let i = 0; i < numRequestsToMake; i++) {
      const searchUrl = "https://api.spotify.com/v1/artists";
      const artistsResponse = await axios.get<{ artists: Artist[] }>(searchUrl, {
        params: {
          ids: artistsIds.slice(50 * i, 50 * i + 50).toString(),
        },
        headers: standardRequestHeaders(accessToken),
      });
      responses.push(artistsResponse);
    }

    // flatten batched responses
    const artists: Artist[] = [];
    const batchedArtistsResponses = await Promise.all(responses);
    batchedArtistsResponses.forEach((response) => artists.push(...response.data.artists));
    return artists;
  } catch (error) {
    console.log(`\n[getMultipleArtists] ${error}`);
    throw new Error(`\n[getMultipleArtists] ${error}`);
  }
}

exports.getRandomStartingArtists = functions.https.onCall(async ({ genreName }: { genreName: string | undefined }) => {
  // get 2 random artists from the genre provided, or a random genre if none provided
  const artistsResponse = await getRandomArtistsFromSameGenre(2, genreName);

  return {
    genre: artistsResponse.genre,
    artists: artistsResponse.artists,
  };
});
