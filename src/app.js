// ── DOM refs ──
const display      = document.getElementById('timer-display');
const timerLabel   = document.getElementById('timer-label');
const modeBadge    = document.getElementById('mode-badge');
const ringFill     = document.getElementById('ring-fill');
const btnStart     = document.getElementById('btn-start');
const btnPause     = document.getElementById('btn-pause');
const btnReset     = document.getElementById('btn-reset');
const focusInput   = document.getElementById('focus-input');
const breakInput   = document.getElementById('break-input');
const historyList  = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const sessionCount = document.getElementById('session-count');

// ── Ring math ──
// r="114" → circumference = 2 * π * 114 ≈ 716.283
const CIRCUMFERENCE = 2 * Math.PI * 114;
ringFill.style.strokeDasharray = CIRCUMFERENCE;

// ── State ──
let totalSeconds = 0;
let secondsLeft  = 0;
let isRunning    = false;
let isFocus      = true;
let intervalId   = null;

// ── Helpers ──
function getFocusSec() { return (parseInt(focusInput.value) || 25) * 60; }
function getBreakSec() { return (parseInt(breakInput.value) || 5)  * 60; }

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime(sec) {
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}

// ── CSS variable for current color ──
function setCurrentColor(color) {
  document.documentElement.style.setProperty('--current', color);
}

// ── Display update ──
function updateDisplay() {
  display.textContent = formatTime(secondsLeft);
}

function updateRing() {
  const ratio  = totalSeconds > 0 ? secondsLeft / totalSeconds : 1;
  const offset = CIRCUMFERENCE * (1 - ratio);
  ringFill.style.strokeDashoffset = offset;
}

function updateVisuals() {
  // Color & badge
  if (!isRunning && secondsLeft < totalSeconds && secondsLeft > 0) {
    // Paused mid-session
    modeBadge.className   = 'mode-badge paused';
    modeBadge.textContent = '● PAUSED';
    setCurrentColor('var(--pause)');
    timerLabel.textContent = 'paused';
    ringFill.classList.remove('running');
  } else if (isFocus) {
    modeBadge.className   = 'mode-badge focus';
    modeBadge.textContent = '● FOCUS';
    setCurrentColor('var(--focus)');
    timerLabel.textContent = 'until break';
    if (isRunning) ringFill.classList.add('running');
    else           ringFill.classList.remove('running');
  } else {
    modeBadge.className   = 'mode-badge break';
    modeBadge.textContent = '● BREAK';
    setCurrentColor('var(--break)');
    timerLabel.textContent = 'until focus';
    if (isRunning) ringFill.classList.add('running');
    else           ringFill.classList.remove('running');
  }

  // Button states
  btnStart.disabled = isRunning;
  btnPause.disabled = !isRunning;
  btnStart.textContent = (!isRunning && secondsLeft < totalSeconds && secondsLeft > 0)
    ? 'RESUME' : 'START';
}

// ── Init timer ──
function initTimer() {
  totalSeconds = isFocus ? getFocusSec() : getBreakSec();
  secondsLeft  = totalSeconds;
  updateDisplay();
  updateRing();
  updateVisuals();
}

// ── Tick ──
function tick() {
  if (secondsLeft <= 0) {
    clearInterval(intervalId);
    isRunning = false;
    ringFill.classList.remove('running');
    playDone();
    flashScreen();

    if (isFocus) {
      saveSession(parseInt(focusInput.value) || 25);
    }

    isFocus = !isFocus;
    initTimer();
    startTimer(); // auto-start next phase
    return;
  }
  secondsLeft--;
  updateDisplay();
  updateRing();
}

// ── Controls ──
function startTimer() {
  if (isRunning) return;
  isRunning  = true;
  intervalId = setInterval(tick, 1000);
  updateVisuals();
}

function pauseTimer() {
  if (!isRunning) return;
  clearInterval(intervalId);
  isRunning = false;
  updateVisuals();
}

function resetTimer() {
  clearInterval(intervalId);
  isRunning = false;
  isFocus   = true;
  initTimer();
}

// ── Sound (Web Audio API — no external files needed) ──
function playDone() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784]; // C, E, G — pleasant chord
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
      osc.start(start);
      osc.stop(start + 0.9);
    });
  } catch (e) {
    // AudioContext blocked — silent fallback
  }
}

// ── Screen flash on session end ──
function flashScreen() {
  document.body.classList.add('flash');
  setTimeout(() => document.body.classList.remove('flash'), 600);
}

// ── History (localStorage) ──
const STORAGE_KEY = 'pomodoro_v1';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // "2026-05-21"
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const { date, sessions } = JSON.parse(raw);
    if (date !== getTodayKey()) return []; // new day → clear
    return sessions || [];
  } catch { return []; }
}

function saveSession(durationMin) {
  const sessions = loadHistory();
  const now  = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  sessions.push({ duration: durationMin, time });
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    date: getTodayKey(),
    sessions
  }));
  renderHistory();
}

function renderHistory() {
  const sessions = loadHistory();
  historyList.innerHTML = '';
  sessionCount.textContent = sessions.length;

  if (sessions.length === 0) {
    historyEmpty.style.display = 'block';
    return;
  }
  historyEmpty.style.display = 'none';

  // Show newest first
  [...sessions].reverse().forEach(s => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="session-dur">✓ ${pad(s.duration)}:00 focus</span>
      <span class="session-time">${s.time}</span>
    `;
    historyList.appendChild(li);
  });
}

// ── Event listeners ──
btnStart.addEventListener('click', startTimer);
btnPause.addEventListener('click', pauseTimer);
btnReset.addEventListener('click', resetTimer);

focusInput.addEventListener('change', () => {
  if (!isRunning && isFocus) initTimer();
});
breakInput.addEventListener('change', () => {
  if (!isRunning && !isFocus) initTimer();
});

// Keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
    e.preventDefault();
    isRunning ? pauseTimer() : startTimer();
  }
  if (e.code === 'KeyR' && e.target.tagName !== 'INPUT') {
    resetTimer();
  }
});

// ── Boot ──
initTimer();
renderHistory();
