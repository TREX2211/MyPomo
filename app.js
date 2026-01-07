emailjs.init("qQbkK3EWdP3-ZvoSl");

/* ======================
   SONIDO
====================== */
let audioUnlocked = false;

function unlockAudioContext() {
  if (audioUnlocked) return;

  const sound = new Audio("toggle.mp3.wav");
  sound.volume = 0;
  sound.play()
    .then(() => {
      sound.pause();
      audioUnlocked = true;
    })
    .catch(() => {});
}

function playToggleSound() {
  if (!audioUnlocked) return;

  const sound = new Audio("toggle.mp3.wav");
  sound.volume = 0.4;
  sound.play().catch(() => {});
}

const bellSound = new Audio("bell.mp3");
bellSound.preload = "auto";
bellSound.volume = 0.5;

const sendSound = new Audio("whoosh.mp3");
sendSound.preload = "auto";
sendSound.volume = 0.4; 

/* ======================
   VARIABLES TIMER
====================== */
let workTime = 25 * 60;
let breakTime = 5 * 60;
let timeLeft = workTime;
let timer = null;
let isWork = true;
let currentModeLabel = "";
let wakeLock = null;
let hasStarted = false;

/* ======================
   ELEMENTOS DOM
====================== */
const timerDisplay = document.getElementById("timer");
const modeDisplay = document.getElementById("mode");
const toggleBtn = document.getElementById("toggle-timer");
const resetBtn = document.getElementById("reset-timer");
const darkToggle = document.getElementById("dark-toggle");

const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const modalApply = document.getElementById("modal-apply");
const modalCancel = document.getElementById("modal-cancel");
const workInput = document.getElementById("work-minutes");
const breakInput = document.getElementById("break-minutes");

/* ======================
   CONTROLES + / − (MODAL)
====================== */
document.querySelectorAll(".number-control button").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    let value = Number(input.value);

    if (btn.classList.contains("plus")) {
      value++;
    } else {
      value = Math.max(1, value - 1);
    }

    input.value = value;
  });
});

/* ======================
   FUNCIONES TIMER
====================== */
function updateTimer() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  timerDisplay.textContent =
    `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
 updatePageTitle();
}

function updatePageTitle() {
  if (timer || timeLeft !== workTime) {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const formatted =
      `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;

    document.title = `${formatted} – MyPomo`;
  } else {
    document.title = "MyPomo";
  }
}

function startTimer() {
  if (timer) return;

  enableWakeLock();

  timer = setInterval(() => {
    timeLeft--;

    if (!hasStarted) {
      hasStarted = true;
    }

    if (timeLeft <= 0) {
  clearInterval(timer);
  timer = null;
  updateToggleButton(); // 👈 pequeño detalle UX

  // 🔢 Forzar visual 00:00
  timeLeft = 0;
  updateTimer();

  // 🔔 Campana
  playBellSound();

  // 🔔 Notificación
  if (isWork) {
    document.title = "¡Descanso! – MyPomo";
    showNotification("¡Descanso! ☕", "Buen trabajo. Tómate un respiro.");
  } else {
    showNotification("¡A trabajar! 🍅", "El descanso terminó. Volvemos al foco.");
  }

  // ⏳ Esperar un momento en 00:00
  setTimeout(() => {
    isWork = !isWork;
    timeLeft = isWork ? workTime : breakTime;

    setModeText(isWork ? `Modo: ${currentModeLabel}` : "☕ Descanso");

    startTimer();
  }, 1000); // 1 segundo visible en 00:00

  return;
}

    updateTimer();
  }, 1000);

  updateToggleButton();
}

function pauseTimer() {
  clearInterval(timer);
  timer = null;
  disableWakeLock();
  updateToggleButton();
}

function resetTimer() {
  pauseTimer();
  isWork = true;
  timeLeft = workTime;
  hasStarted = false; // 🔁 volver a estado inicial
  setModeText(`Modo: ${currentModeLabel}`);
  updateTimer();
  updateToggleButton();
  document.title = "MyPomo";
}

