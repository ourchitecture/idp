#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative "lib/api"
require_relative "lib/helpers"

module Seeds
  class << self
    def register(&block)
      seeders << block
    end

    def run_all(api)
      seeders.each { |runner| runner.call(api) }
    end

    private

    def seeders
      @seeders ||= []
    end
  end
end

token = ENV["GITLAB_HARNESS_TOKEN"] || begin
  token_path = File.expand_path("../.secrets/gitlab-harness.token", __dir__)
  raise "Token not found at #{token_path}" unless File.file?(token_path)

  File.read(token_path)
end

base_url = ENV["GITLAB_BASE_URL"] || "http://localhost:8929"

Dir[File.join(__dir__, "*.rb")].sort.each do |file|
  next if File.basename(file) == "run.rb"

  require file
end

api = GitLabHarness::Api.new(base_url:, token: token.strip)
Seeds.run_all(api)
