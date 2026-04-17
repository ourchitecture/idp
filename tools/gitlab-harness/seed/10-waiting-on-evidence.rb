Seeds.register do |api|
  puts "[seed] waiting_on_evidence: creating merged MR with pending attestation"

  project = api.ensure_project(path_with_namespace: "example-org/payments-service")
  olivia = api.ensure_user(username: "olivia", name: "Olivia", email: "olivia@example-org.test")
  sam = api.ensure_user(username: "sam", name: "Sam", email: "sam@example-org.test")

  payments_team = SeedHelpers.ensure_team_group(api, "example-org/payments-team", [sam])
  SeedHelpers.ensure_project_members(api, project, [olivia, sam])
  api.set_project_approvals(project["id"], 1)

  SeedHelpers.ensure_codeowners(api, project, entries: { "*" => ["@#{payments_team['full_path']}"] })

  issue = SeedHelpers.ensure_issue(api, project, title: "Implement PCI DSS compliance changes")

  branch = "feature/pci-compliance-update"
  SeedHelpers.ensure_branch_commit(
    api,
    project,
    branch:,
    file_path: "compliance/pci.md",
    content: "# PCI Updates\n\nDocument PCI compliance updates.\n",
    message: "docs: add pci compliance notes",
  )

  description = issue ? "PCI compliance update\n\nCloses ##{issue['iid']}" : "PCI compliance update"
  mr = SeedHelpers.ensure_merge_request(
    api,
    project,
    title: "PCI compliance update",
    source_branch: branch,
    target_branch: "main",
    description:,
    reviewers: [sam],
  )

  mr_details = api.get_merge_request(project["id"], mr["iid"])
  sha = mr_details["sha"]
  SeedHelpers.set_status(api, project, sha:, state: "success", name: "ci / test", ref: branch) if sha

  begin
    api.approve_merge_request(project["id"], mr["iid"], sudo: sam["username"])
  rescue StandardError => e
    warn "[seed] waiting_on_evidence: approval step skipped (#{e.message})"
  end

  if mr_details["state"] != "merged"
    api.merge_merge_request(project["id"], mr["iid"])
    mr_details = api.get_merge_request(project["id"], mr["iid"])
  end

  # Tag MR to signal pending attestation for downstream checks.
  begin
    api.put(
      "/api/v4/projects/#{project['id']}/merge_requests/#{mr['iid']}",
      { labels: "evidence:pending" },
    )
    api.post(
      "/api/v4/projects/#{project['id']}/merge_requests/#{mr['iid']}/notes",
      { body: "Compliance attestation pending review by #{sam['username']}." },
    )
  rescue StandardError => e
    warn "[seed] waiting_on_evidence: unable to annotate MR (#{e.message})"
  end

  puts "[seed] waiting_on_evidence MR iid=#{mr['iid']} merge_sha=#{mr_details['merge_commit_sha']}"
end
