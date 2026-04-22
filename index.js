/**
 * pi-extension-tui-safe-clear
 * 
 * ✅ Fixes:
 * 1. Header/Welcome block TIDAK hilang saat /reload, /resume, atau run command
 * 2. Startup benar-benar bersih (visible screen + scrollback) sebelum TUI render
 * 
 * Cross-platform, zero-dependency, ESM, Node.js >=20.
 */
export default function tuiSafeClearExtension(pi) {
  // 🛡️ GUARD: Mencegah re-execution saat /reload atau hot-reload module
  if (globalThis.__PI_TUI_SAFE_CLEAR_INIT__) return;
  globalThis.__PI_TUI_SAFE_CLEAR_INIT__ = true;

  const clearTerminal = (mode) => {
    if (!process.stdout.isTTY) return; // Skip jika output di-pipe/redirect
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
      if (mode === "startup") {
        // Bersihkan layar VISIBLE + scrollback SEBELUM TUI mulai render
        // \x1b[H → Home cursor
        // \x1b[2J → Clear visible screen
        // \x1b[3J → Clear scrollback buffer
        // \x1b[0m\x1b[?25h → Reset warna & pastikan kursor muncul
        seq = "\x1b[H\x1b[2J\x1b[3J\x1b[0m\x1b[?25h";
      } else if (mode === "quit") {
        // Bersihkan total saat exit (dijalankan SETELAH TUI teardown)
        seq = "\x1b[H\x1b[2J\x1b[3J\x1b[0J\x1b[0m\x1b[?25h";
      }

      // Fallback CMD/PowerShell lawas (tidak support ANSI escape)
      if (isWin && !isModern) {
        const lines = process.stdout.rows || 50;
        seq = "\n".repeat(lines) + "\x1b[H\x1b[0m";
      }

      process.stdout.write(seq);
    } catch {
      // silent fail
    }
  };

  // 1️⃣ Clear saat startup (hanya jalan SEKALI berkat globalThis guard)
  clearTerminal("startup");

  // 2️⃣ Clear saat /quit
  let shouldClearOnQuit = false;
  pi.on("session_shutdown", (event) => {
    if (event?.reason === "quit") shouldClearOnQuit = true;
  });

  process.on("exit", () => {
    if (shouldClearOnQuit) clearTerminal("quit");
  });
}
