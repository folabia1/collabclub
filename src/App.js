import "./App.css";
import React, { createContext, useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { connectFirestoreEmulator } from "firebase/firestore";
import {
  connectAuthEmulator,
  onAuthStateChanged,
  signInAnonymously,
  deleteUser,
} from "firebase/auth";
import { connectFunctionsEmulator } from "firebase/functions";
import { auth, db, functions } from "./firebase-config";

import { Home } from "./Pages/Home";
import { MultiPlayer } from "./Pages/MultiPlayer";
import { SinglePlayer } from "./Pages/SinglePlayer";
import { DevelopersOnly } from "./Pages/DevelopersOnly";
import { Sidebar } from "./Components/Sidebar";

export const UserContext = createContext(null);
export const InfoContext = createContext(null);

function App() {
  const [user, _setUser] = useState(null);
  const [info, _setInfo] = useState("");

  // TODO: setup an array containing all info messages, to restart timer every time a new message comes in
  // new info message: set message as info, add message to front of array, if array was empty -> fade in info box
  // after 5 seconds: remove final item from array, if array now empty -> remove set info to "" & fade out info box

  function setInfo(newInfo) {
    _setInfo(newInfo);
    const timeoutId = setTimeout(() => {
      _setInfo("");
    }, 5000);
    // clearTimeout(timeoutId)
  }

  const userRef = useRef(user);
  const setUser = (newUser) => {
    userRef.current = newUser;
    _setUser(newUser);
  };

  async function handleTabClosing() {
    // delete and sign out guest user
    if (auth.currentUser.isAnonymous) {
      await deleteUser(auth.currentUser);
    }
  }

  useEffect(() => {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectFunctionsEmulator(functions, "localhost", 5001);
    onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
    });
    if (!auth.currentUser) {
      // SIGN IN
      (async () => await signInAnonymously(auth))();
    }
    window.addEventListener("unload", handleTabClosing);

    return async () => {
      window.removeEventListener("unload", handleTabClosing);
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <UserContext.Provider value={{ user, setUser }}>
          <InfoContext.Provider value={{ info, setInfo }}>
            <Sidebar />
            <main>
              <div className="infoBoxArea">
                <div className="infoBox">
                  <p>{info}</p>
                </div>
              </div>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="single-player" element={<SinglePlayer />} />
                <Route path="multi-player">
                  <Route path=":roomParams" element={<MultiPlayer />} />
                </Route>
                <Route path="developers-only" element={<DevelopersOnly />} />
              </Routes>
            </main>
          </InfoContext.Provider>
        </UserContext.Provider>
      </div>
    </Router>
  );
}

export default App;
