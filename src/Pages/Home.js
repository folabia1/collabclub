import React from "react";
import { useNavigate } from "react-router-dom";

export function Home() {
  let navigate = useNavigate();
  let roomId = "001";
  return (
    <div className="roomContainer">
      <h2>Play with nearby friends</h2>
      <button onClick={() => navigate(`./room/${roomId}`)}>Find a room</button>
    </div>
  )
}