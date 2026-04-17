Seeds.register do |api|
  puts "[seed] risk_aggregation: creating three concurrent MRs"

  project = api.ensure_project(path_with_namespace: "example-org/checkout-service")
  tom = api.ensure_user(username: "tom", name: "Tom", email: "tom@example-org.test")
  uma = api.ensure_user(username: "uma", name: "Uma", email: "uma@example-org.test")
  victor = api.ensure_user(username: "victor", name: "Victor", email: "victor@example-org.test")

  checkout_team = SeedHelpers.ensure_team_group(api, "example-org/checkout-team", [tom, uma, victor])
  SeedHelpers.ensure_project_members(api, project, [tom, uma, victor])
  api.set_project_approvals(project["id"], 1)

  SeedHelpers.ensure_codeowners(api, project, entries: { "src/app/*" => ["@#{checkout_team['full_path']}"] })

  # MR 1: merged with failing trunk status
  branch1 = "feature/payment-retry"
  SeedHelpers.ensure_branch_commit(
    api,
    project,
    branch: branch1,
    file_path: "src/app/payment_retry.md",
    content: "# Payment retry\n\nAdds retry logic.\n",
    message: "feat: add payment retry logic",
  )
  mr1 = SeedHelpers.ensure_merge_request(
    api,
    project,
    title: "Add payment retry logic",
    source_branch: branch1,
    target_branch: "main",
    description: "Implements payment retry flow",
    reviewers: [uma],
  )
  mr1_details = api.get_merge_request(project["id"], mr1["iid"])
  sha1 = mr1_details["sha"]
  SeedHelpers.set_status(api, project, sha: sha1, state: "success", name: "ci / test", ref: branch1) if sha1
  begin
    api.approve_merge_request(project["id"], mr1["iid"], sudo: uma["username"])
  rescue StandardError => e
    warn "[seed] risk_aggregation: approval for mr1 skipped (#{e.message})"
  end
  if mr1_details["state"] != "merged"
    api.merge_merge_request(project["id"], mr1["iid"])
    mr1_details = api.get_merge_request(project["id"], mr1["iid"])
  end
  merge_sha1 = mr1_details["merge_commit_sha"]
  SeedHelpers.set_status(api, project, sha: merge_sha1, state: "failed", name: "deploy / main", ref: "main") if merge_sha1

  # MR 2: open and blocked on review
  branch2 = "feature/discount-engine"
  SeedHelpers.ensure_branch_commit(
    api,
    project,
    branch: branch2,
    file_path: "src/app/discounts.md",
    content: "# Discounts\n\nRefactor discount engine.\n",
    message: "refactor: discount engine",
  )
  mr2 = SeedHelpers.ensure_merge_request(
    api,
    project,
    title: "Refactor discount engine",
    source_branch: branch2,
    target_branch: "main",
    description: "Refactor discount calculations",
    reviewers: [tom],
  )
  mr2_details = api.get_merge_request(project["id"], mr2["iid"])
  sha2 = mr2_details["sha"]
  SeedHelpers.set_status(api, project, sha: sha2, state: "success", name: "ci / test", ref: branch2) if sha2

  # MR 3: open with no reviewer and no explicit CODEOWNERS match on path
  branch3 = "feature/cart-persistence"
  SeedHelpers.ensure_branch_commit(
    api,
    project,
    branch: branch3,
    file_path: "src/cart/persistence.md",
    content: "# Cart persistence\n\nAdds session persistence.\n",
    message: "feat: add cart persistence",
  )
  mr3 = SeedHelpers.ensure_merge_request(
    api,
    project,
    title: "Add cart persistence",
    source_branch: branch3,
    target_branch: "main",
    description: "Adds cart persistence",
    reviewers: [],
  )
  mr3_details = api.get_merge_request(project["id"], mr3["iid"])
  sha3 = mr3_details["sha"]
  SeedHelpers.set_status(api, project, sha: sha3, state: "success", name: "ci / test", ref: branch3) if sha3

  puts "[seed] risk_aggregation MRs iid=#{mr1['iid']},#{mr2['iid']},#{mr3['iid']} project_id=#{project['id']}"
end
