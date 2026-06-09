# Stop script execution when a non-terminating error occurs
$ErrorActionPreference = "Stop"

# Windows code signing defaults to the PFX cert. Setting USE_AZURE_TRUSTED_SIGNING switches the NSIS
# exe to Azure Trusted Signing (via the win.sign callback wired in by `make package-win32`); the PFX
# is still provisioned so it stays available as a fallback. See AINFRA-2472 for the auto-update
# publisher-name handover that gates a full cutover.
$useAzure = -not [string]::IsNullOrEmpty($env:USE_AZURE_TRUSTED_SIGNING)

If ($useAzure) {
    Write-Host "--- :windows: Configure Azure Trusted Signing"
    # Installs the Azure DLib + a modern signtool and exports SIGNTOOL_PATH, AZURE_CODE_SIGNING_DLIB,
    # AZURE_METADATA_JSON (read by azure-sign.cjs). Runs a signing smoke test that fails here, with
    # diagnostics, if the Azure credentials are wrong. Via the CI toolkit plugin (>= 6.1.0).
    & "setup_azure_trusted_signing.ps1"
    If ($LastExitCode -ne 0) { Exit $LastExitCode }
}

Write-Host "--- :windows: Configure Windows code signing"
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

# Import the cert so electron-builder's certificateSubjectName lookup finds it (the PFX default
# path signs the NSIS exe from the store).
# See https://buildkite.com/automattic/simplenote-electron/builds/71#01900b28-9508-4bfe-bc80-63464afeaa3e/292-567
Import-PfxCertificate -FilePath $certPath -CertStoreLocation Cert:\LocalMachine\Root -Password (ConvertTo-SecureString -String $windowsCertPassword -AsPlainText -Force)

If ($useAzure) {
    # Azure mode signs the exe via the win.sign callback, which reads these from the process env for
    # its PFX fallback. In PFX mode we deliberately do NOT export them: the exe signs via
    # certificateSubjectName + the store import above, and exporting CSC_LINK would make
    # electron-builder also sign the Store AppX with the PFX, whose publisher does not match the cert
    # ("SignTool Error: An unexpected internal error has occurred").
    $env:CSC_KEY_PASSWORD = $windowsCertPassword
    $env:CSC_LINK = $certPath
}

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

If ($useAzure) {
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
}
