import { getSpotifyAuthToken } from "./getSpotifyAuthToken";
import axios from "axios";
import { playlists } from "./playlists";

// The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
import * as functions from "firebase-functions";
// The Firebase Admin SDK to access Firestore.
import * as admin from "firebase-admin";
admin.initializeApp();
const firestore = admin.firestore();

type Artist = {
  id: string;
  name: string;
  photoUrl?: string;
  images?: { url: string }[];
  track?: Track;
};

type Track = {
  id: string;
  name: string;
  artists: Artist[];
};

type Album = {
  id: string;
  name: string;
  artists: Artist[];
};

const standardRequestHeaders = (accessToken: string) => ({
  "Accept": "application/json",
  "Authorization": `Bearer ${accessToken}`,
  "Content-Type": "application/json",
});

const maxPlayersPerRoom = 6;

// exports.initializeFirestoreEmulator = functions.https.onCall(async (/* data*/) => {
//   const writeBatch = firestore.batch();
// for (let i=0; i<10; i++) {
//   const roomNum = "000" + i;
//   const roomRef = firestore.doc(`rooms/${roomNum.slice(roomNum.length-3)}`);
//   writeBatch.set(roomRef,
//       {
//         active: false,
//         players: [],
//         spectators: [],
//         initialArtist: {id: null, name: null},
//         finalArtist: {id: null, name: null},
//         type: "guest", // guest, user or competition
//         owner: null,
//         hardMode: false,
//         lastChange: admin.firestore.Timestamp.now(),
//       }
//   );
// }

//   const artistsEntries = Object.entries(artistsIds);
//   for (const artist of artistsEntries) {
//     firestore.collection("artists").add;
//     const artistRef = firestore.collection("artists").doc();
//     writeBatch.set(artistRef, {id: artist[0], name: artist[1]});
//   }
//   const initResponse = await writeBatch.commit();
//   return initResponse;
// });

/* USERS */
exports.deleteGuestUsers = functions.pubsub.schedule("every day 03:00").onRun((context) => {
  // Start listing users from the beginning, 1000 at a time.
  // * Note: all users are guest users at the moment, so there is no validation for that
  const deleteGuestUsers = async (nextPageToken?: string) => {
    // List batch of users, 1000 at a time.
    try {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      const dateNow = admin.firestore.Timestamp.now().toDate().getDate();
      const toDelete: string[] = [];
      listUsersResult.users.forEach((userRecord) => {
        // add user to toDelete list if the date today is different to the user's creation date
        const creationDate = new Date(userRecord.metadata.creationTime).getDate();
        if (dateNow != creationDate) toDelete.push(userRecord.uid);
      });

      // Delete Users
      if (toDelete.length > 0) {
        const deleteUsersResponse = await admin.auth().deleteUsers(toDelete);
        if (deleteUsersResponse.successCount) console.log(`[deleteGuestUsers] ${toDelete.length} users successfully deleted.`);
        if (deleteUsersResponse.failureCount) console.log(`[deleteGuestUsers] ${toDelete.length} users could not be deleted.`);
      } else {
        console.log("[deleteGuestUsers] No guest users to delete.");
      }

      // Delete next batch of guest
      if (listUsersResult.pageToken) {
        deleteGuestUsers(listUsersResult.pageToken);
      }
      return toDelete.length > 0;
    } catch (error) {
      console.log("[deleteGuestUsers] Error deleting users:", error);
      return false;
    }
  };
  return deleteGuestUsers();
});

/* ROOM */
exports.getRoom = functions.https.onCall(async (data) => {
  const roomsRef = firestore.collection("rooms");
  const query = data?.activityLevel ? roomsRef.where("players", "==", data.activityLevel === "active").limit(1) : roomsRef.limit(1);
  const querySnapshot = await query.get();

  // handle error, room not found
  if (querySnapshot.empty) {
    console.log("[getRoom] Room not found.");
    return null;
  }

  // return the room
  const doc = querySnapshot.docs[0];
  console.log(`[getRoom] Room found: ${doc.id}`);
  return { name: doc.id, ...doc.data() };
});

