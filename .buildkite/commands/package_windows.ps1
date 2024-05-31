# Stop script execution when a non-terminating error occurs
$ErrorActionPreference = "Stop"

& "prepare_windows_host_for_node.ps1"


Write-Host "--- :npm: Installing dependencies"
npm ci --legacy-peer-deps

Write-Host "--- :node: Building app"
make build

Write-Host "--- :windows: Packaging for Windows"
make package-windows SKIP_BUILD=true

If ($LastExitCode -ne 0) { Exit $LastExitCode }
