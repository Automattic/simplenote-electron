# Stop script execution when a non-terminating error occurs
$ErrorActionPreference = "Stop"

# Windows code signing defaults to Azure Artifact Signing. Set USE_PFX_CODE_SIGNING to use PFX.
$usePfx = -not [string]::IsNullOrEmpty($env:USE_PFX_CODE_SIGNING)
$useAzure = -not $usePfx

If ($useAzure) {
    Write-Host "--- :windows: Configure Azure Artifact Signing"
    # From the CI toolkit; fails here with diagnostics if Azure credentials are wrong.
    & "setup_azure_trusted_signing.ps1"
    If ($LastExitCode -ne 0) { Exit $LastExitCode }
}

If ($usePfx) {
    Write-Host "--- :windows: Configure PFX code signing"
    # From the CI toolkit; materializes certificate.pfx.
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

    # Import the cert so electron-builder's certificateSubjectName lookup finds it.
    Import-PfxCertificate -FilePath $certPath -CertStoreLocation Cert:\LocalMachine\Root -Password (ConvertTo-SecureString -String $windowsCertPassword -AsPlainText -Force)
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
