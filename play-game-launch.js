(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const button = $("playGameBtn"), modal = $("driveGameAccessModal"), input = $("driveGameAccessCode");
  if (!button || !modal || !input) return;
  const message = $("driveGameAccessMessage");
  function open() {
    let school = null;
    try { school = JSON.parse(sessionStorage.getItem("hpt_school_session") || "null"); } catch {}
    if (!school?.id || !school?.access_code) {
      message.textContent = "Please sign in with your school's access code first.";
      message.className = "driveGameAccessMessage bad";
    } else {
      message.textContent = `Ready for ${school.school_name || "your school"}.`;
      message.className = "driveGameAccessMessage";
    }
    input.value = "";
    modal.hidden = false;
    setTimeout(() => input.focus(), 40);
  }
  function close() { modal.hidden = true; }
  function unlock() {
    let school = null;
    try { school = JSON.parse(sessionStorage.getItem("hpt_school_session") || "null"); } catch {}
    if (!school?.id || !school?.access_code) {
      message.textContent = "School login is required before opening the game.";
      message.className = "driveGameAccessMessage bad";
      return;
    }
    if (input.value.trim() !== "1001") {
      message.textContent = "That game access code is incorrect. Please try again.";
      message.className = "driveGameAccessMessage bad";
      input.select();
      return;
    }
    try {
      sessionStorage.setItem("hpt_drive_game_authorized", "1");
      sessionStorage.setItem("hpt_drive_game_school_id", String(school.id));
    } catch {}
    close();
    window.location.href = "drive-yourself.html";
  }
  button.addEventListener("click", open);
  $("driveGameAccessSubmit")?.addEventListener("click", unlock);
  input.addEventListener("keydown", e => { if (e.key === "Enter") unlock(); if (e.key === "Escape") close(); });
  modal.querySelectorAll("[data-drive-game-close]").forEach(el => el.addEventListener("click", close));
})();
