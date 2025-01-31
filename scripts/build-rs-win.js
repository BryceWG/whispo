import { execSync } from "child_process"
import path from "path"
import fs from "fs"

const rustProjectPath = path.join(process.cwd(), "whispo-rs")
const targetPath = path.join(process.cwd(), "resources", "bin")

// Ensure target directory exists
fs.mkdirSync(targetPath, { recursive: true })

// Build the Rust project
console.log("Building Rust project...")
execSync("cargo build --release", {
  cwd: rustProjectPath,
  stdio: "inherit",
})

// Copy the built binary
const binarySource = path.join(rustProjectPath, "target", "release", "whispo-rs.exe")
const binaryTarget = path.join(targetPath, "whispo-rs.exe")

console.log("Copying binary...")
fs.copyFileSync(binarySource, binaryTarget)
console.log("Done!") 