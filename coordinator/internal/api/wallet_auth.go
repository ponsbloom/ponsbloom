package api

import (
	"encoding/json"
	"net/http"
	"regexp"
	"strings"

	"github.com/ponsbloom/coordinator/internal/auth"
)


// Wallet sign-in endpoints: /v1/auth/wallet/nonce + /v1/auth/wallet/verify.
// Browser flow: connect EVM wallet → POST nonce for the address →
// personal_sign the challenge → POST verify → receive a session JWT used as
// Authorization: Bearer *** on all authenticated consumer endpoints.

var walletAddrRe = regexp.MustCompile(`^0x[0-9a-fA-F]{40}$`)

// SetWalletAuth wires the wallet authenticator into the server.
func (s *Server) SetWalletAuth(wa *auth.WalletAuth) {
	s.walletAuth = wa
}

// handleWalletNonce issues a one-time challenge bound to an EVM address.
func (s *Server) handleWalletNonce(w http.ResponseWriter, r *http.Request) {
	if s.walletAuth == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse("auth_unavailable", "wallet sign-in is not configured"))
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse("method_not_allowed", "POST required"))
		return
	}
	var body struct {
		Address string `json:"address"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || !walletAddrRe.MatchString(strings.TrimSpace(body.Address)) {
		writeJSON(w, http.StatusBadRequest, errorResponse("invalid_address", "address must be a 0x-prefixed 40-hex-char EVM address"))
		return
	}
	nonce, issuedAt, err := s.walletAuth.GetNonce(strings.TrimSpace(body.Address))
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, errorResponse("challenge_failed", "failed to issue sign-in challenge"))
		return
	}
	message := auth.BuildChallengeMessage(strings.ToLower(strings.TrimSpace(body.Address)), nonce, issuedAt)
	writeJSON(w, http.StatusOK, map[string]string{
		"nonce":       nonce,
		"message":     message,
		"expires_in":  "300",
		"chain_id":    "4663",
		"verify_path": "/v1/auth/wallet/verify",
	})
}

// handleWalletVerify validates the personal_sign signature and mints a session JWT.
func (s *Server) handleWalletVerify(w http.ResponseWriter, r *http.Request) {
	if s.walletAuth == nil {
		writeJSON(w, http.StatusServiceUnavailable, errorResponse("auth_unavailable", "wallet sign-in is not configured"))
		return
	}
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, errorResponse("method_not_allowed", "POST required"))
		return
	}
	var body struct {
		Address   string `json:"address"`
		Nonce     string `json:"nonce"`
		Signature string `json:"signature"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse("invalid_request", "malformed JSON body"))
		return
	}
	user, token, err := s.walletAuth.Verify(strings.TrimSpace(body.Address), body.Nonce, body.Signature)
	if err != nil {
		s.logger.Warn("wallet sign-in rejected", "address", body.Address, "error", err)
		writeJSON(w, http.StatusUnauthorized, errorResponse("verification_failed", err.Error()))
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"token":      token,
		"account_id": user.AccountID,
		"address":    user.EVMWalletAddress,
		"expires_in": int(s.walletAuth.TokenTTL.Seconds()),
	})
}
