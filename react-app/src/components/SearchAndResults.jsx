import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { searchForTracksWithQuery } from "../logic/api";

const StyledTrackSearchInput = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;

  .input-area {
    display: flex;
    gap: 1.2rem;
  }

  input {
    flex-grow: 1;
    background-color: rgba(255, 255, 255, 0.8);

    border-radius: 8px;
    border-width: 2px;
    border-color: var(--button-primary);
    color: #242625;
    padding: 0.4rem;
    font-size: 1.2rem;
  }
`;

const StyledSearchAndResults = styled.div``;

export default function SearchAndResults({ onSelectArtist, currentPathArtist, loadingArtists = false, isErrorLoadingArtists = false }) {
  const [inputValue, setInputValue] = useState("");
  const [trackGuess, setTrackGuess] = useState(null);
  const [isRetry, setIsRetry] = useState(false);

  const filters = {
    trackName: trackGuess,
    artistName: currentPathArtist?.name ?? "",
    requireMultipleArtists: !isRetry,
    requireThisArtist: !isRetry,
    requireSimilarName: true,
    strictMode: false,
  };

  const { data, isLoading, isError, refetch } = useQuery({
    enabled: !!trackGuess,
    queryKey: ["track-search", filters],
    queryFn: async () => searchForTracksWithQuery(filters),
  });

  const suggestedTracks = data ?? [];

  const resultsMessage = loadingArtists
    ? "Loading..."
    : suggestedTracks.length === 0 && isRetry
    ? "No results."
    : isError
    ? "Error fetching results. Try again."
    : null;

  // component functions
  function handleSubmit() {
    if (inputValue === trackGuess) {
      setIsRetry(true);
      setInputValue("");
    } else {
      setTrackGuess(inputValue);
    }

    refetch();
  }

  useEffect(() => {
    setInputValue("");
  }, [currentPathArtist]);

  return (
    <StyledSearchAndResults>
      <div className="results">
        {resultsMessage && <span>{resultsMessage}</span>}
        {suggestedTracks.map((track) => (
          <div key={track.id}>
            <p>{track.name}</p>
            <div className="track-artists">
              {track.artists.map((artist) => {
                const clickable =
                  artist.id == currentPathArtist?.id || !track.artists.map((artist) => artist.id).includes(currentPathArtist?.id ?? "");

                return clickable ? (
                  <button className="select-artist btn-primary" onClick={onSelectArtist}>
                    {artist.name}
                  </button>
                ) : (
                  <span>{artist.name}</span>
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
              onKeyUp={(e) => (e.key === "Enter" ? handleSubmit() : null)}
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
