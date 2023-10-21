import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import styled from "styled-components";

import { getRandomStartingArtists } from "../logic/api";
import ArtistImage from "./ArtistImage";
import GameOverModal from "./GameOverModal";
import GenreChip from "./GenreChip";
import SearchAndResults from "./SearchAndResults";
import Streak from "./Streak";
import TimerBar from "./TimerBar";

const StyledGame = styled.div`
  .time-challenge {
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    height: 100%;
  }

  .genre-chips {
    display: flex;
    gap: 0.8rem;
    overflow-x: auto;
  }

  .main {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-grow: 1;
    gap: 1.2rem;
  }

  .artists {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;

    .artists-in-play {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.4rem;

      .artists-stack {
        display: flex;
        > :not(:first-child) {
          margin-left: -18vw;
        }
      }
    }

    .artist-names {
      display: flex;
      justify-content: space-between;
      font-weight: 500;
      gap: 2rem;
    }
  }

  .results {
    flex-grow: 1;
    flex-shrink: 1;
    height: 0;
    overflow-y: auto;

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
`;

export default function Game() {
  const [pathArtists, setPathArtists] = useState([]);
  const [streak, setStreak] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const location = useLocation();
  const genreOptions = [];
  const [selectedGenre, setSelectedGenre] = useState(null);
  const nonSelectedGenres = genreOptions.filter((genre) => genre !== selectedGenre);

  useEffect(() => {
    setSelectedGenre();
  }, []);

  const currentPathArtist = pathArtists.length === 0 ? null : pathArtists[pathArtists.length - 1];

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["starting-artists"], queryFn: getRandomStartingArtists });
  const initialArtist = data?.data?.artists[0] ?? null;
  const finalArtist = data?.data?.artists[1] ?? null;

  function handleSelectArtist() {
    if (currentPathArtist?.id === finalArtist?.id) {
      setStreak((prevStreak) => prevStreak + 1);
      setPathArtists([]);
      refetch();
    }
  }

  function handleRestart() {
    setIsGameOver(false);
    refetch();
  }

  return (
    <StyledGame>
      <div className="time-challenge">
        <div className="genre-chips">
          {selectedGenre && <GenreChip text={selectedGenre} active={true} disabled={true} />}
          <GenreChip selectedGenre text={selectedGenre} active={false} disabled={true} />
        </div>

        <div className="main">
          <div className="artists">
            <div className="artists-in-play">
              <div className="artists-stack">
                <ArtistImage artist={initialArtist} loading={isLoading} />
                {pathArtists.map((artist) => (
                  <ArtistImage key={artist.id} artist={artist} />
                ))}
              </div>

              <i className="fa fa-2xl fa-arrow-right" />
              <ArtistImage artist={finalArtist} loading={isLoading} />
            </div>

            {currentPathArtist && finalArtist && (
              <div className="artist-names">
                <p>{currentPathArtist.name}</p>
                <p>{finalArtist.name}</p>
              </div>
            )}

            <TimerBar onTimeout={() => setIsGameOver(true)} streak={streak} />
            <SearchAndResults onSelectArtist={handleSelectArtist} />
            <Streak streak={streak} />
            <button className="refresh-artists-btn btn-primary" onClick={() => refetch()} disabled="store.isLoadingNewArtists">
              Skip
              <i className="fa fa-forward" />
            </button>
          </div>
        </div>
      </div>
      {isGameOver && <GameOverModal onClickRestart={handleRestart} />}
    </StyledGame>
  );
}
