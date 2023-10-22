import "./index.css";

import { connectFirestoreEmulator } from "firebase/firestore";
import { connectFunctionsEmulator } from "firebase/functions";
import React from "react";
import { createRoot } from "react-dom/client";

import { db } from "../firebase-config";
import App from "./App";
import { functions } from "./firebase-config";

if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
}

const root = createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