function updateToggleButton() {
  const playIcon = document.getElementById("play-icon");
  const pauseIcon = document.getElementById("pause-icon");

  if (timer) {
    playIcon.style.display = "none";
    pauseIcon.style.display = "block";
    toggleBtn.classList.add("running");
    toggleBtn.setAttribute("aria-label", "Pausar temporizador");
  } else {
    playIcon.style.display = "block";
    pauseIcon.style.display = "none";
    toggleBtn.classList.remove("running");
    toggleBtn.setAttribute("aria-label", "Iniciar temporizador");
  }

  // 🔓 Reset habilitado si ya se inició alguna vez
  resetBtn.disabled = !hasStarted;

  toggleBtn.classList.add("animate");
  setTimeout(() => toggleBtn.classList.remove("animate"), 150);
}

function setModeText(text) {
  modeDisplay.classList.add("animate");
  setTimeout(() => {
    modeDisplay.textContent = text;
    modeDisplay.classList.remove("animate");
  }, 300);
}

function applyCustomTime(minutes) {
  pauseTimer();

  workTime = minutes * 60;
  timeLeft = workTime;
  isWork = true;
  hasStarted = false;

  currentModeLabel = "Personalizado 🎯";
  setModeText("Modo: Personalizado 🎯");

  updateTimer();
  updateToggleButton();

  // 🔑 estado
  localStorage.setItem("workMinutes", minutes);
  localStorage.removeItem("preset");
}

function applyPreset(workMinutes, breakMinutes, label) {
  pauseTimer();

  workTime = workMinutes * 60;
  breakTime = breakMinutes * 60;
  timeLeft = workTime;
  isWork = true;
  hasStarted = false;

  currentModeLabel = label;
  setModeText(`Modo: ${label}`);

  updateTimer();
  updateToggleButton();

  // 🔑 estado
  localStorage.setItem(
    "preset",
    JSON.stringify({ work: workMinutes, break: breakMinutes, label })
  );
  localStorage.removeItem("workMinutes");
}


function showNotification(title, body) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

function requestNotificationPermission() {
  if (!("Notification" in window)) return;

  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function closeSettingsModal() {
  settingsModal.classList.add("hidden");
  document.body.classList.remove("modal-open");

  // quitar foco de inputs reales
  workInput.blur();
  breakInput.blur();

  document.body.focus();
}

function playBellSound() {
  bellSound.currentTime = 0;
  bellSound.play().catch(() => {});
}

function playSendSound() {
  sendSound.currentTime = 0;
  sendSound.play().catch(() => {});
}

function sendFeedback(message) {
  return emailjs.send("service_8z66lcz", "template_youzqkj", {
    message
  });
}

/* ======================
   WAKE LOCK
====================== */
async function enableWakeLock() {
  try {
    if ("wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch {}
}

function disableWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

/* ======================
   EVENTOS BOTONES
====================== */
toggleBtn.addEventListener("click", () => {
  requestNotificationPermission();
  timer ? pauseTimer() : startTimer();
});

resetBtn.addEventListener("click", () => {
  if (!hasStarted) return; // 🔑 MISMA LÓGICA QUE EL ATAJO

  resetBtn.classList.add("spin-once");
  resetTimer();

  setTimeout(() => {
    resetBtn.classList.remove("spin-once");
  }, 600);
});

/* ======================
   PRESETS
====================== */
document.querySelectorAll(".preset-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    applyPreset(
      Number(btn.dataset.work),
      Number(btn.dataset.break),
      btn.textContent
    );
  });
});

/* ======================
   MODAL ⚙️
====================== */
settingsBtn.addEventListener("click", () => {

  // 1️⃣ Pasar los valores actuales al modal
  workInput.value = Math.floor(workTime / 60);
  breakInput.value = Math.floor(breakTime / 60);

  // 2️⃣ Mostrar el modal
  settingsModal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  // 3️⃣ Foco al primer input
  workInput.focus();
});

