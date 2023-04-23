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
};

type Track = {
  id: string;
  name: string;
  artists: Artist[];
};

const standardRequestHeaders = (accessToken: string) => ({
  "Accept": "application/json",
  "Authorization": `Bearer ${accessToken}`,
  "Content-Type": "application/json",
});

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
  const deleteGuestUsers = async (nextPageToken?: string) => {
    // List batch of users, 1000 at a time.
    try {
      const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
      const dateNow = admin.firestore.Timestamp.now().toDate().getDate();
      const toDelete: string[] = [];
      listUsersResult.users.forEach((userRecord) => {
        const creationDate = new Date(userRecord.metadata.creationTime).getDate();
        if (dateNow != creationDate) {
          toDelete.push(userRecord.uid);
        }
      });

      // Delete Users
      if (toDelete.length > 0) {
        console.log(`[deleteGuestUsers] Deleting ${toDelete.length} users.`);
        admin.auth().deleteUsers(toDelete);
      } else {
        console.log("[deleteGuestUsers] No guest users to delete.");
      }

      // Delete next batch of guest
      if (listUsersResult.pageToken) {
        deleteGuestUsers(listUsersResult.pageToken);
      }
      return toDelete.length > 0;
    } catch (error) {
      console.log("Error listing users:", error);
      return false;
    }
  };
  return deleteGuestUsers();
});

/* ROOM */
exports.getRoom = functions.https.onCall(async (data = null) => {
  const roomsRef = firestore.collection("rooms");
  let query: admin.firestore.Query;
  if (data?.activityLevel) {
    query = roomsRef.where("players", "==", data.activityLevel === "active").limit(1);
  } else {
    query = roomsRef.limit(1);
  }
  const querySnapshot = await query.get();
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    console.log(`Room found: ${doc.id}`);
    // roomsRef.doc(doc.id).update({"active": true});
    return { name: doc.id, ...doc.data() };
  } else {
    console.log(`Room not found.`);
    return null;
  }
});

exports.joinRoom = functions.https.onCall(async (data, context) => {
  // user is not signed in
  if (!context.auth) {
    console.log(`Unable to add user to room. No user provided.`);
    return { role: null };
  }

  if (typeof data["roomName"] !== "string") {
    console.log(`Unable to add user to room. Argument "roomName" must be a string.`);
  }

  const roomRef = firestore.doc(`rooms/${data["roomName"]}`);
  const snapshot = await roomRef.get();
  // if room does not exist
  if (!snapshot.exists) {
    console.log(`Unable to add ${context?.auth?.uid ? `User ${context.auth.uid}` : "user"} to Room ${data["roomName"]}. Room does not exist.`);
    return { role: null };
  }

  const snapshotData = snapshot.data();
  if (!snapshotData) {
    return;
  }
  // user is alreday a player in room
  if (snapshotData["players"].includes(context.auth.uid)) {
    return { role: "Player" };
  }

  // user is currently a spectator
  if (snapshotData["spectators"].includes(context.auth.uid)) {
    if (snapshotData["players"].length < 6) {
      // room has space for user
      roomRef.update({
        players: [...snapshotData["players"], context.auth.uid],
      });
      return { role: "Player" };
    } else {
      // room does not have space for user
      roomRef.update({
        spectators: [...snapshotData["spectators"], context.auth.uid],
      });
      return { role: "Spectator" };
    }
  }

  // user is not a player or spectator in room
  if (snapshotData["players"].length < 6) {
    // room has space for user
    roomRef.update({ active: true });
    roomRef.update({
      players: [...snapshotData["players"], context.auth.uid],
    });
    return { role: "Player" };
  } else {
    // room does not have space for user
    roomRef.update({
      spectators: [...snapshotData["spectators"], context.auth.uid],
    });
    return { role: "Spectator" };
  }
});

