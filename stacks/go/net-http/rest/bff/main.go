package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const defaultPort = 8000
const defaultHost = "127.0.0.1"

type startupLog struct {
	Level string `json:"level"`
	Msg   string `json:"msg"`
	Host  string `json:"host"`
	Port  int    `json:"port"`
}

type rootResponse struct {
	Status  string `json:"status"`
	Service string `json:"service"`
}

type checkEntry struct {
	ComponentType string `json:"componentType"`
	Status        string `json:"status"`
	Time          string `json:"time"`
}

type healthResponse struct {
	Status      string                  `json:"status"`
	ServiceID   string                  `json:"serviceId"`
	Description string                  `json:"description"`
	Checks      map[string][]checkEntry `json:"checks,omitempty"`
}

type readinessResponse struct {
	Status string                  `json:"status"`
	Checks map[string][]checkEntry `json:"checks"`
}

type statusMetrics struct {
	TotalComponents    int `json:"totalComponents"`
	HealthyComponents  int `json:"healthyComponents"`
	DegradedComponents int `json:"degradedComponents"`
}

type statusFreshness struct {
	MaxAgeSeconds int `json:"maxAgeSeconds"`
}

type statusComponent struct {
	ID         string `json:"id"`
	Label      string `json:"label"`
	Kind       string `json:"kind"`
	Status     string `json:"status"`
	LatencyMs  int64  `json:"latencyMs"`
	ObservedAt string `json:"observedAt"`
}

type statusSummaryResponse struct {
	GeneratedAt string            `json:"generatedAt"`
	Status      string            `json:"status"`
	Metrics     statusMetrics     `json:"metrics"`
	Freshness   statusFreshness   `json:"freshness"`
	Components  []statusComponent `json:"components"`
}

type healthEnvelope struct {
	Status string `json:"status"`
}

func parsePort(value string) (int, bool) {
	if value == "" {
		return 0, false
	}

	port, err := strconv.Atoi(value)
	if err != nil || port <= 0 {
		return 0, false
	}

	return port, true
}

func resolvePort() int {
	if port, ok := parsePort(os.Getenv("OUR_IDP_API_PORT")); ok {
		return port
	}

	return defaultPort
}

func resolveHost() string {
	host := strings.TrimSpace(os.Getenv("OUR_IDP_API_HOST"))
	if host == "" {
		return defaultHost
	}

	return host
}

func resolveStatusWebURL() string {
	return strings.TrimSpace(os.Getenv("OUR_IDP_STATUS_WEB_URL"))
}

func writeHealthJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/health+json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeJSON(w http.ResponseWriter, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(payload)
}

func handleRoot(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, rootResponse{
		Status:  "ok",
		Service: "idp-bff",
	})
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	now := time.Now().UTC().Format(time.RFC3339)
	writeHealthJSON(w, http.StatusOK, healthResponse{
		Status:      "pass",
		ServiceID:   "idp-bff",
		Description: "IDP BFF Server",
		Checks: map[string][]checkEntry{
			"bff:responseTime": {
				{
					ComponentType: "system",
					Status:        "pass",
					Time:          now,
				},
			},
			"routing:availability": {
				{
					ComponentType: "component",
					Status:        "pass",
					Time:          now,
				},
			},
		},
	})
}

func handleReadiness(w http.ResponseWriter, _ *http.Request) {
	now := time.Now().UTC().Format(time.RFC3339)
	writeHealthJSON(w, http.StatusOK, readinessResponse{
		Status: "pass",
		Checks: map[string][]checkEntry{
			"bff:ready": {
				{
					ComponentType: "system",
					Status:        "pass",
					Time:          now,
				},
			},
			"routing:ready": {
				{
					ComponentType: "component",
					Status:        "pass",
					Time:          now,
				},
			},
		},
	})
}

func createBFFStatusComponent(now time.Time) statusComponent {
	return statusComponent{
		ID:         "idp-bff",
		Label:      "IDP BFF",
		Kind:       "service",
		Status:     "healthy",
		LatencyMs:  0,
		ObservedAt: now.UTC().Format(time.RFC3339),
	}
}

func observeWebStatusComponent(base string) statusComponent {
	startedAt := time.Now()
	component := statusComponent{
		ID:     "idp-web",
		Label:  "IDP Web",
		Kind:   "service",
		Status: "degraded",
	}

	target, err := url.JoinPath(base, "/health")
	if err != nil {
		component.LatencyMs = time.Since(startedAt).Milliseconds()
		component.ObservedAt = time.Now().UTC().Format(time.RFC3339)
		return component
	}

	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(target)
	if err == nil {
		defer resp.Body.Close()

		var payload healthEnvelope
		if decodeErr := json.NewDecoder(resp.Body).Decode(&payload); decodeErr == nil &&
			resp.StatusCode >= 200 && resp.StatusCode < 300 &&
			payload.Status == "pass" {
			component.Status = "healthy"
		}
	}

	component.LatencyMs = time.Since(startedAt).Milliseconds()
	component.ObservedAt = time.Now().UTC().Format(time.RFC3339)

	return component
}

func buildStatusSummary() statusSummaryResponse {
	components := make([]statusComponent, 0, 2)

	if webURL := resolveStatusWebURL(); webURL != "" {
		components = append(components, observeWebStatusComponent(webURL))
	}

	components = append(components, createBFFStatusComponent(time.Now()))

	healthyComponents := 0
	degradedComponents := 0
	generatedAt := time.Now().UTC()
	maxAgeSeconds := 0

	for _, component := range components {
		if component.Status == "healthy" {
			healthyComponents++
		} else {
			degradedComponents++
		}

		observedAt, err := time.Parse(time.RFC3339, component.ObservedAt)
		if err == nil {
			ageSeconds := int(generatedAt.Sub(observedAt).Seconds())
			if ageSeconds < 0 {
				ageSeconds = 0
			}
			if ageSeconds > maxAgeSeconds {
				maxAgeSeconds = ageSeconds
			}
		}
	}

	status := "ok"
	if degradedComponents > 0 {
		status = "degraded"
	}

	return statusSummaryResponse{
		GeneratedAt: generatedAt.Format(time.RFC3339),
		Status:      status,
		Metrics: statusMetrics{
			TotalComponents:    len(components),
			HealthyComponents:  healthyComponents,
			DegradedComponents: degradedComponents,
		},
		Freshness: statusFreshness{
			MaxAgeSeconds: maxAgeSeconds,
		},
		Components: components,
	}
}

func handlePortalSummary(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, buildStatusSummary())
}

func main() {
	host := resolveHost()
	port := resolvePort()
	addr := net.JoinHostPort(host, strconv.Itoa(port))

	mux := http.NewServeMux()
	mux.HandleFunc("/", handleRoot)
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/readiness", handleReadiness)
	mux.HandleFunc("/api/portal/summary", handlePortalSummary)

	payload, err := json.Marshal(startupLog{
		Level: "info",
		Msg:   "IDP BFF listening",
		Host:  host,
		Port:  port,
	})
	if err != nil {
		log.Fatalf("failed to marshal startup log: %v", err)
	}

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("failed to bind IDP BFF server: %v", err)
	}

	log.Print(string(payload))

	server := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		log.Fatalf("failed to start IDP BFF server: %v", err)
	}
}
