/**
 * pi-extension-tui-safe-clear
 * 
 * Membersihkan terminal history/scrollback saat startup & /quit
 * TANPA mengganggu header TUI, skills, extensions, atau status bar pi-cli.
 * Cross-platform, zero-dependency, ESM, Node.js >=20.
 */
export default function tuiSafeClearExtension(pi) {
  const clearScrollback = (isShutdown = false) => {
    try {
      const isWin = process.platform === "win32";
      const isModern = isWin && (
        process.env.WT_SESSION ||
        process.env.TERM_PROGRAM === "vscode" ||
        process.env.TERM?.includes("xterm") ||
        process.env.ANSICON ||
        process.env.ConEmuANSI === "ON"
      );

      let seq;
      if (isShutdown) {
        // Shutdown: Clear layar + scrollback + reset state. 
        // \x1b[2J + \x1b[3J aman karena TUI sudah teardown di fase exit.
        seq = "\x1b[H\x1b[2J\x1b[3J\x1b[0J\x1b[0m\x1b[?25h";
      } else {
        // Startup: HANYA clear scrollback (\x1b[3J) + cursor home (\x1b[H)
        // TIDAK pakai \x1b[2J agar TUI header/status bar tidak ter-reset
        // sebelum pi sempat merender UI-nya.
        seq = "\x1b[3J\x1b[H";
      }

      // Fallback CMD/PowerShell lawas (tidak support \x1b[3J)
      if (isWin && !isModern) {
        const lines = process.stdout.rows || 50;
        seq = "\n".repeat(lines) + "\x1b[H\x1b[0m";
      }

      process.stdout.write(seq);
    } catch {
      // silent fail
    }
  };

  // 1️⃣ Clear scrollback saat startup (pertahankan TUI block)
  clearScrollback(false);

  // 2️⃣ Clear saat /quit
  let shouldClearOnQuit = false;
  pi.on("session_shutdown", (event) => {
    if (event?.reason === "quit") shouldClearOnQuit = true;
  });

  process.on("exit", () => {
    if (shouldClearOnQuit) clearScrollback(true);
  });
}