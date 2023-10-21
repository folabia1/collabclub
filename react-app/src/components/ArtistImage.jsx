import React from "react";
import styled from "styled-components";

const StyledArtistImage = styled.img`
  width: 24vw;
  height: 24vw;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: -4px 2px 7px rgba(0, 0, 0, 0.4);
`;

export default function ArtistImage({ photoUrl, name }) {
  return <StyledArtistImage src={photoUrl} alt={name} />;
}
