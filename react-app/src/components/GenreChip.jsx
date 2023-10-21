import React from "react";
import styled from "styled-components";

const StyledGenreChip = styled.button`
  border-radius: 12px;
  padding: 0.2rem 0.6rem;
  white-space: nowrap;
  border: 1px var(--accent) solid;
  background-color: transparent;
  font-weight: 700;

  @media (prefers-color-scheme: dark) {
    color: var(--accent);
  }

  &:disabled {
    border-color: var(--disabled);
    background-color: transparent;
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

export default function GenreChip({ text, active, disabled }) {
  return (
    <StyledGenreChip className={`genre-chip${active ? " active" : ""}`} disabled={disabled}>
      {text}
    </StyledGenreChip>
  );
}
