import axios from "axios";
import * as functions from "firebase-functions";

export type Token = {
  access_token: string;
};

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
  total_tracks: number;
  artists: Artist[];
};

export const standardRequestHeaders = (accessToken: string) => ({
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
    const response = await axios.post<Token>("https://accounts.spotify.com/api/token", new URLSearchParams(data).toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return response;
  } catch (error) {
    console.log(`Unable to retrieve Spotify API auth token - ${error}`);
    return;
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
      params: { offset: "0", limit: "50" },
      headers: standardRequestHeaders(accessToken),
    });

    // batch all remaining requests together
    const totalNumAlbumsWanted = initialResponse.data.total;
    const numAdditionalRequestsToMake = Math.ceil((totalNumAlbumsWanted - 50) / 50);
    const batchRequests = [];
    for (let i = 0; i < numAdditionalRequestsToMake; i++) {
      batchRequests.push(
        axios.get<{ total: number; items: Album[] }>(searchUrl, {
          params: { offset: `${(i + 1) * 50}`, limit: "50" },
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
    console.log(`Unable to retrieve tracks from Spotify: ${error}`);
    return null;
  }
}

async function getTracksFromAlbumIds(albumIds: string[], accessToken: string) {
  const searchUrl = `https://api.spotify.com/v1/tracks`;
  try {
    const responses = [];
    // endpoint only returns 50 Tracks at a time so
    // we send multiple requests and join the responses
    const numRequestsToMake = Math.ceil(albumIds.length / 50);
    for (let i = 0; i < numRequestsToMake; i++) {
      const tracksResponse = await axios.get<{ tracks: Track[] }>(searchUrl, {
        params: { ids: albumIds.slice(50 * i, 50 * i + 50).toString() },
        headers: standardRequestHeaders(accessToken),
      });
      responses.push(tracksResponse);
    }

    // flatten batched responses
    const tracks: Track[] = [];
    const batchedTracksResponses = await Promise.all(responses);
    batchedTracksResponses.forEach((response) => tracks.push(...response.data.tracks));
    return tracks;
  } catch (error) {
    console.log(`[getMultipleArtistsFromSpotify] ${error}`);
    return;
  }
}

async function getAllTracksByAnArtist(artistId: string, accessToken: string) {
  // get all the artist's albums as album ids
  const albumsResponse = await getAllAlbumsByAnArtist(artistId, accessToken);
  if (!albumsResponse) return;

  const albumIds = albumsResponse.map((album) => album.id);

  // get all the tracks from all the albums
  // includes: "album", "single", "appears_on" and "compilation"
  const tracksResponse = await getTracksFromAlbumIds(albumIds, accessToken);
  if (!tracksResponse) return;

  return tracksResponse;
}

/**
 * Takes a track name and artist name as search query and seaches Spotify API for
 * tracks. Filters to only songs that have MULTIPLE artists including the artistName.
 *
 * When using the `strictMode` flag it filters tracks more strongly, only keeping the
 * track(s) with exactly the same name.
 *
 * @param {Object} data
 * @param {string} data.trackName the Track name value to be used in the search query
 * @param {string} data.artistId the Artist id value to be used in the search query
 * @param {boolean} data.requireMulipleArtists
 * @param {boolean} data.requireThisArtist
 * @param {boolean} data.strictMode whether to ensure that the name is exactly correct
 */
exports.searchForTracksInArtistDiscography = functions.https.onCall(
  async ({ trackName, artistId, requireMulipleArtists, requireThisArtist, strictMode }) => {
    // request spotify access token
    const tokenResponse = await getSpotifyAuthToken();
    if (!tokenResponse) return;

    // get full artist discography (every track released by or featuring Artist)
    const tracksResponse = await getAllTracksByAnArtist(artistId, tokenResponse.data.access_token);
    if (!tracksResponse) return;

    // apply filters
    const filteredTracks = tracksResponse.filter((track) => {
      return (
        (!requireMulipleArtists || track.artists.length > 1) && // multiple artists
        (!requireThisArtist || track.artists.some((artist) => artist.id === artistId)) && // correct artist
        isTrackNameSimilar(trackName, track.name, strictMode) // name is right (or almost right)
      );
    });
    console.log(`[searchForTracksWithQuery] ${tracksResponse.length} tracks found and filtered to ${filteredTracks.length}`);

    return filteredTracks;
  }
);

type SearchArgs = { trackName: string; artistName: string | undefined; accessToken: string; limit: number | undefined };
async function searchForTracksWithQuery({ trackName, artistName, accessToken, limit }: SearchArgs) {
  const url = "https://api.spotify.com/v1/search";
  try {
    // do initial request to work out how many more requests are needed to get all songs
    const initialResponse = await axios.get<{ tracks: { total: number; items: Track[] } }>(url, {
      params: {
        q: `${trackName.toLowerCase().replace(/\s/g, "")}` + `${artistName ? `%20${artistName.replace(/\s/g, "")}` : ""}`,
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
            q:
              `${trackName.replace(/\s/g, "%20")}%20track:${trackName.replace(/\s/g, "%20")}` +
              `${artistName ? `%20artist:${artistName.replace(/\s/g, "%20")}` : ""}`,
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

    return tracks;
  } catch (error) {
    console.log(`Unable to retrieve songs from Spotify: ${error}`);
    return null;
  }
}

// TODO: update this using the `getAllTracksByAnArtist` function
exports.checkSongForTwoArtists = functions.https.onCall(async (data, context) => {
  // search for tracks matching name and artist
  const tokenResponse = await getSpotifyAuthToken(); // request access token
  if (!tokenResponse) return;

  const potentialTracks: Track[] = [];
  for (const artist of ["currentArtist", "nextArtist"]) {
    const tracksResponse = await searchForTracksWithQuery({
      trackName: data.songNameGuess,
      artistName: data[artist].name,
      accessToken: tokenResponse.data.access_token,
      limit: 5,
    });
    if (!tracksResponse) continue;

    potentialTracks.push(...tracksResponse);
  }

  // check if song features both artists
  for (const track of potentialTracks) {
    if (track.artists.length < 2 || !isTrackNameSimilar(data.songNameGuess, track.name)) {
      continue;
    }
    const trackArtistsIds = track.artists.map((artist) => artist.id);
    const trackArtistsNames = track.artists.map((artist) => artist.name);

    const trackAccepted = trackArtistsIds.includes(data["currentArtist"].id) && trackArtistsIds.includes(data["currentArtist"].id);
    console.log(`Track ${trackAccepted ? "contains" : "does NOT contain"} ${data["currentArtist"].name} & ${data["nextArtist"].name}`);

    if (trackAccepted) {
      return {
        trackFound: true,
        trackId: track.id,
        trackName: track.name,
        trackArtists: trackArtistsNames,
      };
    }
  }

  // none of the potential tracks feature both artists
  console.log(`Track does NOT contain ${data["currentArtist"].name} & ${data["nextArtist"].name}`);
  return {
    trackFound: false,
    trackId: null,
    trackName: null,
    trackArtists: null,
  };
});

/**
 * Takes a track name and artist name as search query and seaches Spotify API for
 * tracks. Filters to only songs that have MULTIPLE artists including the artistName.
 *
 * When using the `strictMode` flag it filters tracks more strongly, only keeping the
 * track(s) with exactly the same name.
 *
 * @param {Object} data
 * @param {string} data.trackName the Track name value to be used in the search query
 * @param {string} data.artistName the Artist name value to be used in the search query
 * @param {boolean} data.requireMulipleArtists
 * @param {boolean} data.requireThisArtist
 * @param {number} data.limit
 * @param {boolean} data.strictMode whether to ensure that the name is exactly correct
 */
exports.searchForTracksWithQuery = functions.https.onCall(
  async ({ trackName, artistName, requireMulipleArtists, requireThisArtist, limit, strictMode }) => {
    // request spotify access token
    const tokenResponse = await getSpotifyAuthToken();
    if (!tokenResponse) return;

    // search for tracks matching trackName and artistName
    const tracksResponse = await searchForTracksWithQuery({
      trackName,
      artistName: requireThisArtist ? artistName : undefined,
      accessToken: tokenResponse.data.access_token,
      limit: limit ?? 50,
    });
    if (!tracksResponse) return;

    // apply filters
    // filter to only keep tracks with multiple artists including this artist
    // also filtering out tracks that don't have the same title as data.trackName
    const tracks = tracksResponse.filter((track) => {
      return (
        (!requireMulipleArtists || track.artists.length > 1) && // multiple artists
        (!requireThisArtist || track.artists.some((artist) => artist.name === artistName)) && // correct artist
        isTrackNameSimilar(trackName, track.name, strictMode) // name is right (or almost right)
      );
    });
    console.log(`[searchForTracksWithQuery] ${tracksResponse.length} tracks found and filtered to ${tracks.length}`);
    tracksResponse.forEach((track) => {
      console.log([track.name, track.artists.map((artist) => artist.name)]);
    });

    // the tracks endpoint doesn't return photoUrl for track artists
    // get all the artistIds from the tracks
    const artistIdToPhotoUrlMap = new Map<string, string>();
    tracks.forEach((track) => track.artists.forEach((artist) => artistIdToPhotoUrlMap.set(artist.id, "")));
    const artistIds = Array.from(artistIdToPhotoUrlMap.keys());

    // make a request for the artists to get the photoUrl
    const fullArtists = await getMultipleArtistsFromSpotify(artistIds, tokenResponse.data.access_token);
    if (!fullArtists) return tracks;

    // set photoUrls in the idToUrl map
    fullArtists.forEach((artist) => artistIdToPhotoUrlMap.set(artist.id, artist.images?.[artist.images.length - 1]?.url ?? ""));

    // add the photoUrl information to the tracks
    tracks.forEach((track, trackIndex) => {
      track.artists.forEach((artist, artistIndex) => {
        tracks[trackIndex].artists[artistIndex].photoUrl = artistIdToPhotoUrlMap.get(artist.id) ?? "";
      });
    });

    return tracks;
  }
);

/* ARTISTS */
async function getRandomArtistFromGenre(genreName: string) {
  // arg 'genreName' should be randomly selected before calling function to keep starting and final artist in same genre

  // 1. get random playlist of selected genre
  // TODO: move to spotify.ts and use genre seeds
  const playlistsIds = Object.values(playlists[genreName]);
  const randPlaylistId = playlistsIds[Math.floor(Math.random() * playlistsIds.length)];

  // 2. get all artists from selected playlist
  const tokenResponse = await getSpotifyAuthToken(); // request access token
  const searchUrl = `https://api.spotify.com/v1/playlists/${randPlaylistId}/tracks`;
  try {
    if (!tokenResponse) {
      throw new Error("No token available.");
    }

    const res = await axios.get<{ items: { track: Track }[] }>(searchUrl, {
      params: {
        fields: "items(track(artists(id, name)))",
      },
      headers: standardRequestHeaders(tokenResponse.data.access_token),
    });
    const artists: Artist[] = [];
    const data = await res.data.items;
    data.forEach((item) => {
      item.track.artists.forEach((artist) => {
        artists.push(artist);
      });
    });
    // 3. select one random artist from all artists
    const randArtist = artists[Math.floor(Math.random() * artists.length)];
    // get spotify photoUrl using artist.id
    const searchArtistUrl = `https://api.spotify.com/v1/artists/${randArtist.id}`;
    try {
      const response = await axios.get(searchArtistUrl, {
        headers: standardRequestHeaders(tokenResponse.data.access_token),
      });
      const photoUrl = response.data.images[response.data.images.length - 1]["url"] ?? null;
      randArtist["photoUrl"] = photoUrl;
      return randArtist;
    } catch (error) {
      console.log(`[getRandomArtistFromGenre] ${error}`);
      return;
    }
  } catch (error) {
    console.log(`[getRandomArtistFromGenre] ${error}`);
    return;
  }
}

export async function getMultipleArtistsFromSpotify(artistsIds: string[], accessToken: string) {
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
    console.log(`[getMultipleArtistsFromSpotify] ${error}`);
    return;
  }
}

exports.getRandomStartingArtists = functions.https.onCall(async ({ genreName }: { genreName: string | undefined }) => {
  // select random genre if one is not passed as argument
  // TODO: move to spotify.ts and use genre seeds
  const genres = Object.keys(playlists);
  const randomGenre = genres[Math.floor(Math.random() * genres.length)];
  const selectedGenre = genreName && genres.includes(genreName) ? genreName : randomGenre;

  // select 2 random artists in the selected genre
  const selectedArtists: { [index: string]: Artist } = {};
  const maxRetries = 10;
  for (let i = 0; i < maxRetries && Object.keys(selectedArtists).length < 2; i++) {
    const randArtistData = await getRandomArtistFromGenre(selectedGenre);
    if (!randArtistData?.id) continue;

    selectedArtists[randArtistData.id] = randArtistData;
  }
  const selectedArtistsData = Object.values(selectedArtists);

  // handle error getting artists
  if (selectedArtistsData.length < 2) {
    console.log("Unable to select Starting Artists.");
    return;
  }

  // return selected artists
  console.log(`Starting Artists selected: ${selectedArtistsData[0].name} and ${selectedArtistsData[1].name}`);
  return {
    genre: selectedGenre,
    artists: selectedArtistsData,
  };
});

exports.searchForArtistOnSpotify = functions.https.onCall(async (data) => {
  const tokenResponse = await getSpotifyAuthToken(); // request access token
  if (!tokenResponse) return;
  const searchUrl = "https://api.spotify.com/v1/search";

  try {
    const res = await axios.get(searchUrl, {
      params: {
        q: `${data.artistName.replace(/\s/g, "%20")}`,
        type: "artist",
        limit: "4",
        offset: "0",
        market: "US",
      },
      headers: standardRequestHeaders(tokenResponse.data.access_token),
    });
    const searchResults = res.data.artists.items;
    const artistsData: Artist[] = searchResults.map(({ id, name, images }: Artist) => {
      return {
        id,
        name,
        photoUrl: images?.[images.length - 1]?.["url"],
      };
    });
    return artistsData;
  } catch (error) {
    console.log(`[searchForArtistOnSpotify] ${error}`);
    return error;
  }
});
