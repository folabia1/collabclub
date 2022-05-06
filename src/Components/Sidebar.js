import React from "react";
import { Link, useLocation } from "react-router-dom";
import { SpotifyLogInOutButton } from "./SpotifyLogInOutButton";

import homeIcon from "../images/icons8-home-96-white.png";
import userIcon from "../images/icons8-user-96-white.png";
import plusIcon from "../images/plus-icon-white.png";
import developerIcon from "../images/html-tags.png";

export function Sidebar() {
  const location = useLocation().pathname;

  const navLinks = {
    top: {
      home: {
        title: "Home",
        location: "/",
        src: homeIcon,
        alt: "home-icon",
      },
      "single-player": {
        title: "Single-Player",
        location: "/single-player",
        src: userIcon,
        alt: "single-player-icon",
      },
      "multi-player": {
        title: "Multi-Player",
        location: "/multi-player",
        src: plusIcon,
        alt: "plus-icon",
      },
    },
    bottom: {
      "for-developers": {
        title: "For Developers",
        location: "/developers",
        src: developerIcon,
        alt: "html-tags-icon",
      },
    },
  };

  return (
    <nav className="sidebar">
      <Link id="title" className="navLink" to="/">
        <h1>Collab Club</h1>
      </Link>
      <SpotifyLogInOutButton />
      <nav className="navLinks">
        <div className="topNavLinks">
          {Object.values(navLinks["top"]).map((link, index) => (
            <Link
              key={index}
              className={
                "navLink" + (location === link["location"] ? " active" : "")
              }
              to={link["location"]}
            >
              <img src={link["src"]} alt={link["alt"]} />
              <h2>{link["title"]}</h2>
            </Link>
          ))}
        </div>
        <div className="bottomNavLinks">
          {Object.values(navLinks["bottom"]).map((link, index) => (
            <Link
              key={index}
              className={
                "navLink" + (location === link["location"] ? " active" : "")
              }
              to={link["location"]}
            >
              <img src={link["src"]} alt={link["alt"]} />
              <h2>{link["title"]}</h2>
            </Link>
          ))}
        </div>
      </nav>
    </nav>
  );
}
