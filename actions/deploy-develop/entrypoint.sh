#!/bin/sh -l

# Check branch
if [ `git rev-parse --abbrev-ref HEAD` != "$PUSHED_BRANCH" ]
then
  exit 0
fi

# Install Node Modules
npm install

# Build site
NODE_ENV=production make build

# Variables
ORIGIN_URL=`git config --get remote.origin.url`

# Checkout deploy branch
if [ `git branch | grep $COMMIT_BRANCH` ]
then
  git branch -D $COMMIT_BRANCH
fi
git checkout -b $COMMIT_BRANCH

# Delete files not needed in production
find . -maxdepth 1 ! -name '.git' ! -name 'dist' ! -name 'vip' -exec rm -rf {} \;

# Copy vip files to base path
cp -r vip/* ./

# Delete uneeded vip folder
rm -rf vip

# Push to deploy
git config user.name "GitHub Actions"
git config user.email "github-actions-bot@users.noreply.github.com"

git add --all
git commit -m "Build: $COMMIT_BRANCH [ci skip]"
git push -f $ORIGIN_URL $COMMIT_BRANCH

echo "Deployed Successfully!"

exit 0