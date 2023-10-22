import React from "react";
import styled from "styled-components";

import { useColorTheme } from "../hooks/useColorTheme";

const StyledGenreChip = styled.button`
  border-radius: 18px;
  padding: 0.2rem 1.2rem;
  white-space: nowrap;
  border: 2px var(--accent) solid;
  background-color: rgba(0, 0, 0, 0.1);
  font-size: 1.8rem;
  font-weight: 700;
  text-align: center;
  color: var(--accent);
  &.light-mode {
    color: var(--text-color);
  }

  &:disabled {
    border-color: var(--disabled);
    background-color: transparent;
    cursor: not-allowed;
    color: var(--disabled);
    &.light-mode {
      color: var(--text-color);
    }
  }

  &.active {
    border-color: var(--accent);
    background-color: var(--accent);
    color: var(--background-primary);
    &.light-mode {
      color: var(--text-color);
    }
  }

  &:disabled.active {
    border-color: var(--disabled);
    background-color: var(--disabled);
  }
`;

export default function GenreChip({ text, active, onClick = () => {}, disabled }) {
  const [colorTheme] = useColorTheme();
  return (
    <StyledGenreChip className={`genre-chip${active ? " active" : ""} ${colorTheme}`} onClick={() => onClick(text)} disabled={disabled}>
      {text}
    </StyledGenreChip>
  );
}
