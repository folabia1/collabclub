import React, { useRef, useContext } from "react";
import { UserContext } from "../App";
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../firebase-config';


export function ChooseGuestUsername() {
  const guestUsername = useRef(null);
  const { user } = useContext(UserContext)

  function randomiseUsername() {
    guestUsername.current.value = "sooo-random";
  }

  async function handleSubmit(event) {
    // get username from form
    event.preventDefault();
    guestUsername.current.value = "";

    // use username to log in anonymously
    await signInAnonymously(auth);
    user.displayName = guestUsername;
  }

  return (
    !user ? <span /> :
    <div className="ChooseGuestUsername">
      <h3>Continue as Guest</h3>
      <p>Find a track featuring both artists.</p>
      <form onSubmit={handleSubmit} autoComplete="off">
        <input placeholder="userName" ref={guestUsername} type="text" id="guestName" name="guestName"></input>
        <button onClick={randomiseUsername}>Randomise</button>
        <button type="submit">Choose Username</button>
      </form>
    </div>
  )
}

