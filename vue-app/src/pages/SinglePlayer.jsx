import React, { useState, useEffect, useContext } from "react";
import { FeaturePathFinder } from "../components/FeaturePathFinder";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase-config";
import { UserContext, InfoContext } from "../App";
import { GenreSelector } from "../components/GenreSelector";
// import { PlaylistsContext } from "../App";

export function SinglePlayer() {
  const checkSongForArtists = httpsCallable(functions, "checkSongForArtists");
  const getRandomStartingArtists = httpsCallable(functions, "getRandomStartingArtists");

  const { user } = useContext(UserContext);
  const { setInfo } = useContext(InfoContext);
  // const { selectedPlaylists, finishedSelecting } = useContext(PlaylistsContext);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [result, setResult] = useState(null);
  const [featurePath, setFeaturePath] = useState([]);
  const [streak, setStreak] = useState(0);
  const [completePaths, setCompletePaths] = useState([]);
  let mixGenres = false;

  // useEffect(() => {
  //   refreshArtists(); // get artists for room
  // }, []);

  async function refreshArtists() {
    const randGenre = selectedGenres[Math.floor(Math.random() * selectedGenres.length)];
    const artistsResponse = await getRandomStartingArtists({
      genreName: randGenre,
      mixGenres,
    });
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
      return [{ artist: artistsResponse.data[0], track: null }, { artist: artistsResponse.data[1] }];
    });
    if (!result) {
      setStreak(0);
    }
    setResult(null);
    // setStreak((prevStreak) => prevStreak + 1);
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
          artistNames: trackResponse.data.trackArtists,
        };
        return prevFeaturePath;
      });
      setStreak((prevStreak) => prevStreak + 1);
      setCompletePaths((prevCompletePaths) => [...prevCompletePaths, featurePath]);
      setResult(true);
    } else {
      console.log("Wrong 😭");
      setInfo("Wrong 😭");
      setStreak(0);
      setResult(false);
    }
    // allow users to press next button (which was skip before)
    // or hit enter
  }

  return (
    <>
      {/* {!user && <p>Connecting...</p>} */}
      {selectedGenres.length === 0 ? (
        <GenreSelector onSubmit={(genres) => setSelectedGenres([...genres])} />
      ) : (
        <div className="SinglePlayer">
          <pre>
            <strong>{user && user.username ? user.username : "Guest"}</strong>
          </pre>
          <FeaturePathFinder
            featurePath={featurePath}
            onSubmitMiddle={(songNameGuess, nextArtistGuess) => submitMiddleSong(songNameGuess, nextArtistGuess)}
            onSubmitFinal={submitFinalSong}
          />
          <button
            className={"next-btn" + (streak === 0 && featurePath.length > 0 ? " skip-btn" : "")}
            onClick={refreshArtists}
          >
            {featurePath.length === 0 ? "Start" : streak >= 1 ? "Next" : "Skip"}
          </button>
          <div className="streak-and-correct">
            <p>
              <strong>
                <span role="img" aria-label="fire">
                  🔥
                </span>
                {streak}
              </strong>
            </p>
            <p>
              <strong>
                <span role="img" aria-label="tick">
                  ✅
                </span>
                {completePaths.length}
              </strong>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
