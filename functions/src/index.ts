import { getSpotifyAuth } from "./getSpotifyAuth";
import axios from "axios";
import { playlists } from "./playlists";
// import artistsIds from "./artistsIds.json";

// The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
import * as functions from "firebase-functions";
// The Firebase Admin SDK to access Firestore.
import * as admin from "firebase-admin";
admin.initializeApp();
const firestore = admin.firestore();

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

exports.getRoom = functions.https.onCall(async (data = null) => {
  const roomsRef = firestore.collection("rooms");
  let query: admin.firestore.Query;
  if (data?.activityLevel) {
    query = roomsRef
      .where("players", "==", data.activityLevel === "active")
      .limit(1);
  } else {
    query = roomsRef.limit(1);
  }
  const querySnapshot = await query.get();
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    console.log(doc.id);
    // roomsRef.doc(doc.id).update({"active": true});
    return { name: doc.id, ...doc.data() };
  } else {
    return null;
  }
});

exports.joinRoom = functions.https.onCall(async (data, context) => {
  // user is not signed in
  if (!context.auth) {
    return { role: null };
  }

  const roomRef = firestore.doc(`rooms/${data["roomName"]}`);
  const snapshot = await roomRef.get();
  // if room does not exist
  if (!snapshot.exists) {
    console.log(`Cannot leave Room ${data["roomName"]}. Room does not exist.`);
    return { role: null };
  }

  // user is alreday a player in room
  if (snapshot.data()["players"].includes(context.auth.uid)) {
    return { role: "Player" };
  }

  // user is currently a spectator
  if (snapshot.data()["spectators"].includes(context.auth.uid)) {
    if (snapshot.data()["players"].length < 6) {
      // room has space for user
      roomRef.update({
        players: [...snapshot.data()["players"], context.auth.uid],
      });
      return { role: "Player" };
    } else {
      // room does not have space for user
      roomRef.update({
        spectators: [...snapshot.data()["spectators"], context.auth.uid],
      });
      return { role: "Spectator" };
    }
  }

  // user is not a player or spectator in room
  if (snapshot.data()["players"].length < 6) {
    // room has space for user
    roomRef.update({ active: true });
    roomRef.update({
      players: [...snapshot.data()["players"], context.auth.uid],
    });
    return { role: "Player" };
  } else {
    // room does not have space for user
    roomRef.update({
      spectators: [...snapshot.data()["spectators"], context.auth.uid],
    });
    return { role: "Spectator" };
  }
});

exports.leaveRoom = functions.https.onCall(async (data, context) => {
  const roomRef = firestore.doc(`rooms/${data["roomName"]}`);
  const snapshot = await roomRef.get();
  // if room does not exist
  if (!snapshot.exists) {
    console.log(`Cannot leave Room ${data["roomName"]}. Room does not exist.`);
    return false;
  }

  // remove user from players
  const players = snapshot.data()["players"];
  for (let i = 0; i < players.length; i++) {
    if (players[i] === context.auth.uid) {
      players.splice(i, 1);
      roomRef.update({ players: players });
      console.log(
        `${context.auth.uid} stopped playing in Room ${data["roomName"]}`
      );
      return true;
    }
  }

  // remove user from spectators
  const spectators = snapshot.data()["spectators"];
  for (let i = 0; i < spectators.length; i++) {
    if (spectators[i] === context.auth.uid) {
      spectators.splice(i, 1);
      roomRef.update({ spectators: spectators });
      console.log(
        `${context.auth.uid} stopped playing in Room ${data["roomName"]}`
      );
      return true;
    }
  }

  // user is not a player or spectator in room
  console.log(`${context.auth.uid} is not in Room ${data["roomName"]}`);
  return false;
});

async function getRandomArtist() {
  // gets id, name and photoUrl
  const artistsCollectionRef = firestore.collection("artists");
  while (true) {
    const key = artistsCollectionRef.doc().id;
    let snapshot = await artistsCollectionRef
      .where("__name__", ">=", key)
      .limit(1)
      .get();
    if (!snapshot.empty) {
      return firestore.doc(`artists/${snapshot.docs[0].id}`);
    }
  }
}

