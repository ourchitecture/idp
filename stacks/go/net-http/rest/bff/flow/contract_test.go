package flow

import (
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

// Ensures the Go view of the provider adapter input stays aligned with the
// canonical schema at schema/provider-adapter-input.yaml to avoid drift.
func TestProviderAdapterInputMatchesSchema(t *testing.T) {
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatalf("unable to resolve caller path")
	}
	base := filepath.Dir(file)
	schemaPath := filepath.Join(base, "..", "..", "..", "..", "..", "..", "schema", "provider-adapter-input.yaml")
	data, err := os.ReadFile(schemaPath)
	if err != nil {
		t.Fatalf("read schema: %v", err)
	}

	var schemaDoc map[string]any
	if err := yaml.Unmarshal(data, &schemaDoc); err != nil {
		t.Fatalf("unmarshal schema: %v", err)
	}

	defsAny, ok := schemaDoc["$defs"]
	if !ok {
		t.Fatalf("schema missing $defs section")
	}
	defs, ok := defsAny.(map[string]any)
	if !ok {
		t.Fatalf("unexpected $defs shape: %T", defsAny)
	}
	providerAny, ok := defs["ProviderAdapterInput"]
	if !ok {
		t.Fatalf("schema missing ProviderAdapterInput definition")
	}
	provider, ok := providerAny.(map[string]any)
	if !ok {
		t.Fatalf("unexpected ProviderAdapterInput shape: %T", providerAny)
	}

	propsAny, ok := provider["properties"]
	if !ok {
		t.Fatalf("ProviderAdapterInput missing properties section")
	}
	props, ok := propsAny.(map[string]any)
	if !ok {
		t.Fatalf("unexpected properties shape: %T", propsAny)
	}

	expectedKeys := []string{
		"repository",
		"changes",
		"actors",
		"review_states",
		"validation_runs",
		"merge_events",
		"evidence_states",
		"ownership_hints",
	}
	for _, key := range expectedKeys {
		if _, ok := props[key]; !ok {
			t.Fatalf("schema missing expected property %s", key)
		}
	}

	structKeys := make(map[string]struct{})
	tp := reflect.TypeOf(ProviderAdapterInput{})
	for i := 0; i < tp.NumField(); i++ {
		tag := tp.Field(i).Tag.Get("json")
		name := strings.Split(tag, ",")[0]
		structKeys[name] = struct{}{}
	}

	for key := range props {
		if _, ok := structKeys[key]; !ok {
			t.Fatalf("Go contract missing field for schema property %s", key)
		}
	}
}
