# Stop script execution when a non-terminating error occurs
$ErrorActionPreference = "Stop"

# Windows code signing is driven by scripts/azure-sign.cjs (electron-builder `win.sign` callback),
# which prefers Azure Trusted Signing and falls back to the PFX cert. We provision both here so the
# fallback is live: Azure is the default path, PFX degrades only if the Azure env is unavailable.

Write-Host "--- :windows: Configure Azure Trusted Signing"
# Installs the Azure DLib + a modern signtool and exports SIGNTOOL_PATH, AZURE_CODE_SIGNING_DLIB,
# AZURE_METADATA_JSON (read by azure-sign.cjs). Runs a signing smoke test; fails here with
# diagnostics if the Azure credentials are wrong. Via the CI toolkit Buildkite plugin (>= 6.1.0).
& "setup_azure_trusted_signing.ps1"
If ($LastExitCode -ne 0) { Exit $LastExitCode }

Write-Host "--- :windows: Provision PFX fallback"
# Materializes certificate.pfx from AWS Secrets Manager. Via the CI toolkit Buildkite plugin.
& "setup_windows_code_signing.ps1"
If ($LastExitCode -ne 0) { Exit $LastExitCode }

# Read the PFX password from the process env, falling back to the machine-wide env.
$windowsCertPassword = [System.Environment]::GetEnvironmentVariable('WINDOWS_CODE_SIGNING_CERT_PASSWORD', [System.EnvironmentVariableTarget]::Process)
If ([string]::IsNullOrEmpty($windowsCertPassword)) {
    $windowsCertPassword = [System.Environment]::GetEnvironmentVariable('WINDOWS_CODE_SIGNING_CERT_PASSWORD', [System.EnvironmentVariableTarget]::Machine)
}
If ([string]::IsNullOrEmpty($windowsCertPassword)) {
    Write-Host "[!] WINDOWS_CODE_SIGNING_CERT_PASSWORD is not set in either process or machine environments."
    Exit 1
}

$certPath = (Convert-Path .\certificate.pfx)
If (-not (Test-Path $certPath)) {
    Write-Host "[!] Certificate file does not exist at given path $certPath."
    Exit 1
}

# azure-sign.cjs reads these from process.env for the file-based signtool PFX fallback.
$env:CSC_KEY_PASSWORD = $windowsCertPassword
$env:CSC_LINK = $certPath
Write-Host "PFX fallback ready: CSC_LINK set to $certPath"

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

Write-Host "--- :windows: Verify signatures"
# Authoritative on-agent check: every NSIS installer must carry a valid Authenticode signature.
# The Store AppX is intentionally unsigned (re-signed by the Store), so it is not verified here.
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
