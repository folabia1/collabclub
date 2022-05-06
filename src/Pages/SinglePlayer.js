import React, { useState, useEffect, useContext } from "react";
import { FeaturePathFinder } from "../Components/FeaturePathFinder";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import { UserContext, InfoContext } from "../App";

export function SinglePlayer() {
  const checkSongForArtists = httpsCallable(functions, "checkSongForArtists");
  const getRandomStartingArtists = httpsCallable(
    functions,
    "getRandomStartingArtists"
  );

  const { user } = useContext(UserContext);
  const { setInfo } = useContext(InfoContext);
  const [result, setResult] = useState(null);
  const [featurePath, setFeaturePath] = useState([]);
  const [completePaths, setCompletePaths] = useState([]);

  useEffect(() => {
    refreshArtists(); // get artists for room
  }, []);

  async function refreshArtists() {
    const artistsResponse = await getRandomStartingArtists();
    console.log(
      `Received new artists. %c${artistsResponse.data[0].name} and ${artistsResponse.data[1].name}`,
      "font-weight: bold"
    );
    setInfo(
      <span>
        Received new artists.{" "}
        <strong>
          {artistsResponse.data[0].name} and {artistsResponse.data[1].name}
        </strong>
      </span>
    );
    setFeaturePath(() => {
      return [
        { artist: artistsResponse.data[0], track: null },
        { artist: artistsResponse.data[1] },
      ];
    });
    setResult(null);
  }

  async function submitMiddleSong(songNameGuess, nextArtistGuess) {
    const songGuessData = {
      songNameGuess: songNameGuess,
      currentArtist: {
        id: featurePath[featurePath.length - 2]["artist"]["id"],
        name: featurePath[featurePath.length - 2]["artist"]["name"],
      },
      nextArtist: {
        id: nextArtistGuess["id"],
        name: nextArtistGuess["name"],
      },
    };
    const trackResponse = await checkSongForArtists(songGuessData);

    if (trackResponse.data.trackFound) {
      setFeaturePath((prevFeaturePath) => {
        prevFeaturePath.splice(
          -2,
          1,
          // add linking track data to previous artist
          {
            artist: prevFeaturePath[prevFeaturePath.length - 2]["artist"],
            track: {
              id: trackResponse.data.trackId,
              name: trackResponse.data.trackName,
            },
          },
          // insert new artist to featurePath
          {
            artist: nextArtistGuess,
            track: null,
          }
        );
        return prevFeaturePath;
      });
      // display that answer was correct
      setInfo("Correct 🥳");
      console.log("Correct 🥳");
      setResult(true);
    } else {
      // display that answer was incorrect
      console.log("Wrong 😭");
      setInfo("Wrong 😭");
      setResult(false);
    }
  }

  async function submitFinalSong(event) {
    event.preventDefault();
    const songNameGuess = event.target[0].value;
    if (songNameGuess === "") {
      refreshArtists();
    }
    event.target[0].value = "";
    const songGuessData = {
      songNameGuess: songNameGuess,
      currentArtist: {
        id: featurePath[featurePath.length - 2]["artist"]["id"],
        name: featurePath[featurePath.length - 2]["artist"]["name"],
      },
      nextArtist: {
        id: featurePath[featurePath.length - 1]["artist"]["id"],
        name: featurePath[featurePath.length - 1]["artist"]["name"],
      },
    };
    const trackResponse = await checkSongForArtists(songGuessData);
    if (trackResponse.data.trackFound) {
      setFeaturePath((prevFeaturePath) => {
        prevFeaturePath[prevFeaturePath.length - 2]["track"] = {
          id: trackResponse.data.trackId,
          name: trackResponse.data.trackName,
        };
        return prevFeaturePath;
      });
      setCompletePaths((prevCompletePaths) => [
        ...prevCompletePaths,
        featurePath,
      ]);
    } else {
      console.log("Wrong 😭");
      setInfo("Wrong 😭");
    }
    // allow users to press next button (which was skip before)
    // or hit enter
  }

  return !user ? (
    <p>Must be logged in to play. You can continue as a guest if you'd like.</p>
  ) : (
    <div className="roomContainer">
      <pre>
        Playing as <strong>{user.username ? user.username : "Guest"}</strong>
      </pre>
      <FeaturePathFinder
        featurePath={featurePath}
        onSubmitMiddle={(songNameGuess, nextArtistGuess) =>
          submitMiddleSong(songNameGuess, nextArtistGuess)
        }
        onSubmitFinal={submitFinalSong}
      />
      <button onClick={refreshArtists}>
        {completePaths.length > 1 && result === null ? "Next" : "Skip"}
      </button>
    </div>
  );
}
