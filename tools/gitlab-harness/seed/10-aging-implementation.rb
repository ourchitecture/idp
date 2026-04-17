Seeds.register do |api|
  puts "[seed] aging_implementation: merged MR with pending trunk validation"

  project = api.ensure_project(path_with_namespace: "example-org/auth-service")
  rachel = api.ensure_user(username: "rachel", name: "Rachel", email: "rachel@example-org.test")

  auth_team = SeedHelpers.ensure_team_group(api, "example-org/auth-team", [rachel])
  SeedHelpers.ensure_project_members(api, project, [rachel])
  api.set_project_approvals(project["id"], 1)

  SeedHelpers.ensure_codeowners(api, project, entries: { "*" => ["@#{auth_team['full_path']}"] })

  issue = SeedHelpers.ensure_issue(api, project, title: "Implement OAuth 2.0 refresh tokens")

  branch = "feature/oauth-refresh-token"
  SeedHelpers.ensure_branch_commit(
    api,
    project,
    branch:,
    file_path: "auth/refresh_token.md",
    content: "# OAuth refresh tokens\n\nAdds refresh token support.\n",
    message: "feat: add refresh token doc",
  )

  description = issue ? "Implements refresh token support\n\nCloses ##{issue['iid']}" : "Implements refresh token support"
  mr = SeedHelpers.ensure_merge_request(
    api,
    project,
    title: "Add OAuth refresh token support",
    source_branch: branch,
    target_branch: "main",
    description:,
    reviewers: [rachel],
  )

  mr_details = api.get_merge_request(project["id"], mr["iid"])
  sha = mr_details["sha"]
  SeedHelpers.set_status(api, project, sha:, state: "success", name: "ci / test", ref: branch) if sha

  begin
    api.approve_merge_request(project["id"], mr["iid"], sudo: rachel["username"])
  rescue StandardError => e
    warn "[seed] aging_implementation: approval step skipped (#{e.message})"
  end

  if mr_details["state"] != "merged"
    api.merge_merge_request(project["id"], mr["iid"])
    mr_details = api.get_merge_request(project["id"], mr["iid"])
  end

  merge_sha = mr_details["merge_commit_sha"]
  SeedHelpers.set_status(api, project, sha: merge_sha, state: "pending", name: "integration / main", ref: "main") if merge_sha

  puts "[seed] aging_implementation MR iid=#{mr['iid']} merge_sha=#{merge_sha}"
end
