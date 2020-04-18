#!/bin/sh -l

COMMIT_BRANCH=''
WEB_APP_URL=''
APP_ENGINE_URL=''

case $BRANCH in

  "refs/heads/develop")
    COMMIT_BRANCH='webapp-develop'
    WEB_APP_URL='https://simplenote-develop.go-vip.net'
    APP_ENGINE_URL='https://develop.simplenote.com'
    ;;

  "refs/heads/master")
    COMMIT_BRANCH='webapp'
    WEB_APP_URL='https://simplenote.go-vip.co'
    APP_ENGINE_URL='https://app.simplenote.com'
    ;;

  *)
    exit 0
    ;;
esac

# Install Node Modules
npm install

#Setup config-local to override config
json_string=$(printf '{"app_id": "%s", "app_key": "12345", "development": false, "wpcc_client_id": "0", "wpcc_redirect_url": "https://simplenote.com", "is_app_engine": true, "web_app_url": "%s", "app_engine_url": "%s"}' "$APP_ID" "$WEB_APP_URL" "$APP_ENGINE_URL")
echo "$json_string" > config-local.json

# Build site
NODE_ENV=production make build

# Variables
ORIGIN_URL=$(git config --get remote.origin.url)

# Checkout deploy branch
if [ "$(git branch | grep $COMMIT_BRANCH)" ]
then
  git branch -D $COMMIT_BRANCH
fi
git checkout -b $COMMIT_BRANCH

# Delete files not needed in production
find . -maxdepth 1 ! -name '.git' ! -name 'dist' ! -name 'vip' -exec rm -rf {} \;

# Copy vip files to base path
cp -r vip/* ./

# Delete unneeded vip folder
rm -rf vip

# Push to deploy
git config user.name "GitHub Actions"
git config user.email "github-actions-bot@users.noreply.github.com"

git add --all
git commit -m "Build: $COMMIT_BRANCH [ci skip]"
git remote set-url origin https://${GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}
git push -f origin $COMMIT_BRANCH

echo "Deployed Successfully!"

exit 0