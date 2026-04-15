package inference

import (
	"encoding/json"
	"idp-go-net-http-rest/bff/flow"
	"net/http"
	"time"
)

type Handler struct {
	engine *Engine
}

func NewHandler() *Handler {
	return &Handler{
		engine: NewEngine(),
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	var input flow.ProviderAdapterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		http.Error(w, "invalid_provider_adapter_input", http.StatusBadRequest)
		return
	}

	result := h.engine.Infer(input, &Context{Now: time.Now().UTC()})
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_ = json.NewEncoder(w).Encode(result)
}
