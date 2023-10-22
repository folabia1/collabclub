import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";

const StyledTimerBar = styled.div`
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

export default function TimerBar({ onTimeout = () => {}, streak, startTimer = false }) {
  const [timeoutId, setTimeoutId] = useState(null);
  let timerBarRef = useRef(null);

  function resetTimer() {
    // reset timeout
    clearTimeout(timeoutId);
    setTimeoutId(setTimeout(onTimeout, 120000));
    // reset animation
    if (timerBarRef.current) timerBarRef.current.classList.remove("start");
    setTimeout(() => (timerBarRef.current ? timerBarRef.current.classList.add("start") : null), 100); // add tiny delay to ensure animation is triggered
  }

  useEffect(() => {
    if (startTimer) resetTimer();
  }, [startTimer]);

  useEffect(() => {
    if (streak > 0) resetTimer();
  }, [streak]);

  return <StyledTimerBar ref={timerBarRef} className={`timer-bar`} />;
}
