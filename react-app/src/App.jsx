import React, { createContext, useEffect, useState, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { connectFirestoreEmulator } from "firebase/firestore";
import { connectFunctionsEmulator } from "firebase/functions";
import { db, functions } from "./firebase-config";

import { Home } from "./pages/Home";
import { MultiPlayer } from "./pages/MultiPlayer";
import { SinglePlayer } from "./pages/SinglePlayer";
import { DevelopersOnly } from "./pages/DevelopersOnly";
import { Sidebar } from "./components/Sidebar";

export const UserContext = createContext(null);
export const InfoContext = createContext([]);

function App() {
  const [user, _setUser] = useState(null);
  const userRef = useRef(user);
  function setUser(newUser) {
    userRef.current = newUser;
    _setUser(newUser);
  }

  const [info, _setInfo] = useState([]);
  const infoRef = useRef();
  function setInfo(newInfo) {
    _setInfo((prevInfo) => {
      infoRef.current.show();
      infoRef.current.style.display = "block";
      return [newInfo, ...prevInfo];
    });
    setTimeout(() => {
      _setInfo((prevInfo) => {
        if (prevInfo.length <= 1) {
          infoRef.current.close();
          infoRef.current.style.display = "none";
        }
        return prevInfo.slice(0, -1);
      });
    }, 5000);
  }

  useEffect(() => {
    connectFirestoreEmulator(db, "localhost", 8080);
    connectFunctionsEmulator(functions, "localhost", 5001);
  }, []);

  return (
    <Router>
      <div className="App">
        <dialog ref={infoRef} open={false} className="infoBox">
          {info[0]}
        </dialog>
        <UserContext.Provider value={{ user, setUser }}>
          <InfoContext.Provider value={{ info, setInfo }}>
            <Sidebar />
            <main>
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
