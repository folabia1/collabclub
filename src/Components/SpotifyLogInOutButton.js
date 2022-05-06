import React, { useContext } from "react";
// import { UserContext } from "../App";
// import { useNavigate } from "react-router-dom";
// import { signInWithCredential, signOut } from 'firebase/auth';
// import { auth } from '../firebase-config';
import spotifyIcon from "../images/spotify-icon.png"
import { InfoContext } from "../App";

export function SpotifyLogInOutButton() {
  // const { user, setUser } = useContext(UserContext)
  const { setInfo } = useContext(InfoContext)
  // let navigate = useNavigate();
    
  async function handleClick() {
    setInfo("You can't login with Spotify yet, that feature's coming soon!");
  }

  return (
    <button className="SpotifyLogInOutButton" onClick={handleClick}>
      <img className="spotifyIcon" src={spotifyIcon} alt="spotfiy-icon" />
      <p>Login with <span className="spotifyText">Spotify</span></p>
    </button>
    // {auth.currentUser && !auth.currentUser.displayName}
  )
}

