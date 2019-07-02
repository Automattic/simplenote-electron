#!/bin/sh

# Exit if any subcommand fails.
set -e
 
# Variables
ORIGIN_URL=`git config --get remote.origin.url`

echo "Starting deploy"

# Checkout deploy branch.
if [ `git branch | grep webapp-develop` ]
then
  git branch -D webapp-develop
fi
git checkout -b webapp-develop

# Build site.
NODE_ENV=production make build

# Delete and move files.
find . -maxdepth 1 ! -name '.git' ! -name 'dist' -exec rm -rf {} \;

cp -r vip/* ./

rm -rf vip

# Push to deploy.
git config user.name "$USER_NAME"
git config user.email "$USER_EMAIL"

git add -fA
git commit --allow-empty -m "Build: webapp-develop [ci skip]"
git push -f $ORIGIN_URL webapp-develop

# Move back to previous branch.
git checkout -

echo "Deployed Successfully!"

exit 0