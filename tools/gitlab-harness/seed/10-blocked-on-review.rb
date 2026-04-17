Seeds.register do |api|
  puts "[seed] blocked_on_review: creating merge request waiting on approvals"

  project = api.ensure_project(path_with_namespace: "example-org/payments-service")
  alice = api.ensure_user(username: "alice", name: "Alice", email: "alice@example-org.test")
  bob = api.ensure_user(username: "bob", name: "Bob", email: "bob@example-org.test")
  carol = api.ensure_user(username: "carol", name: "Carol", email: "carol@example-org.test")

  payments_team = SeedHelpers.ensure_team_group(api, "example-org/payments-team", [bob, carol])
  SeedHelpers.ensure_project_members(api, project, [alice, bob, carol])
  api.set_project_approvals(project["id"], 2)

  SeedHelpers.ensure_codeowners(api, project, entries: { "*" => ["@#{payments_team['full_path']}"] })

  issue = SeedHelpers.ensure_issue(api, project, title: "Add payment webhook handler")

  branch = "feature/add-payment-webhook"
  SeedHelpers.ensure_branch_commit(
    api,
    project,
    branch:,
    file_path: "src/payments/webhook.md",
    content: "# Payment Webhook\n\nImplements new webhook handling.\n",
    message: "feat: add webhook handler",
  )

  description = "Implements webhook handler\n\nCloses ##{issue['iid']}" if issue
  mr = SeedHelpers.ensure_merge_request(
    api,
    project,
    title: "Add payment webhook",
    source_branch: branch,
    target_branch: "main",
    description:,
    reviewers: [bob, carol],
  )

  mr_details = api.get_merge_request(project["id"], mr["iid"])
  sha = mr_details["sha"]
  SeedHelpers.set_status(api, project, sha:, state: "success", name: "ci / test", ref: branch) if sha

  puts "[seed] blocked_on_review MR iid=#{mr['iid']} project_id=#{project['id']}"
end
