#!/bin/sh -l

COMMIT_BRANCH=''
WEB_APP_URL=''
APP_ENGINE_URL=''

if [ -z "$1" ]
then
  echo "You did not specify a deploy environment, your choices are: production, develop, staging"
  exit 1
fi

case $1 in

  "staging")
    COMMIT_BRANCH='webapp-staging'
    WEB_APP_URL='https://simplenote-staging.go-vip.net'
    APP_ENGINE_URL='https://staging.simplenote.com'
    ;;

  "develop")
    COMMIT_BRANCH='webapp-develop'
    WEB_APP_URL='https://simplenote-develop.go-vip.net'
    APP_ENGINE_URL='https://develop.simplenote.com'
    ;;

  "production")
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

# Temporarily move config-local so it doesn't get overwritten
mv config-local.json config-local.original.json

# Setup config
json_string=$(printf '{"app_id": "chalk-bump-f49", "app_key": "12345", "development": false, "wpcc_client_id": "0", "wpcc_redirect_url": "https://simplenote.com", "is_app_engine": true, "web_app_url": "%s", "app_engine_url": "%s"}' "$WEB_APP_URL" "$APP_ENGINE_URL")
echo "$json_string" > config-local.json

# Clean up old builds
rm -rf dist

# Build site
NODE_ENV=production make build

# Restore config-local
rm config-local.json
mv config-local.original.json  config-local.json

# Checkout deploy branch
if [ "$(git branch | grep $COMMIT_BRANCH)" ]
then
  git branch -D $COMMIT_BRANCH
fi
git checkout -b $COMMIT_BRANCH

# Delete files not needed in production
find . -maxdepth 1 ! -name '.git' ! -name 'dist' ! -name 'vip' ! -name 'config-local.json' -exec rm -rf {} ';'

# Copy vip files to base path
cp -r vip/* ./
rm -rf vip

# Add, commit, push
touch .gitignore
echo config-local.json >> .gitignore
git add --all
git commit -m "Build: $COMMIT_BRANCH [ci skip]"
git push -f origin $COMMIT_BRANCH
git reset .

echo "Deployed Successfully!"

git checkout trunk

exit 0