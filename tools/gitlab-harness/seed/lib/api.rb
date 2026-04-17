require "json"
require "net/http"
require "uri"
require "base64"

module GitLabHarness
  class Api
    ACCESS_MAINTAINER = 40
    ACCESS_DEVELOPER = 30

    def initialize(base_url:, token:)
      @base_url = base_url.chomp("/")
      @token = token
    end

    def get(path)
      request(Net::HTTP::Get.new(uri_for(path)))
    end

    def post(path, body = {}, sudo: nil)
      req = Net::HTTP::Post.new(uri_for(path))
      req.body = body.to_json
      request(req, sudo:)
    end

    def put(path, body = {}, sudo: nil)
      req = Net::HTTP::Put.new(uri_for(path))
      req.body = body.to_json
      request(req, sudo:)
    end

    def ensure_group(path, name)
      existing = find_group(path)
      return existing if existing

      post("/api/v4/groups", { path: path.split("/").last, name:, parent_id: parent_group_id(path) })
    end

    def ensure_user(username:, name:, email:, password: "Password123!", skip_confirmation: true)
      user = find_user(username)
      return user if user

      post("/api/v4/users", { username:, name:, email:, password:, skip_confirmation: })
    end

    def ensure_project(path_with_namespace:, name: nil, visibility: "private")
      project = find_project(path_with_namespace)
      return project if project

      namespace_path, project_path = path_with_namespace.split("/", 2)
      namespace = ensure_group(namespace_path, namespace_path.capitalize)
      body = {
        name: name || project_path,
        path: project_path,
        namespace_id: namespace["id"],
        visibility:,
        initialize_with_readme: true,
        default_branch: "main",
      }
      post("/api/v4/projects", body)
    end

    def ensure_group_member(group_id, user_id, access_level: ACCESS_MAINTAINER)
      return if member?("/api/v4/groups/#{group_id}/members/#{user_id}")

      post("/api/v4/groups/#{group_id}/members", { user_id:, access_level: })
    end

    def ensure_project_member(project_id, user_id, access_level: ACCESS_DEVELOPER)
      return if member?("/api/v4/projects/#{project_id}/members/#{user_id}")

      post("/api/v4/projects/#{project_id}/members", { user_id:, access_level: })
    end

    def ensure_branch(project_id, branch, ref = "main")
      return get("/api/v4/projects/#{project_id}/repository/branches/#{URI.encode_www_form_component(branch)}")
    rescue StandardError
      post("/api/v4/projects/#{project_id}/repository/branches", { branch:, ref: })
    end

    def ensure_file(project_id, branch:, path:, content:, commit_message:)
      encoded_path = URI.encode_www_form_component(path)
      begin
        existing = get("/api/v4/projects/#{project_id}/repository/files/#{encoded_path}?ref=#{branch}")
        current = Base64.decode64(existing["content"])
        return existing if current == content

        put(
          "/api/v4/projects/#{project_id}/repository/files/#{encoded_path}",
          {
            branch:,
            content:,
            commit_message:,
          },
        )
      rescue StandardError
        post(
          "/api/v4/projects/#{project_id}/repository/files/#{encoded_path}",
          {
            branch:,
            content:,
            commit_message:,
          },
        )
      end
    end

    def ensure_issue(project_id, title:, description: nil, labels: [])
      issues = get("/api/v4/projects/#{project_id}/issues?search=#{URI.encode_www_form_component(title)}")
      found = issues.find { |i| i["title"] == title }
      return found if found

      post(
        "/api/v4/projects/#{project_id}/issues",
        { title:, description:, labels: labels.join(",") },
      )
    end

    def ensure_merge_request(project_id, title:, source_branch:, target_branch:, description: nil, reviewers: [])
      existing = get(
        "/api/v4/projects/#{project_id}/merge_requests?state=all&source_branch=#{URI.encode_www_form_component(source_branch)}&target_branch=#{URI.encode_www_form_component(target_branch)}",
      )
      found = existing.find { |mr| mr["title"] == title }
      return found if found

      reviewer_ids = reviewers.compact
      post(
        "/api/v4/projects/#{project_id}/merge_requests",
        {
          title:,
          source_branch:,
          target_branch:,
          description:,
          reviewer_ids: reviewer_ids.empty? ? nil : reviewer_ids,
        }.compact,
      )
    end

    def set_project_approvals(project_id, approvals_before_merge)
      put("/api/v4/projects/#{project_id}/approvals", { approvals_before_merge: })
    end

    def approve_merge_request(project_id, mr_iid, sudo: nil)
      post("/api/v4/projects/#{project_id}/merge_requests/#{mr_iid}/approve", {}, sudo:)
    end

    def merge_merge_request(project_id, mr_iid)
      put("/api/v4/projects/#{project_id}/merge_requests/#{mr_iid}/merge", { merge_when_pipeline_succeeds: false })
    end

    def set_commit_status(project_id, sha:, state:, name:, target_url: nil, ref: nil)
      body = { state:, name:, target_url:, ref: }.compact
      post("/api/v4/projects/#{project_id}/statuses/#{sha}", body)
    end

    def get_commit(project_id, sha)
      get("/api/v4/projects/#{project_id}/repository/commits/#{sha}")
    end

    def get_merge_request(project_id, mr_iid)
      get("/api/v4/projects/#{project_id}/merge_requests/#{mr_iid}")
    end

    private

    def request(req, sudo: nil)
      req["Content-Type"] = "application/json"
      req["PRIVATE-TOKEN"] = @token
      req["Sudo"] = sudo if sudo
      uri = req.uri

      Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == "https") do |http|
        res = http.request(req)
        unless res.is_a?(Net::HTTPSuccess)
          raise "GitLab API #{req.method} #{uri} failed: #{res.code} #{res.body}"
        end
        parse_json(res.body)
      end
    end

    def uri_for(path)
      URI("#{@base_url}#{path}")
    end

    def parse_json(body)
      return {} if body.nil? || body.empty?

      JSON.parse(body)
    end

    def member?(path)
      get(path)
      true
    rescue StandardError
      false
    end

    def find_group(full_path)
      get("/api/v4/groups/#{URI.encode_www_form_component(full_path)}")
    rescue StandardError
      nil
    end

    def parent_group_id(path)
      parts = path.split("/")
      return nil if parts.size == 1

      parent_path = parts[0...-1].join("/")
      group = find_group(parent_path)
      group && group["id"]
    end

    def find_user(username)
      users = get("/api/v4/users?username=#{URI.encode_www_form_component(username)}")
      users.first
    rescue StandardError
      nil
    end

    def find_project(path_with_namespace)
      get("/api/v4/projects/#{URI.encode_www_form_component(path_with_namespace)}")
    rescue StandardError
      nil
    end
  end
end
