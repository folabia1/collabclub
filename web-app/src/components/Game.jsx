import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";

import { getArtistWithPhotoUrl, getRandomStartingArtists } from "../logic/api";
import ArtistImage from "./ArtistImage";
import GameOverModal from "./GameOverModal";
import GenreChip from "./GenreChip";
import SearchAndResults from "./SearchAndResults";
import Streak from "./Streak";
import TimerBar from "./TimerBar";

const StyledGame = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  height: 100%;

  .genre-chips {
    display: grid;
    gap: 0.8rem;
    grid-template-columns: 1fr 1fr 1fr;

    @media (max-width: 380px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .main {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    gap: 1.2rem;
  }

  .artists {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;

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
      font-weight: 500;
      gap: 2rem;
      min-height: 2.2rem;

      > .artist-name {
        font-size: 1.2rem;
        flex: 1;

        &:last-child {
          text-align: right;
        }
      }
    }
  }

  .error {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    align-items: center;
  }
`;

export default function Game({ availableGenres }) {
  const [streak, setStreak] = useState(0);
  const [pathArtists, setPathArtists] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = location.search.slice(1).split("&");
  const genreOptions =
    searchParams
      .find((param) => param.startsWith("genre="))
      ?.slice(6)
      .split(",") ?? availableGenres;

  const selectedGenre = useMemo(() => genreOptions[Math.floor(genreOptions.length * Math.random())], []);
  const nonSelectedGenres = genreOptions.filter((genre) => genre !== selectedGenre);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["starting-artists"],
    queryFn: async () => getRandomStartingArtists({ genreName: selectedGenre }),
    refetchOnWindowFocus: false,
    enabled: !!selectedGenre,
  });

  useEffect(() => {
    if (!isLoading && !isError) startTimer();
  }, [isLoading]);

  const initialArtist = data?.data?.artists[0] ?? null;
  const finalArtist = data?.data?.artists[1] ?? null;

  const currentPathArtist = pathArtists.length === 0 ? initialArtist : pathArtists[pathArtists.length - 1];

  const timerBarRef = useRef(null);
  function startTimer() {
    if (timerBarRef?.current) timerBarRef.current.dispatchEvent(new Event("start-timer"));
  }

  async function handleSelectArtist(artist) {
    const pathComplete = artist?.id === finalArtist?.id;
    if (pathComplete) {
      startTimer();
      setStreak((prevStreak) => prevStreak + 1);
      setPathArtists([]);
      refetch();
    } else {
      try {
        const artistResponse = await getArtistWithPhotoUrl({ artistId: artist.id });
        const artistWithPhotoUrl = artistResponse.data;
        setPathArtists((prevPathArtists) => [...prevPathArtists, artistWithPhotoUrl]);
      } catch {
        setPathArtists((prevPathArtists) => [...prevPathArtists, artist]);
      }
    }
  }

  function handleSkip() {
    setPathArtists([]);
    refetch();
  }

  function handleRestart() {
    setStreak(0);
    startTimer();
    setPathArtists([]);
    setIsGameOver(false);
    refetch();
  }

  return (
    <StyledGame>
      <div className="genre-chips">
        {selectedGenre && <GenreChip text={selectedGenre} active={true} disabled={true} />}
        {nonSelectedGenres.map((genre) => (
          <GenreChip key={genre} text={genre} active={false} disabled={true} />
        ))}
      </div>

      <div className="main">
        <div className="artists">
          <div className="artists-in-play">
            <div className="artists-stack">
              <ArtistImage photoUrl={initialArtist?.photoUrl} name={initialArtist?.name} error={isError} fetching={isFetching} />
              {pathArtists.map((artist) => (
                <ArtistImage key={artist.id} photoUrl={artist?.photoUrl} name={artist?.name} error={isError} fetching={isFetching} />
              ))}
            </div>

            <i className="fa fa-2xl fa-arrow-right" />
            <ArtistImage photoUrl={finalArtist?.photoUrl} name={finalArtist?.name} error={isError} fetching={isFetching} />
          </div>

          {currentPathArtist && finalArtist && (
            <div className="artist-names">
              <p className="artist-name">{!isFetching && currentPathArtist.name}</p>
              <p className="artist-name">{!isFetching && finalArtist.name}</p>
            </div>
          )}
        </div>

        <TimerBar
          finalArtistId={finalArtist?.id}
          canStartTimer={!isFetching && !isError}
          onTimeout={() => setIsGameOver(true)}
          streak={streak}
          ref={timerBarRef}
        />

        {isError ? (
          <div className="error">
            <span>Something went wrong 🫢 This site is probably so popular that the servers have crashed.</span>
            <button className="back-btn btn-primary" onClick={() => navigate("/")} disabled={isLoading}>
              Back to Home
            </button>
          </div>
        ) : (
          <>
            <SearchAndResults currentPathArtist={currentPathArtist} onSelectArtist={handleSelectArtist} />
            <Streak streak={streak} />
            <button className="refresh-artists-btn btn-primary" onClick={handleSkip} disabled={isLoading}>
              Skip
              <i className="fa fa-forward" />
            </button>
          </>
        )}
      </div>

      {isGameOver && <GameOverModal onClickRestart={handleRestart} />}
    </StyledGame>
  );
}
