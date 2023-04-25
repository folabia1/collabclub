import React, { useState, useEffect, useContext } from "react";
import { useParams } from "react-router-dom";
import { FeaturePathFinder } from "../components/FeaturePathFinder";
import { ChooseGuestUsername } from "../components/ChooseGuestUsername";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import { UserContext } from "../App";

export function MultiPlayer() {
  const joinRoom = httpsCallable(functions, "joinRoom");
  const leaveRoom = httpsCallable(functions, "leaveRoom");
  const setNewRoomArtists = httpsCallable(functions, "setNewRoomArtists");
  const checkSongForTwoArtists = httpsCallable(functions, "checkSongForTwoArtists");
  const { user } = useContext(UserContext);
  let [userRole, setUserRole] = useState("");
  const { roomParams } = useParams();
  // let [ initialArtist, setInitialArtist ] = useState('');
  // let [ finalArtist, setFinalArtist ] = useState('');
  let [result, setResult] = useState(null);
  const [featurePath, setFeaturePath] = useState([]);

  // Mounting Component
  useEffect(() => {
    setRole(); // set user's role as player or spectator
    refreshArtists(); // get artists for room
    return () => leaveRoom({ roomName: roomParams }); // handle leaving room on firestore
  }, []);

  async function setRole() {
    const joinRoomResponse = await joinRoom({ roomName: roomParams });
    console.log("Role: ", joinRoomResponse.data.role);
    setUserRole(joinRoomResponse.data.role);
  }

  async function refreshArtists() {
    const artistsResponse = await setNewRoomArtists({ roomName: roomParams });
    console.log(
      `Room ${roomParams}: Received new artists. %c${artistsResponse.data[0].name} and ${artistsResponse.data[1].name}`,
      "font-weight: bold"
    );
    setFeaturePath(() => {
      return [{ artist: artistsResponse.data[0], track: null }, { artist: artistsResponse.data[1] }];
    });
  }

  // async function submitMiddleSong(songNameGuess, featurePath) {
  //   const songGuessData = {
  //     "songNameGuess": songNameGuess,
  //     "currentArtist": featurePath[featurePath.length-3],
  //     "nextArtist": featurePath[featurePath.length-2],
  //   }
  //   const trackResponse = await checkSongForTwoArtists(songGuessData)
  // }

  // async function submitFinalSong(songNameGuess, featurePath) {
  //   const songGuessData = {
  //     "songNameGuess": songNameGuess,
  //     "currentArtist": featurePath[featurePath.length-2],
  //     "nextArtist": featurePath[featurePath.length-1],
  //   }
  //   const trackResponse = await checkSongForTwoArtists(songGuessData)

  // }

  async function handleSubmit(event) {
    // check if track inputted features both artists
    event.preventDefault();
    const songGuessData = {
      roomName: roomParams,
      songNameGuess: event.target[0].value,
    };
    const trackResponse = await checkSongForTwoArtists(songGuessData);
    console.log(`"${event.target[0].value}" Accepted: ${trackResponse.data.trackFound}`);
    setResult(trackResponse.data.trackFound);

    // if not final artist, add to feature path
    // setFeaturePath((prevFeaturePath) => {
    //   return ([
    //     ...prevFeaturePath.slice(0, -2),
    //     {
    //       artist: prevFeaturePath[prevFeaturePath.length-2]["artist"],
    //       track: {name: event.target[0].value, id: trackResponse.data.trackId}
    //     },
    //     prevFeaturePath[prevFeaturePath.length-1]
    //   ])
    // })
    event.target[0].value = "";
    refreshArtists();
  }

  // // updates when answer given
  // useEffect(() => {
  //   if (result) {
  //     // flash green
  //     // add track name & album art to current artist on featurePath
  //     // add new artist with name and id to featurePath
  //   } else if (result === false) {
  //     // flash red
  //   }
  // }, [result])

  return !/^\d{3}$/.test(roomParams) ? (
    <p>
      Oops! <strong>Room "{roomParams}"</strong> is not a guest room. Guest rooms only for now.
    </p>
  ) : !user ? (
    <p>Must be logged in to enter a room. You can continue as a guest if you'd like.</p>
  ) : (
    <div className="roomContainer">
      <pre>
        <strong>{user ? `Hello ${user.uid}` : "Not logged in"}</strong>
      </pre>
      <h2>Play with nearby friends</h2>
      <p>Room {roomParams}</p>
      <p>Role: {userRole}</p>
      {user ? <FeaturePathFinder onSubmit={handleSubmit} featurePath={featurePath} /> : <ChooseGuestUsername />}
      <p>{result !== null ? (result ? "Correct 🥳" : "Wrong 😭") : ""}</p>
    </div>
  );
}
