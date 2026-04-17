Seeds.register do |api|
  puts "[seed] blocked_on_review (self-managed): creating merge request awaiting review"

  project = api.ensure_project(path_with_namespace: "example-org/infra")
  peter = api.ensure_user(username: "peter", name: "Peter", email: "peter@example-org.test")
  quinn = api.ensure_user(username: "quinn", name: "Quinn", email: "quinn@example-org.test")

  infra_team = SeedHelpers.ensure_team_group(api, "example-org/infra-team", [peter, quinn])
  SeedHelpers.ensure_project_members(api, project, [peter, quinn])
  api.set_project_approvals(project["id"], 1)

  SeedHelpers.ensure_codeowners(api, project, entries: { "*" => ["@#{infra_team['full_path']}"] })

  branch = "feature/update-network-policy"
  SeedHelpers.ensure_branch_commit(
    api,
    project,
    branch:,
    file_path: "network/policy.md",
    content: "# Network Policy\n\nUpdate firewall rules.\n",
    message: "chore: update network policy docs",
  )

  mr = SeedHelpers.ensure_merge_request(
    api,
    project,
    title: "Update network policy",
    source_branch: branch,
    target_branch: "main",
    description: "Document updated firewall policy",
    reviewers: [],
  )

  mr_details = api.get_merge_request(project["id"], mr["iid"])
  sha = mr_details["sha"]
  SeedHelpers.set_status(api, project, sha:, state: "success", name: "legacy-ci", ref: branch) if sha

  puts "[seed] blocked_on_review self-managed MR iid=#{mr['iid']} project_id=#{project['id']}"
end