type joinRoomArgs = {
  roomName: string;
  role?: "Player" | "Spectator";
};
type joinRoomReturnValue = {
  role: "Player" | "Spectator" | null;
};
exports.joinRoom = functions.https.onCall(async ({ roomName, role }: joinRoomArgs, context): Promise<joinRoomReturnValue> => {
  // if user is not signed in -> null
  if (!context?.auth?.uid) {
    console.log("[joinRoom] No user provided. Unable to add user to room.");
    return { role: null };
  }

  // no room provided -> null
  if (!roomName || typeof roomName !== "string") {
    console.log(`[joinRoom] Argument "roomName" must be a string. Unable to add User ${context.auth.uid} to room.`);
  }

  const roomRef = firestore.doc(`rooms/${roomName}`);
  const snapshot = await roomRef.get();
  const snapshotData = snapshot.data();

  // if room does not exist -> null
  if (!snapshot.exists || !snapshotData) {
    console.log(`[joinRoom] Room does not exist. Unable to add User ${context.auth.uid} to Room ${roomName}.`);
    return { role: null };
  }

  // user is alreday a player in room -> "Player"
  if (snapshotData["players"].includes(context.auth.uid)) {
    console.log(`[joinRoom] User ${context.auth.uid} is already a player in Room ${roomName}.`);
    return { role: "Player" };
  }

  // user is currently a spectator
  if (snapshotData["spectators"].includes(context.auth.uid)) {
    if (snapshotData["players"].length < maxPlayersPerRoom) {
      // room has space for user -> "Player"
      roomRef.update({ players: [...snapshotData["players"], context.auth.uid] });
      console.log(`[joinRoom] User ${context.auth.uid} moved from Spectator to Player in Room ${roomName}.`);
      return { role: "Player" };
    } else {
      // room does not have space for user -> "Spectator"
      roomRef.update({ spectators: [...snapshotData["spectators"], context.auth.uid] });
      console.log(`[joinRoom] Room ${roomName} is full. Unable to move User ${context.auth.uid} from Spectator to Player in.`);
      return { role: "Spectator" };
    }
  }

  // user is not a player or spectator in room
  if (snapshotData["players"].length < 6) {
    // room has space for user => "Player"
    roomRef.update({ active: true });
    roomRef.update({ players: [...snapshotData["players"], context.auth.uid] });
    console.log(`[joinRoom] User ${context.auth.uid} addeed to Room ${roomName} as a Player.`);
    return { role: "Player" };
  } else {
    // room does not have space for user -> "Spectator"
    roomRef.update({ spectators: [...snapshotData["spectators"], context.auth.uid] });
    console.log(`[joinRoom] User ${context.auth.uid} added to Room ${roomName} as a Spectator.`);
    return { role: "Spectator" };
  }
});

exports.leaveRoom = functions.https.onCall(async ({ roomName }, context) => {
  // if user is not signed in
  if (!context?.auth?.uid) {
    console.log("[leaveRoom] No user provided. Unable to remove user from room.");
    return false;
  }

  // no room provided
  if (!roomName || typeof roomName !== "string") {
    console.log(`[leaveRoom] Argument "roomName" must be a string. Unable to remove User ${context.auth.uid} from room.`);
    return false;
  }

  const roomRef = firestore.doc(`rooms/${roomName}`);
  const snapshot = await roomRef.get();
  const snapshotData = snapshot.data();

  // if room does not exist
  if (!snapshot.exists || !snapshotData) {
    console.log(`[leaveRoom] Room does not exist. Unable to remove User ${context.auth.uid} from Room ${roomName}.`);
    return false;
  }

  // remove user from players
  const players = snapshotData["players"];
  for (let i = 0; i < players.length; i++) {
    if (players[i] === context?.auth?.uid) {
      players.splice(i, 1);
      roomRef.update({ players: players });
      console.log(`[leaveRoom] Successfully removed User ${context.auth.uid} from Room ${roomName}`);
      return true;
    }
  }

  // remove user from spectators
  const spectators = snapshotData["spectators"];
  for (let i = 0; i < spectators.length; i++) {
    if (spectators[i] === context?.auth?.uid) {
      spectators.splice(i, 1);
      roomRef.update({ spectators: spectators });
      console.log(`[leaveRoom] Successfully removed User ${context.auth.uid} from Room ${roomName}`);
      return true;
    }
  }

  // user is not a player or spectator in room
  console.log(`[leaveRoom] User ${context.auth.uid} is not in Room ${roomName}. Unable to remove user from room.`);
  return false;
});