exports.leaveRoom = functions.https.onCall(async (data, context) => {
  const roomRef = firestore.doc(`rooms/${data["roomName"]}`);
  const snapshot = await roomRef.get();
  const snapshotData = snapshot.data();

  // if room does not exist
  if (!snapshot.exists || !snapshotData) {
    console.log(
      `Cannot remove ${context?.auth?.uid ? `User ${context.auth.uid}` : "user"} from room. Room ${data["roomName"]}. Room does not exist.`
    );
    return false;
  }

  // remove user from players
  const players = snapshotData["players"];
  for (let i = 0; i < players.length; i++) {
    if (players[i] === context?.auth?.uid) {
      players.splice(i, 1);
      roomRef.update({ players: players });
      console.log(`${context?.auth?.uid ?? "User"} stopped playing in Room ${data["roomName"]}`);
      return true;
    }
  }

  // remove user from spectators
  const spectators = snapshotData["spectators"];
  for (let i = 0; i < spectators.length; i++) {
    if (spectators[i] === context?.auth?.uid) {
      spectators.splice(i, 1);
      roomRef.update({ spectators: spectators });
      console.log(`${context?.auth?.uid ?? "User"} stopped playing in Room ${data["roomName"]}`);
      return true;
    }
  }

  // user is not a player or spectator in room
  console.log(`${context?.auth?.uid ?? "User"} is not in Room ${data["roomName"]}`);
  return false;
});

