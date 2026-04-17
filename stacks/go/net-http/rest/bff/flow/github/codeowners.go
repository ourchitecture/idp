package github

import "strings"

type CodeownersEntry struct {
	Pattern string
	Owners  []string
}

func ParseCodeowners(content string) []CodeownersEntry {
	entries := []CodeownersEntry{}
	for _, raw := range strings.Split(strings.ReplaceAll(content, "\r\n", "\n"), "\n") {
		line := strings.TrimSpace(raw)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}
		entries = append(entries, CodeownersEntry{
			Pattern: parts[0],
			Owners:  parts[1:],
		})
	}
	return entries
}
