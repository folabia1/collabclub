import React, { useState } from "react";
// import { httpsCallable } from 'firebase/functions';
// import { functions } from '../firebase-config';
import { SpotifyArtistsSearchBar } from "./SpotifyArtistsSearchBar";
import defaultAvatar from "../images/default-avatar-profile-dark.png";
import { ArtistOnPath } from "./ArtistOnPath";

export function FeaturePathFinder(props) {
  const [isMiddleArtistActive, setIsMiddleArtistActive] = useState(false);
  const [middleArtist, setMiddleArtist] = useState({
    id: null,
    name: null,
    photoUrl: defaultAvatar,
  });

  function toggleMiddleArtistActive() {
    if (isMiddleArtistActive) {
      setIsMiddleArtistActive(false);
      setMiddleArtist({
        id: null,
        name: null,
        photoUrl: defaultAvatar,
      });
    } else {
      setIsMiddleArtistActive(true);
    }
  }

  function handleSubmitMiddle(event) {
    event.preventDefault();
    // a. make sure we have artist selected
    if (middleArtist.id) {
      // b. then clear both text inputs
      const artistNameGuess = event.target[0].value;
      event.target[0].value = "";
      // c. then call submitMiddle of props
      props.onSubmitMiddle(artistNameGuess, middleArtist);
      setMiddleArtist({
        id: null,
        name: null,
        photoUrl: defaultAvatar,
      });
      setIsMiddleArtistActive(false);
    }
  }

  function renderArtistOnPath(artist, index, featurePathLength) {
    // show input box for second-to-last artist
    // (unless already filled in i.e. feature path is complete)
    if (index === featurePathLength - 2 && !artist["track"]) {
      return (
        <>
          <ArtistOnPath
            type=""
            name={artist["artist"]["name"]}
            photoUrl={artist["artist"]["photoUrl"]}
            track={artist["track"]}
          />
          {/* <div className="artist">
            <img
              className="artist-image"
              src={
                artist["artist"]["photoUrl"]
                  ? artist["artist"]["photoUrl"]
                  : defaultAvatar
              }
              alt={artist["artist"]["name"] + " profile picture"}
            />
            <p className="artist-name">{artist["artist"]["name"]}</p>
          </div> */}
          <form
            onSubmit={
              isMiddleArtistActive ? handleSubmitMiddle : props.onSubmitFinal
            }
            autoComplete="off"
          >
            <input
              type="text"
              autoFocus
              autoComplete="off"
              id="songGuess"
              name="songGuess"
              placeholder="Track name"
            ></input>
            <button type="submit">Check</button>
          </form>
          <button onClick={toggleMiddleArtistActive}>
            {isMiddleArtistActive ? "-" : "+"}
          </button>
          {!isMiddleArtistActive ? null : (
            <SpotifyArtistsSearchBar
              pathArtists={props.featurePath.map(
                (artist) => artist["artist"]["id"]
              )}
              onSelect={(artist) => setMiddleArtist(artist)}
              middleArtist={middleArtist}
            />
          )}
        </>
      );
    }
    return (
      <ArtistOnPath
        type=""
        name={artist["artist"]["name"]}
        photoUrl={artist["artist"]["photoUrl"]}
        track={artist["track"]}
      />

      // <div className="artist">
      //   <img
      //     className="artist-image"
      //     src={
      //       artist["artist"]["photoUrl"]
      //         ? artist["artist"]["photoUrl"]
      //         : defaultAvatar
      //     }
      //     alt={artist["artist"]["name"]}
      //   />
      //   <p className="artist-name">{artist["artist"]["name"]}</p>
      // </div>
    );
  }

  // TODO: loading animation while waiting for new artists
  return (
    <div className="FeaturePathFinder">
      {props.featurePath.map((artist, index) => (
        <div key={artist["artist"]["id"]}>
          {renderArtistOnPath(artist, index, props.featurePath.length)}
        </div>
      ))}
    </div>
  );
}
