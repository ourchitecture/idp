module SeedHelpers
  module_function

  def ensure_team_group(api, full_path, users)
    group = api.ensure_group(full_path, full_path.split("/").last.capitalize)
    users.each do |user|
      api.ensure_group_member(group["id"], user["id"])
    end
    group
  end

  def ensure_project_members(api, project, users)
    users.each do |user|
      api.ensure_project_member(project["id"], user["id"])
    end
  end

  def ensure_branch_commit(api, project, branch:, file_path:, content:, message:)
    api.ensure_branch(project["id"], branch)
    api.ensure_file(
      project["id"],
      branch:,
      path: file_path,
      content:,
      commit_message: message,
    )
  end

  def ensure_codeowners(api, project, branch: "main", entries:)
    content = entries.map { |pattern, owners| "#{pattern} #{owners.join(' ')}" }.join("\n") + "\n"
    ensure_branch_commit(
      api,
      project,
      branch:,
      file_path: "CODEOWNERS",
      content:,
      message: "chore: update CODEOWNERS",
    )
  end

  def ensure_merge_request(api, project, title:, source_branch:, target_branch:, description:, reviewers:)
    api.ensure_merge_request(
      project["id"],
      title:,
      source_branch:,
      target_branch:,
      description:,
      reviewers: reviewers.map { |u| u["id"] },
    )
  end

  def ensure_issue(api, project, title:, description: nil)
    api.ensure_issue(project["id"], title:, description:)
  end

  def set_status(api, project, sha:, state:, name:, ref: nil)
    api.set_commit_status(project["id"], sha:, state:, name:, ref:)
  end
end
