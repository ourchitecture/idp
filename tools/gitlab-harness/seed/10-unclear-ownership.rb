Seeds.register do |api|
  puts "[seed] unclear_ownership: creating MR with unmatched CODEOWNERS"

  project = api.ensure_project(path_with_namespace: "example-org/notifications-service")
  marcus = api.ensure_user(username: "marcus", name: "Marcus", email: "marcus@example-org.test")

  SeedHelpers.ensure_project_members(api, project, [marcus])

  # Deliberately omit wildcard coverage so changed path has no owner match.
  SeedHelpers.ensure_codeowners(api, project, entries: { "docs/*" => ["@alice"], "config/*" => ["@bob"] })

  issue = SeedHelpers.ensure_issue(api, project, title: "Implement push notifications")

  branch = "feature/add-push-notifications"
  SeedHelpers.ensure_branch_commit(
    api,
    project,
    branch:,
    file_path: "src/push/handler.rb",
    content: "# Push notification handler\nputs 'notify'\n",
    message: "feat: add push notification handler",
  )

  description = issue ? "Adds push notification support\n\nRelates to ##{issue['iid']}" : "Adds push notification support"
  mr = SeedHelpers.ensure_merge_request(
    api,
    project,
    title: "Add push notification support",
    source_branch: branch,
    target_branch: "main",
    description:,
    reviewers: [],
  )

  mr_details = api.get_merge_request(project["id"], mr["iid"])
  sha = mr_details["sha"]
  SeedHelpers.set_status(api, project, sha:, state: "success", name: "ci / test", ref: branch) if sha

  puts "[seed] unclear_ownership MR iid=#{mr['iid']} project_id=#{project['id']}"
end
