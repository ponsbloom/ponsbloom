package auth

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log/slog"
	"math/big"
	"strings"
	"sync"
	"time"

	decdsa "github.com/decred/dcrd/dcrec/secp256k1/v4/ecdsa"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/sha3"

	"github.com/ponsbloom/coordinator/internal/store"
)

// WalletAuth authenticates users by EVM wallet signature (EIP-191
// personal_sign). This replaces Privy on EVM chains (Robinhood Chain):
// the client requests a nonce, signs a challenge message, and the
// coordinator verifies the secp256k1 signature recovers to that address
// and issues a signed JWT session token.
//
// Signature verification is pure-Go (decred secp256k1): recover the pubkey
// for each candidate recovery id, keccak-style hash is done here with a
// vendored golang.org/x/crypto/sha3 — no cgo, no geth dependency.
type WalletAuth struct {
	mu      sync.Mutex
	nonces  map[string]nonceEntry // nonce -> entry
	jwtKey  []byte
	logger  *slog.Logger
	store   store.Store
	TokenTTL time.Duration
}

type nonceEntry struct {
	address   string
	createdAt time.Time
}

// NewWalletAuth creates the wallet auth service. jwtKey signs session
// tokens; pass nil to auto-generate an ephemeral key (dev only — sessions
// die on restart).
func NewWalletAuth(st store.Store, jwtKey []byte, logger *slog.Logger) *WalletAuth {
	if jwtKey == nil {
		jwtKey = make([]byte, 32)
		if _, err := rand.Read(jwtKey); err != nil {
			panic("walletauth: cannot generate jwt key: " + err.Error())
		}
	}
	wa := &WalletAuth{
		nonces:   map[string]nonceEntry{},
		jwtKey:   jwtKey,
		logger:   logger,
		store:    st,
		TokenTTL: 7 * 24 * time.Hour,
	}
	go wa.gcLoop()
	return wa
}

// gcLoop prunes expired nonces periodically.
func (w *WalletAuth) gcLoop() {
	t := time.NewTicker(10 * time.Minute)
	for range t.C {
		w.mu.Lock()
		cut := time.Now().Add(-10 * time.Minute)
		for k, v := range w.nonces {
			if v.createdAt.Before(cut) {
				delete(w.nonces, k)
			}
		}
		w.mu.Unlock()
	}
}

// BuildChallengeMessage returns the exact string a client must sign.
// The nonce/timestamp binding prevents replay across sessions.
func BuildChallengeMessage(address string, nonce string, issuedAt time.Time) string {
	return fmt.Sprintf("Ponsbloom wants you to sign in with your EVM account: %s\n\nNonce: %s\nIssued At: %s\n\nThis request will not cost any gas.",
		address, nonce, issuedAt.UTC().Format(time.RFC3339))
}

// NonceTTL is how long a challenge stays valid.
const NonceTTL = 5 * time.Minute

// GetNonce issues a single-use nonce bound to a lowercased address.
func (w *WalletAuth) GetNonce(address string) (nonce string, issuedAt time.Time, err error) {
	addr, err := NormalizeEVMAddress(address)
	if err != nil {
		return "", time.Time{}, err
	}
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", time.Time{}, fmt.Errorf("rand: %w", err)
	}
	nonce = hex.EncodeToString(b)
	issuedAt = time.Now().UTC()

	w.mu.Lock()
	defer w.mu.Unlock()
	// Cap nonce map size defensively (one entry per in-flight login).
	if len(w.nonces) > 100_000 {
		w.mu.Unlock()
		return "", time.Time{}, fmt.Errorf("too many pending challenges")
	}
	w.nonces[nonce] = nonceEntry{address: addr, createdAt: issuedAt}
	return nonce, issuedAt, nil
}

// Verify checks the signature over the challenge for address, consumes the
// nonce, and returns a session JWT. On first login the user row is created.
func (w *WalletAuth) Verify(address, nonce, signature string) (user *store.User, token string, err error) {
	addr, err := NormalizeEVMAddress(address)
	if err != nil {
		return nil, "", err
	}

	w.mu.Lock()
	entry, ok := w.nonces[nonce]
	if ok {
		delete(w.nonces, nonce) // single-use regardless of outcome
	}
	w.mu.Unlock()
	if !ok {
		return nil, "", fmt.Errorf("unknown or expired nonce")
	}
	if entry.address != addr {
		return nil, "", fmt.Errorf("nonce not bound to this address")
	}
	if time.Since(entry.createdAt) > NonceTTL {
		return nil, "", fmt.Errorf("nonce expired")
	}

	// Signature must recover to the claimed address.
	if !VerifyPersonalSignature(addr, BuildChallengeMessage(addr, nonce, entry.createdAt), signature) {
		return nil, "", fmt.Errorf("invalid signature")
	}

	// Resolve or create the user keyed on the wallet address.
	user, err = w.store.GetUserByWalletAddress(addr)
	if err != nil {
		did := "did:evm:" + addr
		if existing, err2 := w.store.GetUserByPrivyID(did); err2 == nil {
			user = existing
		} else {
			user = &store.User{
				AccountID:        uuid.New().String(),
				PrivyUserID:      did,
				EVMWalletAddress: addr,
			}
			if cerr := w.store.CreateUser(user); cerr != nil {
				// Race: another login created it first.
				user, err = w.store.GetUserByWalletAddress(addr)
				if err != nil {
					return nil, "", fmt.Errorf("wallet user race lost: %w", err)
				}
			} else if w.logger != nil {
				w.logger.Info("walletauth: created user", "account_id", user.AccountID, "address", addr)
			}
		}
	}

	token, err = w.SignToken(user.AccountID, addr)
	if err != nil {
		return nil, "", err
	}
	return user, token, nil
}

