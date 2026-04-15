Seeds.register do |api|
  puts "[seed] bootstrap: ensuring org and users"

  org = api.ensure_group("example-org", "Example Org")

  users = [
    { username: "alice", name: "Alice", email: "alice@example-org.test" },
    { username: "bob", name: "Bob", email: "bob@example-org.test" },
    { username: "carol", name: "Carol", email: "carol@example-org.test" },
    { username: "dana", name: "Dana", email: "dana@example-org.test" },
    { username: "eli", name: "Eli", email: "eli@example-org.test" },
    { username: "fay", name: "Fay", email: "fay@example-org.test" },
    { username: "marcus", name: "Marcus", email: "marcus@example-org.test" },
    { username: "olivia", name: "Olivia", email: "olivia@example-org.test" },
    { username: "sam", name: "Sam", email: "sam@example-org.test" },
    { username: "rachel", name: "Rachel", email: "rachel@example-org.test" },
    { username: "tom", name: "Tom", email: "tom@example-org.test" },
    { username: "uma", name: "Uma", email: "uma@example-org.test" },
    { username: "victor", name: "Victor", email: "victor@example-org.test" },
    { username: "peter", name: "Peter", email: "peter@example-org.test" },
    { username: "quinn", name: "Quinn", email: "quinn@example-org.test" },
  ]

  users.each do |user|
    api.ensure_user(**user)
  end

  projects = [
    "example-org/payments-service",
    "example-org/observability",
    "example-org/infra",
    "example-org/notifications-service",
    "example-org/auth-service",
    "example-org/checkout-service",
  ]

  projects.each do |path|
    api.ensure_project(path_with_namespace: path, visibility: "private")
  end

  puts "[seed] bootstrap complete for group #{org['full_path']}"
end
