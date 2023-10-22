import React, { forwardRef, useEffect, useState } from "react";
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

export default forwardRef(function TimerBar({ onTimeout = () => {} }, ref) {
  const [timeoutId, setTimeoutId] = useState(null);

  function resetTimer() {
    // reset timeout
    clearTimeout(timeoutId);
    setTimeoutId(setTimeout(onTimeout, 120000));
    // reset animation
    if (ref.current) ref.current.classList.remove("start");
    setTimeout(() => (ref.current ? ref.current.classList.add("start") : null), 100); // add tiny delay to ensure animation is triggered
  }

  useEffect(() => {
    ref.current.addEventListener("start-timer", resetTimer);
    return () => ref.current.removeEventListener("start-timer", resetTimer);
  }, []);

  return <StyledTimerBar ref={ref} className={`timer-bar`} />;
});