// SignToken mints a session JWT for an authenticated wallet account.
func (w *WalletAuth) SignToken(accountID, address string) (string, error) {
	claims := jwt.MapClaims{
		"sub":    accountID,
		"evm":    strings.ToLower(address),
		"iat":    time.Now().Unix(),
		"exp":    time.Now().Add(w.TokenTTL).Unix(),
		"jti":    uuid.New().String(),
		"iss":    "ponsbloom-wallet-auth",
	}
	tok, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(w.jwtKey)
	if err != nil {
		return "", fmt.Errorf("sign token: %w", err)
	}
	return tok, nil
}

// VerifyToken validates a session JWT and returns the account ID.
func (w *WalletAuth) VerifyToken(tokenStr string) (accountID string, err error) {
	tok, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
		}
		return w.jwtKey, nil
	})
	if err != nil || !tok.Valid {
		return "", fmt.Errorf("invalid session token")
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("bad claims")
	}
	sub, _ := claims["sub"].(string)
	if sub == "" {
		return "", fmt.Errorf("missing sub")
	}
	return sub, nil
}

// ── EVM address / signature primitives (no cgo) ──────────────────────

// keccak256 via legacy Keccak (sha3.NewLegacyKeccak256 is exactly keccak256).
func keccak256(data ...[]byte) []byte {
	h := sha3.NewLegacyKeccak256()
	for _, d := range data {
		h.Write(d)
	}
	return h.Sum(nil)
}

// NormalizeEVMAddress validates and lowercases a hex address.
func NormalizeEVMAddress(addr string) (string, error) {
	addr = strings.TrimSpace(addr)
	if !strings.HasPrefix(addr, "0x") && !strings.HasPrefix(addr, "0X") {
		return "", fmt.Errorf("address must start with 0x")
	}
	hexStr := addr[2:]
	if len(hexStr) != 40 {
		return "", fmt.Errorf("address must be 20 bytes")
	}
	if _, err := hex.DecodeString(hexStr); err != nil {
		return "", fmt.Errorf("address not hex: %w", err)
	}
	return "0x" + strings.ToLower(hexStr), nil
}

// ethMessageHash computes keccak256("\x19Ethereum Signed Message:\n" + len + msg).
func ethMessageHash(message string) []byte {
	prefix := fmt.Sprintf("\x19Ethereum Signed Message:\n%d", len(message))
	return keccak256([]byte(prefix), []byte(message))
}

// VerifyPersonalSignature checks that sig (0x + 65B r||s||v, v in {0,1,27,28})
// over message recovers to address. Fails closed on any malformed input.
func VerifyPersonalSignature(address, message, signature string) bool {
	sigBytes, err := decodeHexSig(signature)
	if err != nil || len(sigBytes) != 65 {
		return false
	}
	v := sigBytes[64]
	if v >= 27 {
		v -= 27
	}
	if v > 1 {
		return false
	}
	// Canonical-s check (BIP-62) to reject malleated signatures.
	sHi := new(big.Int).SetBytes(sigBytes[32:64])
	n, _ := new(big.Int).SetString("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141", 16)
	halfN := new(big.Int).Rsh(n, 1)
	if sHi.Sign() == 0 || sHi.Cmp(halfN) > 0 {
		return false
	}
	rInt := new(big.Int).SetBytes(sigBytes[0:32])
	if rInt.Sign() == 0 || rInt.Cmp(n) >= 0 {
		return false
	}

	hash := ethMessageHash(message)
	// decred compact format: [recid+27] || r || s
	compact := make([]byte, 65)
	compact[0] = 27 + v
	copy(compact[1:], sigBytes[0:32])
	copy(compact[33:], sigBytes[32:64])

	pub, _, err := decdsa.RecoverCompact(compact, hash)
	if err != nil || pub == nil {
		return false
	}
	uncompressed := pub.SerializeUncompressed() // 0x04 || X || Y
	if len(uncompressed) != 65 {
		return false
	}
	recovered := "0x" + hex.EncodeToString(keccak256(uncompressed[1:])[12:])
	return recovered == strings.ToLower(address)
}

func decodeHexSig(sig string) ([]byte, error) {
	sig = strings.TrimPrefix(sig, "0x")
	return hex.DecodeString(sig)
}
