import * as functions from "firebase-functions"; // The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
import * as admin from "firebase-admin"; // The Firebase Admin SDK to access Firestore.

// setup firebase and firestore
admin.initializeApp();
export const firestore = admin.firestore();

const maxPlayersPerRoom = 6;

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

exports.joinRoom = functions.https.onCall(
  async (
    { roomName, role }: { roomName: string; role?: "Player" | "Spectator" },
    context
  ): Promise<{ role: "Player" | "Spectator" | null }> => {
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

    // TODO: add ability to add a user to a room as a spectator even if there is space for them as a player

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
  }
);

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

  // TODO: switch this to use a random artist from spotify instead of a stored artist
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

/* EMULATOR */
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
