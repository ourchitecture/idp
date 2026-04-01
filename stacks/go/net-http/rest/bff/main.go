package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
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

func main() {
	host := resolveHost()
	port := resolvePort()
	addr := net.JoinHostPort(host, strconv.Itoa(port))

	mux := http.NewServeMux()
	mux.HandleFunc("/", handleRoot)
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/readiness", handleReadiness)

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
