#!/usr/bin/env node

const [majorRaw, minorRaw] = process.versions.node.split(".");
const major = Number(majorRaw);
const minor = Number(minorRaw);

const isSupported =
  (major === 20 && minor >= 9) ||
  major === 21 ||
  major === 22 ||
  major === 23 ||
  major === 24;

if (!isSupported) {
  console.error(
    [
      `Unsupported Node.js version: ${process.versions.node}`,
      "This project requires Node.js >=20.9.0 and <25.",
      "Use `nvm use` (or install Node 22) and run the command again.",
    ].join("\n")
  );
  process.exit(1);
}