exports.setNewRoomArtists = functions.https.onCall(async ({ roomName, context }) => {
  // if user is not signed in
  if (!context?.auth?.uid) {
    console.log("[setNewRoomArtists] No user provided. Unable to set new artists for room.");
    return false;
  }

  // no room provided
  if (!roomName || typeof roomName !== "string") {
    console.log(`[setNewRoomArtists] Argument "roomName" must be a string. Unable to remove User ${context.auth.uid} from room.`);
    return false;
  }

  const roomRef = firestore.doc(`rooms/${roomName}`);
  const snapshot = await roomRef.get();
  const snapshotData = snapshot.data();

  // if room does not exist -> null
  if (!snapshot.exists || !snapshotData) {
    console.log(`[setNewRoomArtists] Room does not exist. Unable to remove User ${context.auth.uid} from Room ${roomName}.`);
    return false;
  }

  // TODO: add check that the user is a Player in the Room

  // select 2 random artists from artists collection
  const selectedArtists: Artist[] = [];
  while (selectedArtists.length < 2) {
    const randArtistDoc = await getRandomStoredArtist();
    const artistData = (await randArtistDoc.get()).data() as Artist;
    selectedArtists.push(artistData);
  }
  // update selected artists in room
  firestore.doc(`rooms/${roomName}`).update({
    initialArtist: {
      id: selectedArtists[0]["id"],
      name: selectedArtists[0]["name"],
    },
    finalArtist: {
      id: selectedArtists[1]["id"],
      name: selectedArtists[1]["name"],
    },
  });
  console.log(
    `[setNewRoomArtists] Successfully updated artists in Room ${roomName}: ` +
      `${selectedArtists[0]["name"]} and ${selectedArtists[1]["name"]}`
  );
  return selectedArtists;
});

