import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { searchForTracksWithQuery } from "../logic/api";

const StyledTrackSearchInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;

  .results {
    flex-grow: 1;
    flex-shrink: 1;

    .track-artists {
      display: flex;
      gap: 0.4rem;
      align-items: center;
    }

    .select-artist {
      background-color: var(--secondary);
      color: #242625;
      padding: 0rem 0.8rem;
      &:hover {
        opacity: 0.9;
      }
    }
  }

  .search-area {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    align-items: flex-end;
    .refresh-artists-btn {
      padding: 0.8rem;
      border: 1px solid var(--text-primary);
      @media (prefers-color-scheme: dark) {
        background-color: var(--text-primary);
        color: var(--background-primary);
      }
    }
  }

  .input-area {
    display: flex;
    gap: 1.2rem;
  }

  input {
    flex-grow: 1;
    background-color: rgba(255, 255, 255, 0.8);

    border-radius: 8px;
    border-width: 0px;
    border-color: var(--button-primary);
    color: #242625;
    padding: 0.4rem;
    font-size: 1.2rem;
  }
`;

const StyledSearchAndResults = styled.div``;

export default function SearchAndResults({
  onSelectArtist = (artist) => {},
  currentPathArtist,
  loadingArtists = false,
  isErrorLoadingArtists = false,
}) {
  const [inputValue, setInputValue] = useState("");
  const [lastGuess, setLastGuess] = useState(null);
  const [isError, setIsError] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const resultsMessage = loadingArtists
    ? "Loading..."
    : searchResults.length === 0
    ? "No results."
    : isError
    ? "Error fetching results. Try again."
    : null;

  // component functions
  async function handleSubmit(inputValue) {
    if (!inputValue) return;

    const isRetry = inputValue === lastGuess;
    setLastGuess(inputValue);

    const filters = {
      trackName: inputValue,
      artistName: currentPathArtist?.name ?? "",
      requireMultipleArtists: !isRetry,
      requireThisArtist: !isRetry,
      requireSimilarName: true,
      strictMode: false,
    };

    try {
      const data = await searchForTracksWithQuery(filters);
      const tracks = data?.data ?? [];
      setSearchResults(tracks);
      setIsError(false);
    } catch {
      setIsError(true);
    }
  }

  useEffect(() => {
    setInputValue("");
    setLastGuess(null);
    setSearchResults([]);
  }, [currentPathArtist]);

  return (
    <StyledSearchAndResults>
      <div className="results">
        {resultsMessage && <span>{resultsMessage}</span>}
        {searchResults.map((track) => (
          <div key={track.id}>
            <p>{track.name}</p>
            <div className="track-artists">
              {track.artists.map((artist) => {
                const clickable =
                  artist.id != currentPathArtist?.id && track.artists.map((artist) => artist.id).includes(currentPathArtist?.id ?? "");

                return clickable ? (
                  <button key={artist.id} className="select-artist btn-primary" onClick={() => onSelectArtist(artist)}>
                    {artist.name}
                  </button>
                ) : (
                  <span key={artist.id}>{artist.name}</span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="search-area">
        <StyledTrackSearchInput>
          <div className="info">
            <i className="fa fa-circle-info" />
            <span>
              Search for a track with <b>{currentPathArtist?.name ?? "this artist"}</b> and another artist.
            </span>
          </div>
          <div className="input-area">
            <input
              type="search"
              placeholder="Track name..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => (e.key === "Enter" ? handleSubmit(e.target.value) : null)}
              disabled={loadingArtists}
            />
            <button className="submit-btn btn-primary" onClick={handleSubmit}>
              <i className="fa fa-magnifying-glass" />
            </button>
          </div>
        </StyledTrackSearchInput>
      </div>
    </StyledSearchAndResults>
  );
}
