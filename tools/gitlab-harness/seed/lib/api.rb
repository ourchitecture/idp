require "json"
require "net/http"
require "uri"

module GitLabHarness
  class Api
    def initialize(base_url:, token:)
      @base_url = base_url.chomp("/")
      @token = token
    end

    def get(path)
      request(Net::HTTP::Get.new(uri_for(path)))
    end

    def post(path, body = {})
      req = Net::HTTP::Post.new(uri_for(path))
      req.body = body.to_json
      request(req)
    end

    def put(path, body = {})
      req = Net::HTTP::Put.new(uri_for(path))
      req.body = body.to_json
      request(req)
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

    private

    def request(req)
      req["Content-Type"] = "application/json"
      req["PRIVATE-TOKEN"] = @token
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