function resetRoom(roomName: string) {
  try {
    const roomRef = firestore.doc(`rooms/${roomName}`);
    roomRef.update({
      active: false,
      players: [],
      spectators: [],
      initialArtist: { id: null, name: null },
      finalArtist: { id: null, name: null },
      type: "guest", // guest, user or competition
      owner: null,
      hardMode: false,
      lastChange: admin.firestore.Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

exports.onRoomUpdated = functions.firestore.document("/rooms/{roomName}").onUpdate((change, context) => {
  const promises = [];
  const dataBefore = change.before.data();
  const dataAfter = change.after.data();
  // check for CHANGE (in initial and final artists)
  if (dataAfter["initialArtist"].id != dataBefore["initialArtist"].id || dataAfter["finalArtist"].id != dataBefore["finalArtist"].id) {
    promises.push(change.after.ref.set({ lastChange: admin.firestore.Timestamp.now() }, { merge: true }));
    console.log(`[onRoomUpdated] Updating lastChange for Room ${context.params.roomName}.`);
  }

  // check for CHANGE (in players and spectators)
  if (
    JSON.stringify(dataAfter["players"]) != JSON.stringify(dataBefore["players"]) ||
    JSON.stringify(dataAfter["spectators"]) != JSON.stringify(dataBefore["spectators"])
  ) {
    // if room empty (no players or spectators), reset room
    if (dataAfter["players"].length === 0 && dataAfter["spectators"].length === 0) {
      console.log(`[onRoomUpdated] Resetting Room ${context.params.roomName}. Room is empty.`);
      promises.push(resetRoom(context.params.roomName));
    }
  }

  // background functions must return a Promise back to firebase
  return Promise.all(promises);
});

exports.resetUnusedRooms = functions.pubsub.schedule("every day 04:00").onRun(async (context) => {
  try {
    const roomsList = await firestore.collection("rooms").listDocuments();
    const writeBatch = firestore.batch();

    const timeNow = admin.firestore.Timestamp.now().toDate();
    for (const roomRef of roomsList) {
      const room = await roomRef.get();
      const roomData = room.data();
      if (!roomData) return;

      // if lastChange in room was more than 3 mins ago
      if (timeNow.getMinutes() - roomData.lastChange.toDate().getMinutes() > 3) {
        writeBatch.set(roomRef, {
          active: false,
          players: [],
          spectators: [],
          initialArtist: { id: null, name: null },
          finalArtist: { id: null, name: null },
          type: "guest", // guest, user or competition
          owner: null,
          hardMode: false,
          lastChange: admin.firestore.Timestamp.now(),
        });
      }
    }

    // background functions must return a Promise back to firebase
    const resetRoomsResponse = await writeBatch.commit();
    return resetRoomsResponse;
  } catch (error) {
    console.log(`[resetUnusedRooms] Unable to reset unused rooms - ${error}`);
    return;
  }
});

/* ARTISTS */
async function getRandomStoredArtist() {
  // gets id, name and photoUrl
  const artistsCollectionRef = firestore.collection("artists");
  while (true) {
    const key = artistsCollectionRef.doc().id;
    const snapshot = await artistsCollectionRef.where("__name__", ">=", key).limit(1).get();
    if (!snapshot.empty) {
      return firestore.doc(`artists/${snapshot.docs[0].id}`);
    }
  }
}

async function getRandomArtistFromGenre(genreName: string) {
  // arg 'genreName' should be randomly selected before calling function to keep starting and final artist in same genre

  // 1. get random playlist of selected genre
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

async function getMultipleArtistsFromSpotify(artistsIds: string[], accessToken: string) {
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

/* TRACKS */
function createTrackNameVariations(trackName: string) {
  const trackNameVariations = [
    trackName, // original
    trackName.split(" (")[0], // before the brackets
    trackName.split(" -")[0], // before the hyphen
    trackName.split(" /")[0], // before the slash
    // trackName.split("/ ")[1].split(" (")[0], // after the slash & before the brackets
  ];
  const bracketsContent = trackName.match(/\(([^()]+)\)/)?.[1];
  if (bracketsContent && !["ft  ", "ft. ", "feat", "with"].includes(bracketsContent?.slice(0, 4))) {
    trackNameVariations.push(bracketsContent);
  }
  // console.log(trackNameVariations)
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

// search for track by selected artist
async function getAllTracksByAnArtist(artistId: string, accessToken: string) {
  const searchUrl = `https://api.spotify.com/v1/artists/${artistId}/albums`;

  try {
    const res = await axios.get<{ tracks: { items: Track[] } }>(searchUrl, {
      params: {
        q: `${songNameGuess.replace(/\s/g, "%20")}%20artist:${artistName.replace(/\s/g, "%20")}`,
        type: "track",
        limit: "5",
        offset: "0",
        market: "US",
      },
      headers: standardRequestHeaders(accessToken),
    });
    return res;
  } catch (error) {
    console.log(`[searchForTrackByArtistOnSpotify] ${error}`);
    return;
  }
}

type SearchArgs = { trackName: string; artistName: string | undefined; accessToken: string; limit: number | undefined };
async function searchForTracks({ trackName, artistName, accessToken, limit }: SearchArgs) {
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

    // flatten the array so that it's as if they all came from one response
    const tracksResponse = {
      data: batchResponses.reduce((arr, response) => {
        arr.push(...response.data.tracks.items);
        return arr;
      }, [] as Track[]),
    };

    return tracksResponse;
  } catch (error) {
    console.log(`Unable to retrieve songs from Spotify: ${error}`);
    return null;
  }
}

exports.checkSongForTwoArtists = functions.https.onCall(async (data, context) => {
  // search for tracks matching name and artist
  const tokenResponse = await getSpotifyAuthToken(); // request access token
  if (!tokenResponse) return;

  const potentialTracks: Track[] = [];
  for (const artist of ["currentArtist", "nextArtist"]) {
    const tracksResponse = await searchForTracks({
      trackName: data.songNameGuess,
      artistName: data[artist].name,
      accessToken: tokenResponse.data.access_token,
      limit: 5,
    });
    if (!tracksResponse) continue;

    potentialTracks.push(...tracksResponse.data);
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
exports.searchForTracks = functions.https.onCall(
  async ({ trackName, artistName, requireMulipleArtists, requireThisArtist, limit, strictMode }) => {
    // request spotify access token
    const tokenResponse = await getSpotifyAuthToken();
    if (!tokenResponse) return;

    // search for tracks matching trackName and artistName
    const tracksResponse = await searchForTracks({
      trackName,
      artistName: requireThisArtist ? artistName : undefined,
      accessToken: tokenResponse.data.access_token,
      limit: limit ?? 50,
    });
    if (!tracksResponse) return;

    // apply filters
    // filter to only keep tracks with multiple artists including this artist
    // also filtering out tracks that don't have the same title as data.trackName
    const tracks = tracksResponse.data.filter((track) => {
      return (
        (!requireMulipleArtists || track.artists.length > 1) && // multiple artists
        (!requireThisArtist || track.artists.some((artist) => artist.name === artistName)) && // correct artist
        isTrackNameSimilar(trackName, track.name, strictMode) // name is right (or almost right)
      );
    });
    console.log(`[searchForTracks] ${tracksResponse.data.length} tracks found and filtered to ${tracks.length}`);
    tracksResponse.data.forEach((track) => {
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

/* STORED GENRES/PLAYLISTS */
exports.getStoredPlaylists = functions.https.onCall(async () => {
  return playlists;
});

exports.getStoredGenres = functions.https.onCall(async () => {
  return Object.keys(playlists);
});

// // search for track by selected artist
// async function getArtistsFromPlaylist(playlistId: string, accessToken: string) {
//   const searchUrl = `https://api.spotify.com/v1/playlists/${playlistId}`;
//   try {
//     const res = await axios.get<{
//       tracks: { items: { track: { artists: Artist[] } }[] };
//     }>(searchUrl, {
//       params: {
//         // "fields": "tracks.items(track(artists(name,id,popularity)))",
//         fields: "tracks.items(track(artists(name,id)))",
//       },
//       headers: {
//         "Accept": "application/json",
//         // 'Access-Control-Allow-Origin': '*',
//         "Authorization": `Bearer ${accessToken}`,
//         "Content-Type": "application/json",
//       },
//     });
//     return res;
//   } catch (error) {
//     console.log(`[getArtistsFromPlaylist] ${error}`);
//     return;
//   }
// }

// exports.setNewStoredArtists = functions.pubsub
//   .schedule("every day 04:00")
//   .onRun(async (context) => {
//     // a. Select popular artists from spotfy
//     const artists: { [index: string]: Artist } = {}; // as an object to avoid duplicates
//     // Top Weekly Songs UK & USA and Top Daily Songs UK & USA
//     const chartPlaylistsIds = [
//       "37i9dQZEVXbMwmF30ppw50",
//       "37i9dQZEVXbLp5XoPON0wI",
//       "37i9dQZEVXbLnolsZ8PSNw",
//       "37i9dQZEVXbLRQDuF5jeBp",
//     ];

//     // request spotify access token
//     let tokenResponse;
//     for (let i = 0; i < 3 && !tokenResponse; i++) {
//       tokenResponse = await getSpotifyAuthToken();
//     }
//     if (!tokenResponse) return;

//     // add every artist from each track from each of these playlists to artists object
//     for (const playlistId of chartPlaylistsIds) {
//       const res = await getArtistsFromPlaylist(
//         playlistId,
//         tokenResponse.data.access_token
//       );
//       if (res) {
//         res.data.tracks.items.forEach((item) => {
//           for (const artist of item.track.artists) {
//             artists[artist.id] = artist;
//           }
//         });
//       }
//     }

//     // b. get artists profile pictures from spotify
//     const fullArtistsInfo = await getMultipleArtistsFromSpotify(
//       Object.keys(artists),
//       tokenResponse.data.access_token
//     );
//     if (!fullArtistsInfo) return;
//     const photoUrls: { [index: string]: { url: string } } = {};
//     for (const setOfArtistsInfo of fullArtistsInfo) {
//       setOfArtistsInfo.data.artists.forEach((artist) => {
//         photoUrls[artist.id] = artist?.images?.[artist.images.length - 1] ?? "";
//       });
//     }
//     Object.keys(artists).forEach((artistId, index) => {
//       if (!artistId || !photoUrls[artistId]) {
//         console.log(artistId, "has no photos");
//       }
//       artists[artistId]["photoUrl"] = photoUrls[artistId]
//         ? photoUrls[artistId]?.["url"]
//         : null;
//     });

//     // c. set artists in firebase
//     function updateStoredArtists() {
//       const artistsCollectionRef = firestore.collection("artists");
//       return firestore.runTransaction(async (transaction) => {
//         // delete previous artists
//         const snapshot = await artistsCollectionRef.get();
//         console.log(`Deleting ${snapshot.docs.length} Artists`);
//         snapshot.forEach((artistDoc) => {
//           transaction.delete(artistsCollectionRef.doc(artistDoc["id"]));
//         });
//         // set new artists
//         console.log(`Adding ${Object.keys(artists).length} New Artists`);
//         for (const artist of Object.entries(artists)) {
//           // console.log(artist[0])
//           const artistRef = firestore.collection("artists").doc();
//           transaction.set(artistRef, {
//             id: artist[0],
//             name: artist[1]["name"],
//             photoUrl: artist[1]["photoUrl"] ?? null,
//           });
//         }
//       });
//     }
//     return updateStoredArtists();
//   });

// exports.setDailyChallenge = functions.pubsub
//   .schedule("every day 06:00")
//   .onRun(async (context) => {
//     // select 2 random artists from artists collection
//     const selectedArtists = {};
//     while (Object.keys(selectedArtists).length < 2) {
//       const randArtistDoc = await getRandomArtist();
//       selectedArtists[randArtistDoc.id] = randArtistDoc;
//     }
//     const selectedArtistsDocs = Object.values(selectedArtists);

//     console.log("Daily Challenge Artists", selectedArtists);
//     // set artists
//     const todaysDate = admin.firestore.Timestamp.now()
//       .toDate()
//       .toDateString()
//       .replace(/ /g, "");
//     const todaysChallengeRef = firestore
//       .collection("dailyChallenge")
//       .doc(todaysDate);
//     todaysChallengeRef.set({
//       initialArtist: selectedArtistsDocs[0],
//       finalArtist: selectedArtistsDocs[1],
//     });
//   });

// exports.getDailyChallenge = functions.https.onCall(async () => {
//   // console.log(admin.firestore.Timestamp.now());
//   const todaysDate = admin.firestore.Timestamp.now()
//     .toDate()
//     .toDateString()
//     .replace(/ /g, "");
//   const todaysChallenge = await firestore
//     .doc(`dailyChallenge/${todaysDate}`)
//     .get();
//   const todaysArtistsData = {
//     initialArtist: (await todaysChallenge.data()["initialArtist"].get()).data(),
//     finalArtist: (await todaysChallenge.data()["finalArtist"].get()).data(),
//   };
//   // console.log(todaysArtistsData)
//   return todaysArtistsData;
// });
