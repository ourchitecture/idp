package fixtures

import (
	"idp-go-net-http-rest/bff/flow"
	"os"
	"path/filepath"
	"runtime"

	"gopkg.in/yaml.v3"
)

// FixtureDir is the absolute path to the schema fixtures directory.
//
// Resolution strategy (in priority order):
//  1. OUR_IDP_FLOW_FIXTURE_DIR environment variable, when set, for container
//     deployments or test environments that mount fixtures at a different
//     location.
//  2. A path derived from this source file's location via runtime.Caller(0).
//     This is the Go equivalent of the nodejs __dirname approach used by
//     stacks/nodejs/react-fastify/rest. It is robust against the binary
//     being launched from arbitrary working directories (e.g. `go test`
//     from a sub-package, or `go run ./bff` from the stack root).
//
// The source-file-relative approach assumes the binary is run from a
// development checkout where the source tree is still present at the
// compile-time path. For deployed binaries that have been moved away from
// their source tree, OUR_IDP_FLOW_FIXTURE_DIR must be set.
var FixtureDir string

func init() {
	if dir := os.Getenv("OUR_IDP_FLOW_FIXTURE_DIR"); dir != "" {
		FixtureDir = ensureTrailingSeparator(dir)
		return
	}

	FixtureDir = ensureTrailingSeparator(resolveDefaultFixtureDir())
}

// resolveDefaultFixtureDir computes the fixture directory by walking up from
// this source file's location to the repository root, then descending to
// schema/fixtures/provider-adapter-input.
//
// This file lives at:
//
//	<repo>/stacks/go/net-http/rest/bff/flow/fixtures/fixtures.go
//
// filepath.Dir(file) = <repo>/stacks/go/net-http/rest/bff/flow/fixtures
//
// From there, 7 levels up reach the repo root:
//
//	fixtures -> flow -> bff -> rest -> net-http -> go -> stacks -> <repo>
func resolveDefaultFixtureDir() string {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		// Fall back to a CWD-relative path that works when the binary is
		// launched from the stack root (stacks/go/net-http/rest/). This is
		// the common case for `go run ./bff`.
		return "../../../../schema/fixtures/provider-adapter-input"
	}
	dir := filepath.Dir(file)
	for range 7 {
		dir = filepath.Dir(dir)
	}
	return filepath.Join(dir, "schema", "fixtures", "provider-adapter-input")
}

func ensureTrailingSeparator(dir string) string {
	if dir == "" {
		return dir
	}
	if dir[len(dir)-1] == filepath.Separator || dir[len(dir)-1] == '/' {
		return dir
	}
	return dir + string(filepath.Separator)
}

func Load(name string) (flow.ProviderAdapterInput, error) {
	raw, err := os.ReadFile(filepath.Join(FixtureDir, name+".yaml"))
	if err != nil {
		return flow.ProviderAdapterInput{}, err
	}
	var input flow.ProviderAdapterInput
	if err := yaml.Unmarshal(raw, &input); err != nil {
		return flow.ProviderAdapterInput{}, err
	}
	return input, nil
}
