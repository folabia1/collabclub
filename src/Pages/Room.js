import React from "react";
import { Outlet, useParams } from "react-router-dom";

export function Room() {
  const { roomId } = useParams();
  // console.log(typeof(roomId));

  if (!/^\d{3}$/.test(roomId)) {
    return <p>Oops! <strong>Room {roomId}</strong> is not a guest room. Guest rooms only for now.</p>
  }
  
  // check server for which rooms locked (in a game already) 
  let openRooms = ["001", "002", "003"]
  if (!openRooms.includes(roomId)) {
    console.log(roomId)
    return <p>Oops! <strong>Room {roomId}</strong> is not available right now.</p>
  }


  return (
    <div className="roomContainer">
      <h2>Play with nearby friends</h2>
      <p>Room {roomId}</p>
    </div>
  )
}


// export function Room(props) {

//   const { roomId } = useParams();
//   return <p>{roomId}</p>

//   if (!isGuestRoom) {
//     return <p>Oops! Only guest rooms are available at the moment.</p>
//   }
//   if (!openRooms.includes(roomId)) {
//     console.log(roomId)
//     return <p>Oops! Room not available.</p>
//   }

//   return (
//     <div className="roomContainer">
//       <h2>Play with nearby friends</h2>
//       <p>Room {roomId}</p>
//     </div>
//   )
// }