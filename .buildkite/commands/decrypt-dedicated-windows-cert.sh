#!/bin/bash -eu

openssl aes-256-cbc -md md5 -d \
  -in ./resources/certificates/win.p12.enc \
  -out ./resources/certificates/win.p12 \
  -k "$DEDICATED_WINDOWS_CERT_ENCRYPTION_KEY"

