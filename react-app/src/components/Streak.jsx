import React from "react";
import styled from "styled-components";

const StyledStreak = styled.div``;

export default function Streak({ streak }) {
  return <StyledStreak>{streak} 🔥</StyledStreak>;
}
