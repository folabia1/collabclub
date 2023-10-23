import "./index.css";

import { connectFirestoreEmulator } from "firebase/firestore";
import { connectFunctionsEmulator } from "firebase/functions";
import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { firestore, functions } from "./firebase-config";

if (import.meta.env.DEV) {
  connectFirestoreEmulator(firestore, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
}

const root = createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
