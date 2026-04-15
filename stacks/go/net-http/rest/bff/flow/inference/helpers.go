package inference

import "idp-go-net-http-rest/bff/flow"

func resolvePrimaryTeam(hints []flow.NormalizedOwnershipHint) string {
	for _, hint := range hints {
		if len(hint.OwnerTeamNames) > 0 {
			return hint.OwnerTeamNames[0]
		}
	}
	return ""
}

func serviceFrom(repo flow.NormalizedRepository) string {
	if repo.FullName != "" {
		return repo.FullName
	}
	return repo.ProviderID
}
