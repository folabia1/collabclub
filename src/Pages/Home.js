import React, { useContext /*, useEffect*/ } from "react";
import { useNavigate } from "react-router-dom";
import { httpsCallable } from "firebase/functions";
// import { signInAnonymously } from 'firebase/auth';
import { functions } from "../firebase-config";
import { UserContext } from "../App";

export function Home() {
  // let navigate = useNavigate();
  const { user } = useContext(UserContext);

  // buttons for single-player, multi-player
  // info about advantages of logging in with spotfiy
  return (
    <div className="Home">
      <pre>
        <strong>{user && user.username ? user.username : "Guest"}</strong>
      </pre>
      <h2>Welcome to Collab Club</h2>
      {/* <button onClick={handleClick}>Find a room</button> */}
    </div>
  );
}
