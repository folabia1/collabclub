import React from "react";
import { createContext, useReducer } from "react";

export const StoreContext = createContext(null);
export const StoreDispatchContext = createContext(null);

const initialStore = {
  isGameOver: false,
  streak: 0,
};

function storeReducer(store, action) {
  switch (action.type) {
    case "START_GAME": {
      return { ...store, isGameOver: false, streak: 0 };
    }
    case "GAME_OVER": {
      return { ...store, isGameOver: true };
    }
    default: {
      throw Error("Unknown action: " + action.type);
    }
  }
}

export function StoreProvider({ children }) {
  const [store, dispatch] = useReducer(storeReducer, initialStore);

  return (
    <StoreContext.Provider value={store}>
      <StoreDispatchContext.Provider value={dispatch}>{children}</StoreDispatchContext.Provider>
    </StoreContext.Provider>
  );
}
