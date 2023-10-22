import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";

const StyledGameOverModal = styled.div`
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background-color: rgba(0, 0, 0, 0.4);

  .game-over-modal {
    background-color: rgba(255, 255, 255, 0.8);
    z-index: 10;
    width: min(90%, 50rem);
    height: min(90%, 50rem);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
    padding: 3.2rem;
    border-radius: 8px;

    .buttons {
      display: flex;
      gap: 0.8rem;
    }
  }
`;

export default function GameOverModal({ onClickRestart }) {
  const naviagte = useNavigate();
  return (
    <StyledGameOverModal>
      <div className="game-over-modal">
        <h2 className="title">Game Over</h2>
        <div className="buttons">
          <button className="btn-secondary" onClick={() => naviagte("/")}>
            Go to Home
          </button>
          <button className="btn-secondary" onClick={onClickRestart}>
            Play Again
          </button>
        </div>
      </div>
    </StyledGameOverModal>
  );
}
