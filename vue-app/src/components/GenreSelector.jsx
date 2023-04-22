import React, { useState, useEffect } from "react";
import { functions } from "../firebase-config";
import { httpsCallable } from "firebase/functions";

export function GenreSelector(props) {
  const getStoredGenres = httpsCallable(functions, "getStoredGenres");
  const [storedGenres, setStoredGenres] = useState([]);
  const [currentlySelectedGenres, setCurrentlySelectedGenres] = useState(
    new Set([])
  );

  // getStoredGenres on mount
  useEffect(() => {
    getStoredGenres()
      .then((allGenres) => {
        // console.log(allGenres.data);
        setStoredGenres(allGenres.data);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  // function handleClick(event) {
  //   setCurrentGenre(event.target.textContent);
  // }

  function handleChange(event) {
    // console.log(event.target.checked, event.target.id);
    setCurrentlySelectedGenres((prevSelectedGenres) => {
      const newSelectedGenres = new Set(prevSelectedGenres);
      if (event.target.checked) {
        newSelectedGenres.add(event.target.id);
      } else {
        newSelectedGenres.delete(event.target.id);
      }
      // console.log(newSelectedGenres);
      return newSelectedGenres;
    });
  }

  function handleClick(event) {
    console.log(event.target.children[1].checked);
    // console.log(event.target.checked, event.target.id);
    setCurrentlySelectedGenres((prevSelectedGenres) => {
      const newSelectedGenres = new Set(prevSelectedGenres);
      if (!event.target.children[1].checked) {
        newSelectedGenres.add(event.target.children[1].id);
      } else {
        newSelectedGenres.delete(event.target.children[1].id);
      }
      // console.log(newSelectedGenres);
      return newSelectedGenres;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    props.onSubmit(currentlySelectedGenres);
  }

  return (
    <div className="GenreSelector">
      <h1>Select Genres</h1>
      <form onSubmit={handleSubmit}>
        {storedGenres.length >= 1 && (
          <>
            <div className="genre-cards">
              {storedGenres.map((genreName, index) => (
                <div key={index} className="genre-card" onClick={handleClick}>
                  <label
                    htmlFor={genreName}
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {genreName}
                  </label>
                  <input
                    id={genreName}
                    type="checkbox"
                    checked={currentlySelectedGenres.has(genreName)}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onChange={handleChange}
                  />
                </div>
              ))}
            </div>
            <button type="submit">Continue</button>
          </>
        )}
      </form>
    </div>
  );
}