exports.setNewRoomArtists = functions.https.onCall(async (data) => {
  // select 2 random artists from artists collection
  const selectedArtists: Artist[] = [];
  while (selectedArtists.length < 2) {
    const randArtistDoc = await getRandomStoredArtist();
    const artistData = (await randArtistDoc.get()).data() as Artist;
    selectedArtists.push(artistData);
  }
  // update selected artists in room
  firestore.doc(`rooms/${data.roomName}`).update({
    initialArtist: {
      id: selectedArtists[0]["id"],
      name: selectedArtists[0]["name"],
    },
    finalArtist: {
      id: selectedArtists[1]["id"],
      name: selectedArtists[1]["name"],
    },
  });
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

exports.updateRoom = functions.firestore.document("/rooms/{roomName}").onUpdate((change, context) => {
  const promises = [];
  const dataBefore = change.before.data();
  const dataAfter = change.after.data();
  // check for CHANGE (in initial and final artists)
  if (dataAfter["initialArtist"].id != dataBefore["initialArtist"].id || dataAfter["finalArtist"].id != dataBefore["finalArtist"].id) {
    // if artists are not null, update lastChange
    if (!(dataAfter["initialArtist"].id == null && dataAfter["finalArtist"].id == null)) {
      console.log("UPDATING LAST CHANGE");
      promises.push(change.after.ref.set({ lastChange: admin.firestore.Timestamp.now() }, { merge: true }));
    }
  }

  // check for CHANGE (in players and spectators)
  if (
    JSON.stringify(dataAfter["players"]) != JSON.stringify(dataBefore["players"]) ||
    JSON.stringify(dataAfter["spectators"]) != JSON.stringify(dataBefore["spectators"])
  ) {
    // if room empty (no players or sepctators), reset room
    if (dataAfter["players"].length === 0 && dataAfter["spectators"].length === 0) {
      console.log("RESETTING ROOM");
      promises.push(resetRoom(context.params.roomName));
    }
  }
  // background functions must return a Promise back to firebase
  return Promise.all(promises);
});

exports.resetUnusedRooms = functions.pubsub.schedule("every day 04:00").onRun(async (context) => {
  const roomsList = await firestore.collection("rooms").listDocuments();
  const writeBatch = firestore.batch();

  const timeNow = admin.firestore.Timestamp.now().toDate();
  for (const roomRef of roomsList) {
    const room = await roomRef.get();
    const roomData = room.data();
    if (!roomData) {
      return;
    }
    // if lastChange in room was more than 3 mins ago
    if (timeNow.getMinutes() - 3 > roomData["lastChange"].toDate().getMinutes()) {
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

  const resetRoomsResponse = await writeBatch.commit();
  console.log("[EVERY 3 MINUTES] Clearing empty rooms!");
  return resetRoomsResponse;
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
      console.log(response.data.images[response.data.images.length - 1]["url"]);
      const photoUrl = response.data.images[response.data.images.length - 1]["url"] ?? null;
      randArtist["photoUrl"] = photoUrl;
      console.log(randArtist);
      return randArtist;
    } catch (error) {
      console.log(`[getRandomArtistFromGenre-searchArtist] ${error}`);
      return;
    }
  } catch (error) {
    console.log(`[getRandomArtistFromGenre] ${error}`);
    return;
  }
}

exports.getRandomStartingArtists = functions.https.onCall(async ({ genreName }: { genreName: string | undefined }) => {
  // select 2 random artists from artists collection

  const genres = Object.keys(playlists);
  const randomGenre = genres[Math.floor(Math.random() * genres.length)];
  const selectedGenre = genreName && genres.includes(genreName) ? genreName : randomGenre;
  const selectedArtists: { [index: string]: Artist } = {};

  const maxRetries = 10;
  for (let i = 0; i < maxRetries && Object.keys(selectedArtists).length < 2; i++) {
    const randArtistData = await getRandomArtistFromGenre(selectedGenre);
    if (randArtistData?.id) {
      selectedArtists[randArtistData.id] = randArtistData;
    }
  }
  const selectedArtistsData = Object.values(selectedArtists);

  return selectedArtistsData;
});

exports.searchForArtistOnSpotify = functions.https.onCall(async (data) => {
  const tokenResponse = await getSpotifyAuthToken(); // request access token
  if (!tokenResponse) return;
  const searchUrl = `https://api.spotify.com/v1/search?q=${data.artistName.replace(/\s/g, "%20")}`;

  try {
    const res = await axios.get(searchUrl, {
      params: {
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

function isTrackNameSimilar(songNameGuess: string, actualSongName: string, hardMode = false) {
  const variations = createTrackNameVariations(actualSongName);
  console.log(variations);
  if (hardMode) {
    for (const variation of variations) {
      if (
        songNameGuess.localeCompare(variation, undefined, {
          sensitivity: "base",
        }) === 0
      ) {
        return true;
      }
    }
  } else {
    // easy mode
    for (const variation of variations) {
      if (Math.abs(songNameGuess.length - variation.length) <= 1) {
        return true;
      }
    }
  }
  return false;
}

// TODO: change to just search for track, allow two artists featuring on somone else's song
// search for track by selected artist
async function searchForTrackByArtistOnSpotify(songNameGuess: string, artistName: string, accessToken: string) {
  const searchUrl = `https://api.spotify.com/v1/search?q=${songNameGuess.replace(/\s/g, "%20")}%20${artistName.replace(/\s/g, "%20")}`;

  try {
    const res = await axios.get<{ tracks: { items: Track[] } }>(searchUrl, {
      params: {
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

exports.checkSongForArtists = functions.https.onCall(async (data, context) => {
  // search for tracks matching name and artist
  const tokenResponse = await getSpotifyAuthToken(); // request access token
  if (!tokenResponse) {
    return;
  }
  const potentialTracks = [];
  for (const artist of ["currentArtist", "nextArtist"]) {
    const res = await searchForTrackByArtistOnSpotify(data.songNameGuess, data[artist].name, tokenResponse.data.access_token);
    if (res) {
      potentialTracks.push(...res.data.tracks.items);
    }
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
  console.log(`Track does NOT contain ${data["currentArtist"].name} & ${data["nextArtist"].name}`);
  return {
    trackFound: false,
    trackId: null,
    trackName: null,
    trackArtists: null,
  };
});

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

// // returns 50 artists at a time
// async function getMultipleArtistsFromSpotify(
//   artistsIds: string[],
//   accessToken: string
// ) {
//   const responses = [];
//   for (let i = 0; i < Math.ceil(artistsIds.length / 50); i++) {
//     const searchUrl = "https://api.spotify.com/v1/artists";
//     try {
//       const res = await axios.get<{ artists: Artist[] }>(searchUrl, {
//         params: {
//           ids: artistsIds.slice(50 * i, 50 * i + 50).toString(),
//         },
//         headers: {
//           "Accept": "application/json",
//           // 'Access-Control-Allow-Origin': '*',
//           "Authorization": `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//       });
//       responses.push(res);
//       // console.log(res.data)
//       // return res;
//     } catch (error) {
//       console.log(`[getMultipleArtistsFromSpotify] ${error}`);
//       return;
//     }
//   }
//   return Promise.all(responses);
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
