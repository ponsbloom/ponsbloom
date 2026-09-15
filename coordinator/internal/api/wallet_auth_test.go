package api

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/decred/dcrd/dcrec/secp256k1/v4"
	"github.com/decred/dcrd/dcrec/secp256k1/v4/ecdsa"
	"golang.org/x/crypto/sha3"

	"github.com/ponsbloom/coordinator/internal/auth"
	"github.com/ponsbloom/coordinator/internal/registry"
	"github.com/ponsbloom/coordinator/internal/store"
)

// testPK is a fixed private key; the matching address is derived below.
var testPK, _ = hex.DecodeString("4c0883a69102937d6231471b5dbb6204fe51296da546739425c4b1d5d8c6b2c1")

func testAddress(t *testing.T) string {
	t.Helper()
	pk := secp256k1.PrivKeyFromBytes(testPK)
	pub := pk.PubKey().SerializeUncompressed()[1:] // drop 0x04 prefix
	h := sha3.NewLegacyKeccak256()
	h.Write(pub)
	sum := h.Sum(nil)
	return "0x" + hex.EncodeToString(sum[12:])
}

// signChallenge signs message exactly like a browser wallet's personal_sign.
func signChallenge(t *testing.T, message string) string {
	t.Helper()
	prefix := "\x19Ethereum Signed Message:\n" + itoa(len(message)) + message
	h := sha3.NewLegacyKeccak256()
	h.Write([]byte(prefix))
	digest := h.Sum(nil)
	pk := secp256k1.PrivKeyFromBytes(testPK)
	compact := ecdsa.SignCompact(pk, digest, false) // [ recovery+27 | R | S ]
	// Canonical EIP-191 layout the server expects: R || S || V, V in {0,1}+27.
	out := make([]byte, 65)
	copy(out[0:32], compact[1:33])  // R
	copy(out[32:64], compact[33:65]) // S
	out[64] = compact[0]             // already recovery+27
	return "0x" + hex.EncodeToString(out)
}

func itoa(n int) string { return strconv.Itoa(n) }

func newTestServer(t *testing.T) (*Server, func()) {
	t.Helper()
	st := store.NewMemory("test-admin-key")
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	reg := registry.New(logger)
	srv := NewServer(reg, st, logger)
	srv.SetAdminKey("test-admin-key")
	srv.SetWalletAuth(auth.NewWalletAuth(st, []byte("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"), logger))
	return srv, func() {}
}

// TestWalletSignInEndToEnd drives the full browser flow: nonce → sign →
// verify → use the JWT on an authenticated endpoint.
func TestWalletSignInEndToEnd(t *testing.T) {
	srv, cleanup := newTestServer(t)
	defer cleanup()
	ts := httptest.NewServer(srv.Handler())
	defer ts.Close()

	addr := testAddress(t)

	// 1. request a challenge
	resp, err := http.Post(ts.URL+"/v1/auth/wallet/nonce", "application/json",
		jsonBody(map[string]string{"address": addr}))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		t.Fatalf("nonce: %d %s", resp.StatusCode, b)
	}
	var ch struct {
		Nonce   string `json:"nonce"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&ch); err != nil {
		t.Fatal(err)
	}
	if ch.Nonce == "" || !bytes.Contains([]byte(ch.Message), []byte(ch.Nonce)) {
		t.Fatalf("bad challenge payload: %+v", ch)
	}

	// 2. sign like MetaMask personal_sign and verify
	resp2, err := http.Post(ts.URL+"/v1/auth/wallet/verify", "application/json",
		jsonBody(map[string]string{"address": addr, "nonce": ch.Nonce, "signature": signChallenge(t, ch.Message)}))
	if err != nil {
		t.Fatal(err)
	}
	defer resp2.Body.Close()
	if resp2.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp2.Body)
		t.Fatalf("verify: %d %s", resp2.StatusCode, b)
	}
	var vr struct {
		Token     string `json:"token"`
		AccountID string `json:"account_id"`
		ExpiresIn int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp2.Body).Decode(&vr); err != nil {
		t.Fatal(err)
	}
	if vr.Token == "" || vr.AccountID == "" || vr.ExpiresIn <= 0 {
		t.Fatalf("bad verify response: %+v", vr)
	}

	// 3. nonce is single-use — replay must fail
	respR, err := http.Post(ts.URL+"/v1/auth/wallet/verify", "application/json",
		jsonBody(map[string]string{"address": addr, "nonce": ch.Nonce, "signature": signChallenge(t, ch.Message)}))
	if err != nil {
		t.Fatal(err)
	}
	defer respR.Body.Close()
	if respR.StatusCode != http.StatusUnauthorized {
		t.Fatalf("nonce replay accepted: %d", respR.StatusCode)
	}

	// 4. JWT works on an authenticated endpoint
	req, _ := http.NewRequest("GET", ts.URL+"/v1/payments/balance", nil)
	req.Header.Set("Authorization", "Bearer "+vr.Token)
	resp3, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp3.Body.Close()
	if resp3.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp3.Body)
		t.Fatalf("authed endpoint: %d %s", resp3.StatusCode, b)
	}

	// 5. same wallet logs in again → same account (idempotent identity)
	time.Sleep(10 * time.Millisecond)
	resp4, err := http.Post(ts.URL+"/v1/auth/wallet/nonce", "application/json",
		jsonBody(map[string]string{"address": addr}))
	if err != nil {
		t.Fatal(err)
	}
	defer resp4.Body.Close()
	var ch2 struct {
		Nonce   string `json:"nonce"`
		Message string `json:"message"`
	}
	json.NewDecoder(resp4.Body).Decode(&ch2)
	resp5, err := http.Post(ts.URL+"/v1/auth/wallet/verify", "application/json",
		jsonBody(map[string]string{"address": addr, "nonce": ch2.Nonce, "signature": signChallenge(t, ch2.Message)}))
	if err != nil {
		t.Fatal(err)
	}
	defer resp5.Body.Close()
	var vr2 struct {
		AccountID string `json:"account_id"`
	}
	json.NewDecoder(resp5.Body).Decode(&vr2)
	if vr2.AccountID != vr.AccountID {
		t.Fatalf("re-login created new account: %s != %s", vr2.AccountID, vr.AccountID)
	}

	// 6. bad signature → 401
	resp6, err := http.Post(ts.URL+"/v1/auth/wallet/verify", "application/json",
		jsonBody(map[string]string{"address": addr, "nonce": "deadbeef", "signature": "0x" + hex.EncodeToString(bytes.Repeat([]byte{1}, 65))}))
	if err != nil {
		t.Fatal(err)
	}
	defer resp6.Body.Close()
	if resp6.StatusCode != http.StatusUnauthorized {
		t.Fatalf("garbage sig: %d", resp6.StatusCode)
	}
}

func jsonBody(v any) io.Reader {
	b, _ := json.Marshal(v)
	return bytes.NewReader(b)
}
