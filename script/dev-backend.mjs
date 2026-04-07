import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const backendDir = path.join(rootDir, "backend");
const port = process.env.PYTHON_PORT || "8000";
const host = process.env.PYTHON_HOST || "127.0.0.1";

const pythonCandidates = [];
const customPython = process.env.PYTHON_EXECUTABLE || process.env.PYTHON;

if (customPython) {
  pythonCandidates.push({ command: customPython, args: [] });
}

const localVenvWindows = path.join(rootDir, ".venv", "Scripts", "python.exe");
const localVenvPosix = path.join(rootDir, ".venv", "bin", "python");

if (existsSync(localVenvWindows)) {
  pythonCandidates.push({ command: localVenvWindows, args: [] });
}

if (existsSync(localVenvPosix)) {
  pythonCandidates.push({ command: localVenvPosix, args: [] });
}

pythonCandidates.push({ command: "python", args: [] });
pythonCandidates.push({ command: "python3", args: [] });

if (process.platform === "win32") {
  pythonCandidates.push({ command: "py", args: ["-3"] });
}

function hasPython3(command, args) {
  const result = spawnSync(
    command,
    [...args, "-c", "import sys; raise SystemExit(0 if sys.version_info.major >= 3 else 1)"],
    { stdio: "ignore" },
  );

  return !result.error && result.status === 0;
}

const selectedPython = pythonCandidates.find(({ command, args }) => hasPython3(command, args));

if (!selectedPython) {
  console.error("Could not find a Python 3 interpreter. Set PYTHON_EXECUTABLE to the correct path and try again.");
  process.exit(1);
}

const backendProcess = spawn(
  selectedPython.command,
  [...selectedPython.args, "-m", "uvicorn", "main:app", "--reload", "--host", host, "--port", port, "--timeout-keep-alive", "300"],
  {
    cwd: backendDir,
    stdio: "inherit",
    env: process.env,
  },
);

const shutdown = () => {
  if (!backendProcess.killed) {
    backendProcess.kill();
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

backendProcess.on("exit", (code, signal) => {
  if (signal) {
    process.exit(1);
  }

  process.exit(code ?? 0);
});