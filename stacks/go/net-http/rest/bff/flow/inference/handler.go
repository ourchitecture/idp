package inference

import (
	"encoding/json"
	"idp-go-net-http-rest/bff/flow"
	"net/http"
	"strings"
	"time"
)

type Handler struct {
	engine *Engine
}

type listResponse struct {
	GeneratedAt string               `json:"generatedAt"`
	Filters     map[string]string    `json:"filters"`
	Total       int                  `json:"total"`
	Insights    []FlowInsightSummary `json:"insights"`
}

type detailResponse struct {
	GeneratedAt string            `json:"generatedAt"`
	Insight     FlowInsightDetail `json:"insight"`
}

func NewHandler() *Handler {
	return &Handler{
		engine: NewEngine(),
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.handleList(w, r)
	case http.MethodPost:
		h.handleInfer(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *Handler) handleList(w http.ResponseWriter, r *http.Request) {
	filters := InsightFilters{
		Provider: r.URL.Query().Get("provider"),
		Repo:     r.URL.Query().Get("repo"),
		Team:     r.URL.Query().Get("team"),
		Service:  r.URL.Query().Get("service"),
		Actor:    r.URL.Query().Get("actor"),
	}
	if audience := r.URL.Query().Get("audience"); audience != "" {
		filters.Audience = InsightAudience(audience)
	}

	insights := ListFlowInsights(filters)
	appliedFilters := map[string]string{}
	for key, value := range map[string]string{
		"provider": filters.Provider,
		"repo":     filters.Repo,
		"team":     filters.Team,
		"service":  filters.Service,
		"actor":    filters.Actor,
		"audience": string(filters.Audience),
	} {
		if value != "" {
			appliedFilters[key] = value
		}
	}

	payload := listResponse{
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Filters:     appliedFilters,
		Total:       len(insights),
		Insights:    insights,
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(payload)
}

func (h *Handler) handleInfer(w http.ResponseWriter, r *http.Request) {
	var input flow.ProviderAdapterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid_provider_adapter_input", http.StatusBadRequest)
		return
	}

	result := h.engine.Infer(input, &Context{Now: time.Now().UTC()})
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(result)
}

type DetailHandler struct{}

func NewDetailHandler() *DetailHandler {
	return &DetailHandler{}
}

func (h *DetailHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/api/flow/insights/")
	if path == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	audience := InsightAudience(r.URL.Query().Get("audience"))
	insight, ok := FindFlowInsightDetail(path, audience)
	if !ok {
		http.Error(w, "insight_not_found", http.StatusNotFound)
		return
	}

	payload := detailResponse{
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Insight:     insight,
	}

	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(payload)
}
