import React from 'react';
import useFetch from '../Hooks/useFetch';
import defaultAvatar from "../images/default-avatar-profile-dark.png";

export function SpotifyArtistsSearchBar(props) {
  const { data, setData } = useFetch()

  function handleSelect(artist) {
    if (!props.pathArtists.includes(artist["id"])) {
      props.onSelect(artist)
    }
  }

  return (
    <div className="SpotifyArtistsSearchBar">
      {props.middleArtist["id"] ? 
        <>
          <p><strong>{props.middleArtist["name"]}</strong></p>
          <button onClick={() => handleSelect({
            "id": null,
            "name": null,
            "photoUrl": null,
          })}>x</button>
        </>
      :
        <>
          <input
            type="search"
            placeholder="Search for an artist"
            value={data.slug}
            onChange={(e) => setData({...data, slug: e.target.value})}
            />
          {!Array.isArray(data.results) ? null : (
            <ul>
              {data.results.map((artist, index) => {
                return (
                  <li key={index}>
                    <img 
                      className="searchArtistsProfilePic"
                      src={artist.photoUrl ? artist.photoUrl : defaultAvatar}
                      alt={artist.name}
                      />
                    <button onClick={() => handleSelect(data.results[index])}>{artist.name}</button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      }
    </div>
  )
}