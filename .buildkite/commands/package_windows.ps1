# Stop script execution when a non-terminating error occurs
$ErrorActionPreference = "Stop"

Write-Host "--- :windows: Configure Azure Artifact Signing"
# From the CI toolkit; fails here with diagnostics if Azure credentials are wrong.
& "setup_azure_trusted_signing.ps1"
If ($LastExitCode -ne 0) { Exit $LastExitCode }

Write-Host "--- :windows: Installing make"
choco install make

bash ".\.buildkite\commands\install_node_dependencies.sh"
If ($LastExitCode -ne 0) { Exit $LastExitCode }

Write-Host "--- :lock_with_ink_pen: Decrypting secrets"
make decrypt_conf

Write-Host "--- :node: Building app"
make build

Write-Host "--- :windows: Packaging for Windows"
make package-win32 SKIP_BUILD=true
If ($LastExitCode -ne 0) { Exit $LastExitCode }

Write-Host "--- :windows: Verify Azure signatures"
# Every NSIS installer must carry a valid Authenticode signature. The Store AppX is intentionally
# unsigned (re-signed by the Store), so it is not verified here.
$exes = Get-ChildItem release\*.exe
If ($exes.Count -eq 0) {
    Write-Host "[!] No release\*.exe found to verify."
    Exit 1
}
ForEach ($exe in $exes) {
    & $env:SIGNTOOL_PATH verify /pa /v $exe.FullName
    If ($LastExitCode -ne 0) {
        Write-Host "[!] Signature verification failed for $($exe.FullName)"
        Exit $LastExitCode
    }
}
Write-Host "All Windows installers verified signed."
