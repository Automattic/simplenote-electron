# Stop script execution when a non-terminating error occurs
$ErrorActionPreference = "Stop"

& "prepare_windows_host_for_node.ps1"

# First try to get the env var from the process environment
$windowsCertPassword = [System.Environment]::GetEnvironmentVariable('DEDICATED_WINDOWS_CERT_PASSWORD', [System.EnvironmentVariableTarget]::Process)
If ([string]::IsNullOrEmpty($windowsCertPassword)) {
    # If it fails, try from the machine-wide environment
    $windowsCertPassword = [System.Environment]::GetEnvironmentVariable('DEDICATED_WINDOWS_CERT_PASSWORD', [System.EnvironmentVariableTarget]::Machine)
}

If ([string]::IsNullOrEmpty($windowsCertPassword)) {
    Write-Host "[!] DEDICATED_WINDOWS_CERT_PASSWORD is not set in either process or machine environments."
    Exit 1
} else {
    [System.Environment]::SetEnvironmentVariable('CSC_KEY_PASSWORD', $windowsCertPassword, [System.EnvironmentVariableTarget]::Machine)
    Write-Host "Environment variable CSC_KEY_PASSWORD set to the value of DEDICATED_WINDOWS_CERT_PASSWORD."
}

Write-Host "--- :windows: Configure Windows code signing"
# See decrypt-dedicated-windows-cert.p12
$certPath = (Convert-Path .\resources\certificates\win.p12)
If (Test-Path $certPath) {
    [System.Environment]::SetEnvironmentVariable('CSC_LINK', $certPath, [System.EnvironmentVariableTarget]::Machine)
    Write-Host "Environment variable CSC_LINK set to $certPath"
} else {
    Write-Host "[!] Certificate file does not exist at given path $certPath."
    Exit 1
}

# Workaround for CI not finding the certificate.
# See failure such as
# https://buildkite.com/automattic/simplenote-electron/builds/71#01900b28-9508-4bfe-bc80-63464afeaa3e/292-567
Import-PfxCertificate `
  -FilePath $certPath `
  -CertStoreLocation Cert:\LocalMachine\Root `
  -Password (ConvertTo-SecureString -String $env:DEDICATED_WINDOWS_CERT_PASSWORD -AsPlainText -Force)

Write-Host "--- :windows: Installing make"
choco install make

Write-Host "--- :npm: Installing dependencies"
npm ci --legacy-peer-deps

Write-Host "--- :lock_with_ink_pen: Decrypting secrets"
make decrypt_conf

Write-Host "--- :node: Building app"
make build

Write-Host "--- :windows: Packaging for Windows"
make package-win32 SKIP_BUILD=true

If ($LastExitCode -ne 0) { Exit $LastExitCode }