async function getRandomArtistFromGenre(genreName) {
  // arg 'genreName' should be randomly selected before calling function to keep starting and final artist in same genre

  // TODO: store access_token on firestore
  // 1. get random playlist of selected genre
  const playlistsIds = Object.values(playlists[genreName]);
  const randPlaylistId =
    playlistsIds[Math.floor(Math.random() * playlistsIds.length)];

  // 2. get all artists from selected playlist
  const tokenResponse = await getSpotifyAuth(); // request access token
  const searchUrl = `https://api.spotify.com/v1/playlists/${randPlaylistId}/tracks`;
  try {
    const res = await axios.get(searchUrl, {
      params: {
        fields: "items(track(artists(id, name)))",
      },
      headers: {
        "Accept": "application/json",
        // 'Access-Control-Allow-Origin': '*',
        "Authorization": `Bearer ${tokenResponse.data.access_token}`,
        "Content-Type": "application/json",
      },
    });
    const artists = [];
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
        headers: {
          "Accept": "application/json",
          // 'Access-Control-Allow-Origin': '*',
          "Authorization": `Bearer ${tokenResponse.data.access_token}`,
          "Content-Type": "application/json",
        },
      });
      console.log(response.data.images[response.data.images.length - 1]["url"]);
      const photoUrl =
        response.data.images[response.data.images.length - 1]["url"] ?? null;
      randArtist["photoUrl"] = photoUrl;
      console.log(randArtist);
      return randArtist;
    } catch (error) {
      console.log(`[getRandomArtistFromGenre-searchArtist] ${error}`);
      return error;
    }
  } catch (error) {
    console.log(`[getRandomArtistFromGenre] ${error}`);
    return error;
  }
}

exports.getRandomStartingArtists = functions.https.onCall(async (data) => {
  // select 2 random artists from artists collection

  const selectedArtists = {};
  if (data.genreName) {
    while (Object.keys(selectedArtists).length < 2) {
      const randArtistData = await getRandomArtistFromGenre(data.genreName);
      selectedArtists[randArtistData.id] = randArtistData;
    }
  } else {
    while (Object.keys(selectedArtists).length < 2) {
      const randArtistDoc = await getRandomArtist();
      const artistData = (await randArtistDoc.get()).data();
      selectedArtists[randArtistDoc.id] = artistData;
    }
  }
  const selectedArtistsData = Object.values(selectedArtists);

  return selectedArtistsData;
});

exports.setNewRoomArtists = functions.https.onCall(async (data) => {
  // select 2 random artists from artists collection
  const selectedArtists = {};
  while (Object.keys(selectedArtists).length < 2) {
    const randArtistDoc = await getRandomArtist();
    const artistData = (await randArtistDoc.get()).data();
    selectedArtists[randArtistDoc.id] = artistData;
  }
  const selectedArtistsData = Object.values(selectedArtists);
  // console.log("NEXT ARTISTS", selectedArtistsData)
  console.log(data.roomName);
  // update selected artists in room
  firestore.doc(`rooms/${data.roomName}`).update({
    initialArtist: {
      id: selectedArtistsData[0]["id"],
      name: selectedArtistsData[0]["name"],
    },
    finalArtist: {
      id: selectedArtistsData[1]["id"],
      name: selectedArtistsData[1]["name"],
    },
  });
  return selectedArtistsData;
});

// search for artist
exports.searchForArtistOnSpotify = functions.https.onCall(async (data) => {
  const tokenResponse = await getSpotifyAuth(); // request access token
  const searchUrl = `https://api.spotify.com/v1/search?q=${data.artistName.replace(
    /\s/g,
    "%20"
  )}`;

  try {
    const res = await axios.get(searchUrl, {
      params: {
        type: "artist",
        limit: "4",
        offset: "0",
        market: "US",
      },
      headers: {
        "Accept": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Authorization": `Bearer ${tokenResponse.data.access_token}`,
        "Content-Type": "application/json",
      },
    });
    const searchResults = res.data.artists.items;
    const artistsData = searchResults.map((artist) => {
      return {
        id: artist.id,
        name: artist.name,
        photoUrl: artist.images[artist.images.length - 1]
          ? artist.images[artist.images.length - 1]["url"]
          : null,
      };
    });
    return artistsData;
  } catch (error) {
    console.log(`[searchForArtistOnSpotify] ${error}`);
    return error;
  }
});

