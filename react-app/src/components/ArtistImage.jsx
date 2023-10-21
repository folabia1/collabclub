import React from "react";
import styled from "styled-components";

const StyledArtistImage = styled.img`
  width: 24vw;
  height: 24vw;
  border-radius: 8px;
  object-fit: cover;
  box-shadow: -4px 2px 7px rgba(0, 0, 0, 0.4);
`;

const ImageLoading = styled.div`
  width: 24vw;
  height: 24vw;
  position: relative;

  &::after {
    content: "";
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 8px;
    background-color: black;
    box-shadow: -4px 2px 7px rgba(0, 0, 0, 0.4);
    opacity: 0.2;

    animation-name: ghosty;
    animation-duration: 1.2s;
    animation-timing-function: ease-out;
    animation-iteration-count: infinite;
    animation-fill-mode: forwards;
  }

  @keyframes ghosty {
    from {
      transform: scale(100%);
      opacity: 0.2;
    }

    25% {
      transform: scale(93%);
      opacity: 0.23;
    }

    75% {
      transform: scale(103%);
      opacity: 0.19;
    }

    to {
      transform: scale(100%);
      opacity: 0.2;
    }
  }
`;

const ImageError = styled.div`
  width: 24vw;
  height: 24vw;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  background-color: black;
  box-shadow: -4px 2px 7px rgba(0, 0, 0, 0.4);
  opacity: 0.2;
`;

export default function ArtistImage({ photoUrl, name, error, fetching }) {
  return fetching ? (
    <ImageLoading />
  ) : error ? (
    <ImageError>
      <i className="fa fa-triangle-exclamation fa-2xl" />
    </ImageError>
  ) : (
    <StyledArtistImage className={fetching ? "loading" : ""} src={photoUrl} alt={name} />
  );
}
