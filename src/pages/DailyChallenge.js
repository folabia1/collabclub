import React, { useState, useEffect, useContext } from "react";
import { FeatureGuesser } from "../Components/FeaturePathFinder";
import { ChooseGuestUsername } from "../Components/ChooseGuestUsername";
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase-config';
import { UserContext, RoomContext } from "../App";


export function DailyChallenge() {
  const { user } = useContext(UserContext)

  useEffect(() => {
    const getDailyChallenge = httpsCallable(functions, 'getDailyChallenge');
  
    // handle leaving room on firestore
    return () => leaveRoom({"roomName": roomParams});
  }, [])
  


  return (
    <div className="roomContainer">
      <pre><strong>{user ? `Hello ${user.uid}` : "Not logged in"}</strong></pre>
      <h2>Play with nearby friends</h2>
      {user ? <FeatureGuesser roomName={roomParams}/> : <ChooseGuestUsername />}
    </div>
  )
}