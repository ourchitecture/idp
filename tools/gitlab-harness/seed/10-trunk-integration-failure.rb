Seeds.register do |api|
  puts "[seed] trunk_integration_failure: creating merged MR with failing trunk status"

  project = api.ensure_project(path_with_namespace: "example-org/observability")
  dana = api.ensure_user(username: "dana", name: "Dana", email: "dana@example-org.test")
  eli = api.ensure_user(username: "eli", name: "Eli", email: "eli@example-org.test")
  fay = api.ensure_user(username: "fay", name: "Fay", email: "fay@example-org.test")

  sre_team = SeedHelpers.ensure_team_group(api, "example-org/sre-team", [eli, fay])
  SeedHelpers.ensure_project_members(api, project, [dana, eli, fay])
  api.set_project_approvals(project["id"], 2)

  SeedHelpers.ensure_codeowners(api, project, entries: { "*" => ["@#{sre_team['full_path']}"] })

  issue = SeedHelpers.ensure_issue(api, project, title: "Add alerting for latency")

  branch = "feature/add-alerting"
  SeedHelpers.ensure_branch_commit(
    api,
    project,
    branch:,
    file_path: "alerts/rules.yml",
    content: "alerts:\n  - name: latency\n    threshold_ms: 250\n",
    message: "feat: add alerting rules",
  )

  description = issue ? "Implements alerting rules\n\nCloses ##{issue['iid']}" : "Implements alerting rules"
  mr = SeedHelpers.ensure_merge_request(
    api,
    project,
    title: "Add alerting rules",
    source_branch: branch,
    target_branch: "main",
    description:,
    reviewers: [eli, fay],
  )

  mr_details = api.get_merge_request(project["id"], mr["iid"])
  sha = mr_details["sha"]
  SeedHelpers.set_status(api, project, sha:, state: "success", name: "ci / test", ref: branch) if sha

  begin
    api.approve_merge_request(project["id"], mr["iid"], sudo: eli["username"])
    api.approve_merge_request(project["id"], mr["iid"], sudo: fay["username"])
  rescue StandardError => e
    warn "[seed] trunk_integration_failure: approval step skipped (#{e.message})"
  end

  if mr_details["state"] != "merged"
    api.merge_merge_request(project["id"], mr["iid"])
    mr_details = api.get_merge_request(project["id"], mr["iid"])
  end

  merge_sha = mr_details["merge_commit_sha"]
  SeedHelpers.set_status(api, project, sha: merge_sha, state: "failed", name: "deploy / main", ref: "main") if merge_sha

  puts "[seed] trunk_integration_failure MR iid=#{mr['iid']} merge_sha=#{merge_sha}"
end
