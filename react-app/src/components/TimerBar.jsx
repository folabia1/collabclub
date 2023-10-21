import React, { useEffect, useRef } from "react";
import styled from "styled-components";

const StyledTimerBar = styled.div`
  .timer-bar {
    background-color: var(--accent);
    width: 100%;
    padding-block: 0.4rem;
    border-radius: 12px;

    &.start {
      animation-name: countdown;
      animation-duration: 120s;
      animation-fill-mode: forwards;
      animation-delay: 0ms;
    }
  }

  @keyframes countdown {
    from {
      background-color: var(--accent);
      width: 100%;
    }
    50% {
      background-color: yellow;
    }
    95% {
      background-color: red;
    }
    to {
      width: 0px;
    }
  }
`;

export default function TimerBar({ streak }) {
  let timeoutId = useRef(null);
  let timerBarRef = useRef(null);

  useEffect(() => {
    timeoutId.value = setTimeout(() => store.setIsGameOver(true), 120000);
    if (timerBarRef.value) timerBarRef.value.classList.add("start");
    return () => clearTimeout(timeoutId.value);
  }, []);

  useEffect(
    (currentStreak, prevStreak) => {
      // when user gets a full path, reset the timer
      if (currentStreak > prevStreak) {
        // reset timeout
        clearTimeout(timeoutId.value);
        timeoutId.value = setTimeout(() => store.setIsGameOver(true), 120000);
        // reset animation
        if (timerBarRef.value) timerBarRef.value.classList.remove("start");
        setTimeout(() => (timerBarRef.value ? timerBarRef.value.classList.add("start") : null), 100); // add tiny delay to ensure animation is triggered
      }
    },
    [streak]
  );

  return <StyledTimerBar ref={timerBarRef} className="timer-bar" />;
}
