package main

import (
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
)

const defaultPort = 3000
const defaultHost = "127.0.0.1"

type startupLog struct {
	Level string `json:"level"`
	Msg   string `json:"msg"`
	Host  string `json:"host"`
	Port  int    `json:"port"`
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
	if port, ok := parsePort(os.Getenv("OUR_IDP_PORT")); ok {
		return port
	}

	if port, ok := parsePort(os.Getenv("PORT")); ok {
		return port
	}

	return defaultPort
}

func resolveHost() string {
	host := strings.TrimSpace(os.Getenv("OUR_IDP_WEB_HOST"))
	if host == "" {
		return defaultHost
	}

	return host
}

func handleRoot(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("IDP web server is running.\n"))
}

func main() {
	host := resolveHost()
	port := resolvePort()
	addr := net.JoinHostPort(host, strconv.Itoa(port))

	mux := http.NewServeMux()
	mux.HandleFunc("/", handleRoot)

	logger := log.New(os.Stdout, "", 0)
	payload, err := json.Marshal(startupLog{
		Level: "info",
		Msg:   "IDP web server listening",
		Host:  host,
		Port:  port,
	})
	if err != nil {
		log.Fatalf("failed to marshal startup log: %v", err)
	}

	listener, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatalf("failed to bind IDP web server: %v", err)
	}

	logger.Print(string(payload))

	server := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
		log.Fatalf("failed to start IDP web server: %v", err)
	}
}
