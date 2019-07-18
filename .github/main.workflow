workflow "Build and Push to WebApp" {
  on = "push"
  resolves = ["Deploy Develop"]
}

action "Deploy Develop" {
  uses = "./actions/deploy-develop"
  secrets = ["GITHUB_TOKEN", "APP_ID"]
  env = {
    PUSHED_BRANCH = "develop"
    COMMIT_BRANCH = "webapp-develop"
  }
}
