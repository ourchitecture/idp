external_url "http://localhost:8929"
gitlab_rails["gitlab_shell_ssh_port"] = 2424
gitlab_rails["initial_root_password"] = ENV.fetch("GITLAB_ROOT_PASSWORD", "gitlab-harness-root")
gitlab_rails["initial_shared_runners_registration_token"] = ENV.fetch("GITLAB_RUNNER_REGISTRATION_TOKEN", "gitlab-harness-runner-token")
gitlab_rails["usage_ping_enabled"] = false
gitlab_rails["gitlab_default_can_create_group"] = true
gitlab_rails["gitlab_email_enabled"] = false
gitlab_rails["gitlab_kas_enabled"] = false
gitlab_rails["container_registry_enabled"] = false
pages_external_url nil
registry_external_url nil
prometheus_monitoring["enable"] = false
puma["worker_processes"] = 2
sidekiq["max_concurrency"] = 10