function createTrackNameVariations(trackName: string) {
  const trackNameVariations = [
    trackName, // original
    trackName.split(" (")[0], // before the brackets
    trackName.split(" -")[0], // before the hyphen
    trackName.split(" /")[0], // before the slash
    // trackName.split("/ ")[1].split(" (")[0], // after the slash & before the brackets
  ];
  const bracketsContent = trackName.match(/\(([^()]+)\)/)?.[1];
  if (
    bracketsContent &&
    !["ft  ", "ft. ", "feat", "with"].includes(bracketsContent?.slice(0, 4))
  ) {
    trackNameVariations.push(bracketsContent);
  }
  // console.log(trackNameVariations)
  return [...new Set(trackNameVariations)];
}

function isTrackNameSimilar(
  songNameGuess: string,
  actualSongName: string,
  hardMode = false
) {
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
async function searchForTrackByArtistOnSpotify(
  songNameGuess,
  artistName,
  accessToken
) {
  const searchUrl = `https://api.spotify.com/v1/search?q=${songNameGuess.replace(
    /\s/g,
    "%20"
  )}%20${artistName.replace(/\s/g, "%20")}`;
  // console.log(searchUrl);

  try {
    const res = await axios.get(searchUrl, {
      params: {
        type: "track",
        limit: "5",
        offset: "0",
        market: "US",
      },
      headers: {
        "Accept": "application/json",
        // 'Access-Control-Allow-Origin': '*',
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    return res;
  } catch (error) {
    console.log(`[searchForTrackByArtistOnSpotify] ${error}`);
    return error;
  }
}

exports.checkSongForArtists = functions.https.onCall(async (data, context) => {
  // search for tracks matching name and artist
  const tokenResponse = await getSpotifyAuth(); // request access token
  const potentialTracks = [];
  for (const artist of ["currentArtist", "nextArtist"]) {
    const res = await searchForTrackByArtistOnSpotify(
      data.songNameGuess,
      data[artist].name,
      tokenResponse.data.access_token
    );
    // console.log("THIS IS RES DATA", res.data)
    potentialTracks.push(...res.data.tracks.items);
  }
  // console.log(potentialTracks);

  // check if song features both artists
  for (const track of potentialTracks) {
    if (
      track.artists.length < 2 ||
      !isTrackNameSimilar(data.songNameGuess, track.name)
    ) {
      continue;
    }
    const trackArtistsIds = track.artists.map((artist) => artist.id);
    const trackArtistsNames = track.artists.map((artist) => artist.name);

    const trackAccepted =
      trackArtistsIds.includes(data["currentArtist"].id) &&
      trackArtistsIds.includes(data["currentArtist"].id);
    console.log(
      `Track contains ${data["currentArtist"].name} & ${data["nextArtist"].name}: ${trackAccepted}`
    );

    if (trackAccepted) {
      return {
        trackFound: true,
        trackId: track.id,
        trackName: track.name,
        trackArtists: trackArtistsNames,
      };
    }
  }
  console.log(
    `Track contains ${data["currentArtist"].name} & ${data["nextArtist"].name}: false`
  );
  return {
    trackFound: false,
    trackId: null,
    trackName: null,
    trackArtists: null,
  };
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

exports.updateRoom = functions.firestore
  .document("/rooms/{roomName}")
  .onUpdate((change, context) => {
    const promises = [];
    const dataBefore = change.before.data();
    const dataAfter = change.after.data();
    // check for CHANGE (in initial and final artists)
    if (
      dataAfter["initialArtist"].id != dataBefore["initialArtist"].id ||
      dataAfter["finalArtist"].id != dataBefore["finalArtist"].id
    ) {
      // if artists are not null, update lastChange
      if (
        !(
          dataAfter["initialArtist"].id == null &&
          dataAfter["finalArtist"].id == null
        )
      ) {
        console.log("UPDATING LAST CHANGE");
        promises.push(
          change.after.ref.set(
            { lastChange: admin.firestore.Timestamp.now() },
            { merge: true }
          )
        );
      }
    }

    // check for CHANGE (in players and spectators)
    if (
      JSON.stringify(dataAfter["players"]) !=
        JSON.stringify(dataBefore["players"]) ||
      JSON.stringify(dataAfter["spectators"]) !=
        JSON.stringify(dataBefore["spectators"])
    ) {
      // if room empty (no players or sepctators), reset room
      if (
        dataAfter["players"].length === 0 &&
        dataAfter["spectators"].length === 0
      ) {
        console.log("RESETTING ROOM");
        promises.push(resetRoom(context.params.roomName));
      }
    }
    // background functions must return a Promise back to firebase
    return Promise.all(promises);
  });

exports.resetUnusedRooms = functions.pubsub
  .schedule("every 3 minutes")
  .onRun(async (context) => {
    const roomsList = await firestore.collection("rooms").listDocuments();
    const writeBatch = firestore.batch();

    const timeNow = admin.firestore.Timestamp.now().toDate();
    for (const roomRef of roomsList) {
      const room = await roomRef.get();
      // if lastChange in room was more than 3 mins ago
      if (
        timeNow.getMinutes() - 3 >
        room.data()["lastChange"].toDate().getMinutes()
      ) {
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

exports.deleteGuestUsers = functions.pubsub
  .schedule("every day 03:00")
  .onRun((context) => {
    // Start listing users from the beginning, 1000 at a time.
    const deleteGuestUsers = async (nextPageToken = undefined) => {
      // List batch of users, 1000 at a time.
      try {
        const listUsersResult = await admin
          .auth()
          .listUsers(1000, nextPageToken);
        const dateNow = admin.firestore.Timestamp.now().toDate().getDate();
        const toDelete = [];
        listUsersResult.users.forEach((userRecord) => {
          const creationDate = new Date(
            userRecord.metadata.creationTime
          ).getDate();
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

// search for track by selected artist
async function getArtistsFromPlaylist(playlistId: string, accessToken: string) {
  const searchUrl = `https://api.spotify.com/v1/playlists/${playlistId}`;
  try {
    const res = await axios.get(searchUrl, {
      params: {
        // "fields": "tracks.items(track(artists(name,id,popularity)))",
        fields: "tracks.items(track(artists(name,id)))",
      },
      headers: {
        "Accept": "application/json",
        // 'Access-Control-Allow-Origin': '*',
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    return res;
  } catch (error) {
    console.log(`[getArtistsFromPlaylist] ${error}`);
    return error;
  }
}

// returns 50 artists at a time
async function getMultipleArtistsFromSpotify(
  artistsIds: string[],
  accessToken: string
) {
  const responses = [];
  for (let i = 0; i < Math.ceil(artistsIds.length / 50); i++) {
    const searchUrl = `https://api.spotify.com/v1/artists`;
    try {
      const res = await axios.get(searchUrl, {
        params: {
          ids: artistsIds.slice(50 * i, 50 * i + 50).toString(),
        },
        headers: {
          "Accept": "application/json",
          // 'Access-Control-Allow-Origin': '*',
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      responses.push(res);
      // console.log(res.data)
      // return res;
    } catch (error) {
      console.log(`[getMultipleArtistsFromSpotify] ${error}`);
      return error;
    }
  }
  return Promise.all(responses);
}

exports.setNewStoredArtists = functions.pubsub
  .schedule("every day 04:00")
  .onRun(async (context) => {
    // a. Select popular artists from spotfy
    let artists = {}; // as an object to avoid duplicates
    // Top Weekly Songs UK & USA and Top Daily Songs UK & USA
    const chartPlaylistsIds = [
      "37i9dQZEVXbMwmF30ppw50",
      "37i9dQZEVXbLp5XoPON0wI",
      "37i9dQZEVXbLnolsZ8PSNw",
      "37i9dQZEVXbLRQDuF5jeBp",
    ];
    const tokenResponse = await getSpotifyAuth(); // request access token
    for (const playlistId of chartPlaylistsIds) {
      const res = await getArtistsFromPlaylist(
        playlistId,
        tokenResponse.data.access_token
      );
      res.data.tracks.items.forEach((item) => {
        for (const artist of item.track.artists) {
          // console.log("artist", artist);
          artists[artist.id] = { name: artist.name };
        }
      });
    }

    // b. get artists profile pictures from spotify
    const fullArtistsInfo = await getMultipleArtistsFromSpotify(
      Object.keys(artists),
      tokenResponse.data.access_token
    );
    let photoUrls = {};
    for (const setOfArtistsInfo of fullArtistsInfo) {
      setOfArtistsInfo.data.artists.forEach((artist) => {
        photoUrls[artist.id] = artist.images[artist.images.length - 1];
      });
    }
    Object.keys(artists).forEach((artistId, index) => {
      if (!photoUrls[artistId]) {
        console.log(artistId, "has no photos");
      }
      artists[artistId]["photoUrl"] = photoUrls[artistId]
        ? photoUrls[artistId]["url"]
        : null;
    });

    // c. set artists in firebase
    function updateStoredArtists() {
      const artistsCollectionRef = firestore.collection("artists");
      return firestore.runTransaction(async (transaction) => {
        // delete previous artists
        const snapshot = await artistsCollectionRef.get();
        console.log(`Deleting ${snapshot.docs.length} Artists`);
        snapshot.forEach((artistDoc) => {
          transaction.delete(artistsCollectionRef.doc(artistDoc["id"]));
        });
        // set new artists
        console.log(`Adding ${Object.keys(artists).length} New Artists`);
        for (const artist of Object.entries(artists)) {
          // console.log(artist[0])
          const artistRef = firestore.collection("artists").doc();
          transaction.set(artistRef, {
            id: artist[0],
            name: artist[1]["name"],
            photoUrl: artist[1]["photoUrl"] ?? null,
          });
        }
      });
    }
    return updateStoredArtists();
  });

exports.setDailyChallenge = functions.pubsub
  .schedule("every day 06:00")
  .onRun(async (context) => {
    // select 2 random artists from artists collection
    const selectedArtists = {};
    while (Object.keys(selectedArtists).length < 2) {
      const randArtistDoc = await getRandomArtist();
      selectedArtists[randArtistDoc.id] = randArtistDoc;
    }
    const selectedArtistsDocs = Object.values(selectedArtists);

    console.log("Daily Challenge Artists", selectedArtists);
    // set artists
    const todaysDate = admin.firestore.Timestamp.now()
      .toDate()
      .toDateString()
      .replace(/ /g, "");
    const todaysChallengeRef = firestore
      .collection("dailyChallenge")
      .doc(todaysDate);
    todaysChallengeRef.set({
      initialArtist: selectedArtistsDocs[0],
      finalArtist: selectedArtistsDocs[1],
    });
  });

exports.getDailyChallenge = functions.https.onCall(async () => {
  // console.log(admin.firestore.Timestamp.now());
  const todaysDate = admin.firestore.Timestamp.now()
    .toDate()
    .toDateString()
    .replace(/ /g, "");
  const todaysChallenge = await firestore
    .doc(`dailyChallenge/${todaysDate}`)
    .get();
  const todaysArtistsData = {
    initialArtist: (await todaysChallenge.data()["initialArtist"].get()).data(),
    finalArtist: (await todaysChallenge.data()["finalArtist"].get()).data(),
  };
  // console.log(todaysArtistsData)
  return todaysArtistsData;
});

exports.getStoredPlaylists = functions.https.onCall(async () => {
  return playlists;
});

exports.getStoredGenres = functions.https.onCall(async () => {
  return Object.keys(playlists);
});