modalCancel.addEventListener("click", closeSettingsModal);

modalApply.addEventListener("click", () => {

  // 1️⃣ Leer valores del modal
  const workMinutes = Number(workInput.value);
  const breakMinutes = Number(breakInput.value);

  // 2️⃣ Validar valores
  if (!workMinutes || workMinutes <= 0 || !breakMinutes || breakMinutes <= 0) {
    alert("Introduce valores válidos");
    return;
  }

  // 3️⃣ Parar temporizador
  pauseTimer();

  // 4️⃣ Aplicar tiempos personalizados
  workTime = workMinutes * 60;
  breakTime = breakMinutes * 60;
  timeLeft = workTime;
  isWork = true;
  hasStarted = false;

  // 5️⃣ Etiqueta visual
  currentModeLabel = "Personalizado 🎯";
  setModeText("Modo: Personalizado 🎯");

  // 6️⃣ Actualizar UI
  updateTimer();
  updateToggleButton();

  // 7️⃣ Guardar configuración
  localStorage.setItem("workMinutes", workMinutes);
  localStorage.setItem("breakMinutes", breakMinutes);
  localStorage.removeItem("preset");

  // 8️⃣ Cerrar modal
  closeSettingsModal();
});

/* ======================
   SPINNERS INTERNOS ▲ ▼
====================== */
document.querySelectorAll(".input-wrapper").forEach(wrapper => {
  const input = wrapper.querySelector("input");
  const up = wrapper.querySelector(".spin-up");
  const down = wrapper.querySelector(".spin-down");

  let interval = null;
  let speed = 180;

  function startChanging(delta) {
    if (interval) return;

    input.value = Math.max(1, Number(input.value || 1) + delta);

    interval = setInterval(() => {
      input.value = Math.max(1, Number(input.value || 1) + delta);

      // acelera progresivamente
      if (speed > 30) {
        speed -= 30;
        clearInterval(interval);
        interval = setInterval(() => {
          input.value = Math.max(1, Number(input.value || 1) + delta);
        }, speed);
      }
    }, speed);
  }

  function stopChanging() {
    clearInterval(interval);
    interval = null;
    speed = 180;
  }

  // SUBIR
  up.addEventListener("mousedown", () => startChanging(1));
  up.addEventListener("mouseup", stopChanging);
  up.addEventListener("mouseleave", stopChanging);

  // BAJAR
  down.addEventListener("mousedown", () => startChanging(-1));
  down.addEventListener("mouseup", stopChanging);
  down.addEventListener("mouseleave", stopChanging);

  // Mobile
  up.addEventListener("touchstart", e => {
    e.preventDefault();
    startChanging(1);
  });

  down.addEventListener("touchstart", e => {
    e.preventDefault();
    startChanging(-1);
  });

  document.addEventListener("touchend", stopChanging);
});

/* ======================
   MODAL FEEDBACK 💬
====================== */
const feedbackBtn = document.getElementById("feedback-btn");
const feedbackModal = document.getElementById("feedback-modal");
const feedbackCancel = document.getElementById("feedback-cancel");
const feedbackSend = document.getElementById("feedback-send");
const feedbackText = document.getElementById("feedback-text");

feedbackBtn.addEventListener("click", () => {
  feedbackModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  feedbackText.focus();
});

feedbackCancel.addEventListener("click", closeFeedbackModal);

function closeFeedbackModal() {
  feedbackModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
  feedbackText.blur();
  document.body.focus();
}

