import React from "react";
import defaultAvatar from "../images/default-avatar-profile-dark.png";

export function ArtistOnPath(props) {
  return (
    <div className="ArtistOnPath">
      <div className="artist">
        <img
          className="artist-image"
          src={props.photoUrl || defaultAvatar}
          alt={props.name + " profile picture"}
        />
        <p className="artist-name">{props.name}</p>
      </div>
      <div className="track">
        <p>{props.track ? props.track["name"] : null}</p>
        <p>
          <strong>{props.track ? props.track["artistNames"] : null}</strong>
        </p>
      </div>
    </div>
  );
}
