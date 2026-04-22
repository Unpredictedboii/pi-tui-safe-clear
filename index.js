/**
 * pi-extension-tui-safe-clear
 *
 * ✅ Fixes:
 * 1. /quit tetap bersih meski setelah /reload atau /resume
 * 2. Header TUI tidak hilang saat command/reload
 * 3. Startup benar-benar bersih (visible + scrollback)
 *
 * Menggunakan process-level state tracking agar survive hot-reload.
 */
export default function tuiSafeClearExtension(pi) {
  if (!process.stdout.isTTY) return; // Skip jika output di-pipe

  const getClearSeq = (mode) => {
    const isWin = process.platform === "win32";
    const isModern = isWin && (
      process.env.WT_SESSION ||
      process.env.TERM_PROGRAM === "vscode" ||
      process.env.TERM?.includes("xterm") ||
      process.env.ANSICON ||
      process.env.ConEmuANSI === "ON"
    );

    if (isWin && !isModern) {
      return "\n".repeat(process.stdout.rows || 30) + "\x1b[H\x1b[0m";
    }
    return mode === "startup"
      ? "\x1b[H\x1b[2J\x1b[3J\x1b[0m\x1b[?25h"
      : "\x1b[H\x1b[2J\x1b[3J\x1b[0J\x1b[0m\x1b[?25h";
  };

  // 1️⃣ RE-BIND listener ke session context TERBARU (bertahan setelah /reload)
  pi.on("session_shutdown", (event) => {
    if (event?.reason === "quit") process.__PI_CLEAR_SHOULD_QUIT__ = true;
  });

  // 2️⃣ Hook process.exit HANYA SEKALI per proses Node.js
  if (!process.__PI_CLEAR_EXIT_HOOKED__) {
    process.__PI_CLEAR_EXIT_HOOKED__ = true;
    process.__PI_CLEAR_SHOULD_QUIT__ = false;

    process.on("exit", () => {
      if (process.__PI_CLEAR_SHOULD_QUIT__) {
        try { process.stdout.write(getClearSeq("quit")); } catch {}
      }
    });
  }

  // 3️⃣ Clear startup HANYA SEKALI (true first launch, bukan /reload)
  if (!process.__PI_CLEAR_STARTUP_DONE__) {
    process.__PI_CLEAR_STARTUP_DONE__ = true;
    try { process.stdout.write(getClearSeq("startup")); } catch {}
  }
}
