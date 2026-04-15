package fixtures

import (
	"idp-go-net-http-rest/bff/flow"
	"os"

	"gopkg.in/yaml.v3"
)

const FixtureDir = "../../../../../../../schema/fixtures/provider-adapter-input/"

func Load(name string) (flow.ProviderAdapterInput, error) {
	raw, err := os.ReadFile(FixtureDir + name + ".yaml")
	if err != nil {
		return flow.ProviderAdapterInput{}, err
	}
	var input flow.ProviderAdapterInput
	if err := yaml.Unmarshal(raw, &input); err != nil {
		return flow.ProviderAdapterInput{}, err
	}
	return input, nil
}
