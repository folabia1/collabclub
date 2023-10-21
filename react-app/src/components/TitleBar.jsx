import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";

const StyledTitleBar = styled.div`
  display: flex;
  justify-content: space-between;
  position: relative;
  align-items: center;
  padding-block: 0.8rem;

  .menu-button,
  .spacer {
    flex: 0 0 6rem;
  }

  .menu-button {
    display: flex;
    justify-content: flex-start;
    padding-left: 2rem;
    align-items: center;
    gap: 0.4rem;
    font-size: 1.2rem;
    span {
      margin-bottom: 1px;
    }
  }

  .title {
    flex-grow: 1;
    text-align: center;
  }

  .shadow {
    position: absolute;
    width: 100%;
    height: 10px;
    bottom: -10px;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.2), transparent);
  }
`;

export default function TitleBar() {
  // const location = useLocation();
  const navigate = useNavigate();
  // console.log(`🚀 ~ location.pathname:`, location.pathname);

  return (
    <StyledTitleBar>
      {location.pathname === "play" ? (
        <button onClick={() => navigate("/")} className="menu-button btn-primary">
          <i className="fa fa-chevron-left fa-sm" />
          <span>Back</span>
        </button>
      ) : (
        <div className="spacer" />
      )}
      <h1 className="title" onClick={() => navigate("/")}>
        Collab Club
      </h1>
      <div className="spacer" />
      <div className="shadow" />
    </StyledTitleBar>
  );
}
