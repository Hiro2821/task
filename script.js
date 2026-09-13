(() => {
  'use strict';

  const inputScreen = document.getElementById('inputScreen');
  const displayScreen = document.getElementById('displayScreen');
  const messageInput = document.getElementById('messageInput');
  const errorMessage = document.getElementById('errorMessage');
  const showButton = document.getElementById('showButton');
  const resetButton = document.getElementById('resetButton');
  const stage = document.querySelector('.stage');
  const displayText = document.getElementById('displayText');

  const MIN_FONT_PX = 14;
  const MAX_FONT_PX = 400;
  const TEXTAREA_MAX_PX = window.innerHeight * 0.4;

  function autoGrowTextarea() {
    messageInput.style.height = 'auto';
    const next = Math.min(messageInput.scrollHeight, TEXTAREA_MAX_PX);
    messageInput.style.height = next + 'px';
  }

  function fitDisplayText() {
    const text = displayText.textContent;
    if (!text) return;

    const stageStyles = getComputedStyle(stage);
    const padX =
      parseFloat(stageStyles.paddingLeft) + parseFloat(stageStyles.paddingRight);
    const padY =
      parseFloat(stageStyles.paddingTop) + parseFloat(stageStyles.paddingBottom);

    const boxWidth = Math.max(40, stage.clientWidth - padX);
    const boxHeight = Math.max(40, stage.clientHeight - padY);

    // Fix the measuring width so wrapping is evaluated against the real box;
    // height then tells us whether the current font size overflows.
    displayText.style.width = boxWidth + 'px';

    let lo = MIN_FONT_PX;
    let hi = MAX_FONT_PX;
    let best = lo;

    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      displayText.style.fontSize = mid + 'px';

      const fitsWidth = displayText.scrollWidth <= boxWidth + 0.5;
      const fitsHeight = displayText.scrollHeight <= boxHeight + 0.5;

      if (fitsWidth && fitsHeight) {
        best = mid;
        lo = mid;
      } else {
        hi = mid;
      }
    }

    displayText.style.fontSize = best + 'px';
  }

  function showDisplay() {
    const value = messageInput.value;

    if (value.trim() === '') {
      errorMessage.hidden = false;
      messageInput.focus();
      return;
    }

    errorMessage.hidden = true;
    displayText.textContent = value;

    inputScreen.hidden = true;
    displayScreen.hidden = false;

    requestAnimationFrame(fitDisplayText);
  }

  function showInput() {
    displayScreen.hidden = true;
    inputScreen.hidden = false;

    requestAnimationFrame(() => {
      autoGrowTextarea();
      messageInput.focus();
      const len = messageInput.value.length;
      messageInput.setSelectionRange(len, len);
    });
  }

  showButton.addEventListener('click', showDisplay);
  resetButton.addEventListener('click', showInput);

  messageInput.addEventListener('input', () => {
    if (!errorMessage.hidden) errorMessage.hidden = true;
    autoGrowTextarea();
  });

  // Enter submits; Shift+Enter inserts a line break (preserved on display).
  messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      showDisplay();
    }
  });

  let resizeTimer = null;
  function handleViewportChange() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!displayScreen.hidden) fitDisplayText();
    }, 120);
  }

  window.addEventListener('resize', handleViewportChange);
  window.addEventListener('orientationchange', handleViewportChange);

  autoGrowTextarea();
})();