feedbackSend.addEventListener("click", () => {
  const message = feedbackText.value.trim();

  if (!message) {
    alert("Escribe algún comentario antes de enviar");
    return;
  }

  feedbackSend.disabled = true;
  feedbackSend.textContent = "Enviando...";

 sendFeedback(message)
  .then(() => {
  
  // activar animación
  feedbackModal.classList.add("sending");
  playSendSound();
  launchConfetti();

  // limpiar texto
  feedbackText.value = "";

  // cerrar tras animación
  setTimeout(() => {
    feedbackModal.classList.remove("sending");
    closeFeedbackModal();
    alert("¡Gracias por tu ayuda! 🙌");
  }, 500); // mismo tiempo que la animación
  })

    .catch((err) => {
      console.error("Error EmailJS:", err);
      alert("Hubo un error al enviar. Inténtalo de nuevo.");
    })
    .finally(() => {
      feedbackSend.disabled = false;
      feedbackSend.textContent = "Enviar";
    });
});

feedbackText.addEventListener("keydown", (e) => {
  // Enter sin Shift → enviar
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    const message = feedbackText.value.trim();

    // ⛔ No enviar si está vacío
    if (!message) return;

    // Reutiliza el botón Enviar
    feedbackSend.click();
  }
});

[workInput, breakInput].forEach(input => {
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      modalApply.click();
    }
  });
});

async function launchConfetti() {
  confetti({
    particleCount: 40,
    spread: 60,
    origin: { y: 0.6 },
    scalar: 0.8
  });
}

/* ======================
   ATAJOS TECLADO
====================== */
window.addEventListener("keydown", (e) => {

  // ESC → cerrar modal (prioridad máxima)
  if (e.key === "Escape" && !settingsModal.classList.contains("hidden")) {
    closeSettingsModal();
    return;
  }

  // 🔒 Bloquear TODOS los atajos si el modal está abierto
  if (document.body.classList.contains("modal-open")) return;

  // ESPACIO → Play / Pause
  if (e.code === "Space") {
    e.preventDefault();
    timer ? pauseTimer() : startTimer();
    return;
  }

  // R → Reset
  if (e.key.toLowerCase() === "r") {
    resetTimer();
    return;
  }

  // 1 / 2 / 3 → Presets
  switch (e.key) {
    case "1":
      applyPreset(25, 5, "🍅 Pomodoro");
      break;

    case "2":
      applyPreset(50, 10, "🔥 Intenso");
      break;

    case "3":
      applyPreset(40, 8, "📚 Estudio");
      break;
  }
});


/* ======================
   MODO OSCURO
====================== */
if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark");
  darkToggle.textContent = "☀️";
}

darkToggle.addEventListener("click", () => {
  playToggleSound();

  document.body.classList.toggle("dark");

  const enabled = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", enabled ? "enabled" : "disabled");
  darkToggle.textContent = enabled ? "☀️" : "🌙";
});

/* ======================
   INIT
====================== */
/* ======================
   INIT
====================== */
document.title = "MyPomo";

// Modo oscuro al cargar
if (localStorage.getItem("darkMode") === "enabled") {
  document.body.classList.add("dark");
  darkToggle.textContent = "☀️";
}

// Restaurar estado del timer
const savedMinutes = localStorage.getItem("workMinutes");
const savedBreak = localStorage.getItem("breakMinutes");
const savedPreset = localStorage.getItem("preset");

if (savedMinutes && savedBreak) {
  const w = Number(savedMinutes);
  const b = Number(savedBreak);

  if (w === 25 && b === 5) {
    applyPreset(25, 5, "🍅 Pomodoro");
  } else {
    workTime = w * 60;
    breakTime = b * 60;
    timeLeft = workTime;
    isWork = true;
    hasStarted = false;

    currentModeLabel = "Personalizado 🎯";
    setModeText("Modo: Personalizado 🎯");

    updateTimer();
    updateToggleButton();
  }

} else if (savedPreset) {
  const { work, break: rest, label } = JSON.parse(savedPreset);
  applyPreset(work, rest, label);

} else {
  // Usuario nuevo → Pomodoro
  applyPreset(25, 5, "🍅 Pomodoro");
}

// Accesibilidad
document.body.tabIndex = -1;

/* ======================
   DESBLOQUEO AUDIO (Safari)
====================== */
window.addEventListener("pointerdown", unlockAudioContext, { once: true });;
