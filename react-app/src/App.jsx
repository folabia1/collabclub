import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import styled from "styled-components";

import Game from "./components/Game";
import Home from "./components/Home";
import TitleBar from "./components/TitleBar";

const StyledApp = styled.div``;

const queryClient = new QueryClient();

export default function App() {
  const availableGenres = ["afrobeat", "hip-hop", "house", "latino", "r-n-b", "rock"];

  return (
    <QueryClientProvider client={queryClient}>
      <StyledApp>
        <div></div>
        <Router>
          <TitleBar />
          <Routes>
            <Route path="/" element={<Home availableGenres={availableGenres} />} />
            <Route path="/play" element={<Game availableGenres={availableGenres} />} />
          </Routes>
        </Router>
      </StyledApp>
    </QueryClientProvider>
  );
}
