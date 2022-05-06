import React, { useState } from "react";
// import { httpsCallable } from 'firebase/functions';
// import { functions } from '../firebase-config';
import { SpotifyArtistsSearchBar } from "./SpotifyArtistsSearchBar";

export function FeaturePathFinder(props) {

  const [ isMiddleArtistActive, setIsMiddleArtistActive ] = useState(false)
  const [ middleArtist, setMiddleArtist ] = useState({
    "id": null,
    "name": null,
    "photoUrl": null,
  })

  function toggleMiddleArtistActive() {
    if (isMiddleArtistActive) {
      setIsMiddleArtistActive(false)
      setMiddleArtist({
        "id": null,
        "name": null,
        "photoUrl": null,
      })
    } else {
      setIsMiddleArtistActive(true)
    }
  }

  function handleSubmitMiddle(event) {
    event.preventDefault();
    // a. make sure we have artist selected
    if (middleArtist.id) {
      // b. then clear both text inputs
      const artistNameGuess = event.target[0].value
      event.target[0].value = ""
      // c. then call submitMiddle of props
      props.onSubmitMiddle(artistNameGuess, middleArtist)
      setMiddleArtist({
        "id": null,
        "name": null,
        "photoUrl": null,
      });
      setIsMiddleArtistActive(false);
    }
  }

  function renderArtistOnPath(artist, index, featurePathLength) {
    // dont show input box for last artist
    if (index === featurePathLength-1) {
      return <p className="artistName">{artist["artist"]["name"]}</p>;
    }
    if (index === featurePathLength-2) {
      if (artist["track"]) {
        return <p className="artistName">{artist["artist"]["name"]}</p>
      }
      return (
        <>
          <p className="artistName">{artist["artist"]["name"]}</p>
          <form onSubmit={isMiddleArtistActive ? handleSubmitMiddle : props.onSubmitFinal} autoComplete="off">
            <input autoFocus type="text" id="songGuess" name="songGuess"
              placeholder="Track name"></input>
            <button type="submit">Check</button>
          </form>
          <button onClick={toggleMiddleArtistActive}>{isMiddleArtistActive ? "-" : "+"}</button>
          {!isMiddleArtistActive ? null :
            <SpotifyArtistsSearchBar 
              pathArtists={props.featurePath.map(artist => artist["artist"]["id"])}
              onSelect={(artist) => setMiddleArtist(artist)}
              middleArtist={middleArtist}
            />
          }
        </>
      )
    }
    return <p className="artistName">{artist["artist"]["name"]}</p>;
  }

  // TODO: loading animation while waiting for new artists
  return (
    <div className="FeaturePathFinder">
      {props.featurePath.map((artist, index) => {
        return (
          <div key={artist["artist"]["id"]}>
            {renderArtistOnPath(artist, index, props.featurePath.length)}
          </div>
        )
      })}
    </div> 
  )
}

