// import logo from './logo.svg';
import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Outlet, useParams } from 'react-router-dom';
import { Home } from './Pages/Home';
import { Room } from './Pages/Room';
import { DevelopersOnly } from './Pages/DevelopersOnly';

function App() {
  // change roomName to roomId
  let roomId = "004";
  return (
    <Router>
      <div className="App">
        <header>
          <span />
          <Link className="navLink" to="/"><h1>Collab Club</h1></Link>
          <nav>
            <Link className="navLink" to="/">Home</Link>
            <Link className="navLink" to="/developers-only">Developers Only 👀</Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="room">
            <Route path="/room/:roomId" element={<Room />} />
          </Route>
          <Route path="/developers-only" element={<DevelopersOnly />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
