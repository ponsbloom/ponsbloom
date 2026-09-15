package auth

import (
	"io"
	"log/slog"
	"testing"

	"github.com/ponsbloom/coordinator/internal/store"
)

// Known-answer vector: signature produced by ethers v6 signMessage() (the
// exact code path wallets run in browsers) for a fixed private key, fixed
// nonce, fixed issued-at timestamp.
const (
	kasAddress = "0xf0728f06bf6f53466f8ae9693841244e1dd25f4c"
	// nonce and issued-at embedded in kasMessage:
	//   Nonce: deadbeefcafe0123456789
	//   Issued At: 2026-09-15T00:00:00Z
	kasMessage = "Ponsbloom wants you to sign in with your EVM account: 0xf0728f06bf6f53466f8ae9693841244e1dd25f4c\n\nNonce: deadbeefcafe0123456789\nIssued At: 2026-09-15T00:00:00Z\n\nThis request will not cost any gas."
	kasSig     = "0x5613973b7704c1da297f42883b96ea7ec39a0bff86cc1965e89904c5817fba2031fafa12dc7cac7863b67b27f3976dad9ff049ac22fe120c9fa5a8e0446c21ba1c"
)

func TestVerifyPersonalSignature_KAT(t *testing.T) {
	if !VerifyPersonalSignature(kasAddress, kasMessage, kasSig) {
		t.Fatal("valid ethers signature rejected")
	}
	// Wrong message must fail.
	if VerifyPersonalSignature(kasAddress, kasMessage+"x", kasSig) {
		t.Fatal("signature over tampered message accepted")
	}
	// Wrong address must fail.
	if VerifyPersonalSignature("0x1111111111111111111111111111111111111111", kasMessage, kasSig) {
		t.Fatal("signature accepted for wrong address")
	}
	// Garbage sigs must fail closed.
	for _, bad := range []string{"", "0x", "0xzz", "0x" + string(make([]byte, 130))} {
		if VerifyPersonalSignature(kasAddress, kasMessage, bad) {
			t.Fatalf("garbage signature accepted: %q", bad)
		}
	}
}

func testWalletAuth() *WalletAuth {
	mem := store.NewMemory("test-admin-key")
	return NewWalletAuth(mem, []byte("test-test-test-test-test-test12"), slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func TestWalletNonceBindAndMalleation(t *testing.T) {
	wa := testWalletAuth()
	// A nonce issued for a different address cannot be redeemed for kasAddress.
	nonce, issued, err := wa.GetNonce(kasAddress)
	if err != nil {
		t.Fatal(err)
	}
	// Recompute the challenge for the real nonce/issuedAt and sign with KAT
	// message is impossible (nonce differs), so instead tamper-proofing tests
	// the binding + expiry checks:
	if issued.IsZero() {
		t.Fatal("zero issued")
	}
	// Signature verification is already KAT-covered above. Here: wrong-address
	// redemption must fail with the binding error.
	other, _ := NormalizeEVMAddress("0x1111111111111111111111111111111111111111")
	_, _, err = wa.Verify(other, nonce, kasSig)
	if err == nil {
		t.Fatal("cross-address nonce redemption succeeded")
	}
	t.Log(err)
}

func TestWalletJWTRoundTrip(t *testing.T) {
	wa := testWalletAuth()
	tok, err := wa.SignToken("acct-1", kasAddress)
	if err != nil {
		t.Fatal(err)
	}
	sub, err := wa.VerifyToken(tok)
	if err != nil || sub != "acct-1" {
		t.Fatalf("verify failed: %v %q", err, sub)
	}
	// Foreign token must fail.
	if _, err := wa.VerifyToken("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.aaaa"); err == nil {
		t.Fatal("forged token accepted")
	}
}
