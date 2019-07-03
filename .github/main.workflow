workflow "Build and Push to WebApp" {
  on = "push"
  resolves = ["GitHub Action for Docker"]
}

action "GitHub Action for Docker" {
  uses = "actions/docker/cli@86ff551d26008267bb89ac11198ba7f1d807b699"
  runs = "./bin/deploy-develop.sh"
  secrets = ["GITHUB_TOKEN"]
}
