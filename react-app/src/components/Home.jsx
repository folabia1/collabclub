import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

import GenreChip from "./GenreChip.jsx";

const StyledHome = styled.div`
  padding: 4rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 4rem;
  height: 100%;
  max-width: 40rem;
  margin: 0 auto;

  @media (min-width: 720px) {
    max-width: 80rem;
    justify-content: flex-start;
  }

  .genre-chips-container {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    flex-grow: 1;
    @media (min-width: 720px) {
      flex-grow: 0;
      height: auto;
    }

    p {
      font-weight: 500;
    }
  }

  .genre-chips {
    display: grid;
    gap: 0.8rem;
    grid-template-columns: 1fr 1fr 1fr;

    @media (max-width: 380px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .game-modes {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    align-items: center;
    @media (min-width: 720px) {
      flex-direction: row;
    }

    .card {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: space-between;
      gap: 0.8rem;
      border-radius: 4px;
      padding: 1.6rem;
      flex: 1;
      height: 100%;

      &.time-challenge {
        background-color: var(--secondary);
        color: #242625;
      }

      &.multiplayer {
        background-color: var(--text-primary);
        color: var(--background-primary);
      }

      .card-text {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .card__title {
        font-size: 1.8rem;
        font-weight: 700;
        line-height: 1;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }

      p {
        font-size: 1.2rem;
        line-height: 1.4rem;
      }

      button {
        font-size: 1.4rem;
        font-weight: 500;
        &:disabled {
          cursor: not-allowed;
        }
      }
    }
  }
`;

export default function Home({ availableGenres }) {
  const navigate = useNavigate();
  const [selectedGenres, setSelectedGenres] = useState([]);

  function toggleGenreSelected(genre) {
    setSelectedGenres((prevSelectedGenres) => {
      if (prevSelectedGenres.includes(genre)) return prevSelectedGenres.filter((selectedGenre) => selectedGenre !== genre);
      else return [...prevSelectedGenres, genre];
    });
  }

  function handleStartGame() {
    const urlSearchParams = selectedGenres.length > 0 ? `?genre=${selectedGenres.join(",")}` : "";
    navigate(`/play${urlSearchParams}`);
  }

  return (
    <StyledHome>
      <div className="genre-chips-container">
        <div className="genre-chips">
          {availableGenres.map((genre) => (
            <GenreChip key={genre} text={genre} active={selectedGenres.includes(genre)} onClick={toggleGenreSelected} disabled={false} />
          ))}
        </div>
      </div>

      <div className="game-modes">
        <div className="card time-challenge">
          <div className="card-text">
            <div className="card__title">
              <i className="fa fa-clock" />
              <h2 className="card__title-text">Time Challenge</h2>
            </div>
            <p>
              Race against the clock in this fun time challenge! See how well you know artist features - you'll be given two artists and you
              need to construct a path between them using features!
            </p>
          </div>
          <button className="btn-primary" onClick={handleStartGame}>
            Play
          </button>
        </div>
      </div>
    </StyledHome>
  );
}
