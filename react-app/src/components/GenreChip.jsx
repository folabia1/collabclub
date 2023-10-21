import React from "react";
import styled from "styled-components";

const StyledGenreChip = styled.button`
  border-radius: 18px;
  padding: 0.2rem 1.2rem;
  white-space: nowrap;
  border: 2px var(--accent) solid;
  background-color: rgba(0, 0, 0, 0.1);
  font-size: 1.8rem;
  font-weight: 700;
  text-align: center;

  @media (prefers-color-scheme: dark) {
    color: var(--accent);
  }

  &:disabled {
    border-color: var(--disabled);
    background-color: transparent;
    cursor: not-allowed;
    @media (prefers-color-scheme: dark) {
      color: var(--disabled);
    }
  }

  &.active {
    border-color: var(--accent);
    background-color: var(--accent);
    @media (prefers-color-scheme: dark) {
      color: var(--background-primary);
    }
  }

  &:disabled.active {
    border-color: var(--disabled);
    background-color: var(--disabled);
  }
`;

export default function GenreChip({ text, active, onClick, disabled }) {
  return (
    <StyledGenreChip className={`genre-chip${active ? " active" : ""}`} onClick={() => onClick(text)} disabled={disabled}>
      {text}
    </StyledGenreChip>
  );
}
