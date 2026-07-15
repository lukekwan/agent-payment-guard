import unittest

from signgate_agent_buyer_policy_kit import (
    evaluate_agent_buyer_preflight,
    evaluate_agentic_commerce_preflight,
)


BASE_COMMERCE_INPUT = {
    "evaluated_at": "2026-07-15T00:00:00.000Z",
    "buyer_id": "buyer.acme",
    "agent_id": "agent.finance.001",
    "agent_role": "finance_agent",
    "product_category": "invoice_verification",
    "amount_usdc": "0.25",
    "asset": "USDC",
    "chain": "base",
    "merchant_domain": "pay.vendor.example",
    "merchant_wallet": "0xabc0000000000000000000000000000000000001",
    "mandate": {
        "id": "mandate-001",
        "type": "checkout",
        "status": "active",
        "buyer_id": "buyer.acme",
        "agent_id": "agent.finance.001",
        "agent_role": "finance_agent",
        "merchant_domains": ["pay.vendor.example"],
        "merchant_wallets": ["0xabc0000000000000000000000000000000000001"],
        "allowed_categories": ["invoice_verification"],
        "max_amount_usdc": "1.00",
        "assets": ["USDC"],
        "chains": ["base"],
        "expires_at": "2099-01-01T00:00:00.000Z",
    },
    "merchant": {
        "domain": "pay.vendor.example",
        "wallet": "0xabc0000000000000000000000000000000000001",
        "expected_wallet": "0xabc0000000000000000000000000000000000001",
        "openapi_domain": "pay.vendor.example",
        "agent_card_domain": "pay.vendor.example",
        "category": "invoice_verification",
        "kyt_risk": "low",
    },
}


class AgentBuyerPolicyKitTests(unittest.TestCase):
    def test_expected_role_product_decisions(self):
        cases = [
            ("research_agent", "wallet_risk", "ALLOW"),
            ("writer_agent", "wallet_risk", "APPROVAL_REQUIRED"),
            ("accounting_agent", "market_intelligence", "DENY"),
            ("accounting_agent", "invoice_verification", "ALLOW"),
            ("finance_agent", "payment_execution", "APPROVAL_REQUIRED"),
            ("operator_agent", "api_security", "ALLOW"),
        ]
        for role, category, expected in cases:
            with self.subTest(role=role, category=category):
                result = evaluate_agent_buyer_preflight(
                    {
                        "agent_role": role,
                        "product_category": category,
                        "price_usdc": "0.005",
                    }
                )
                self.assertEqual(result["decision"], expected)

    def test_unknown_inactive_restricted_and_over_limit(self):
        self.assertEqual(
            evaluate_agent_buyer_preflight(
                {"agent_role": "unknown_agent", "product_category": "wallet_risk"}
            )["decision"],
            "DENY",
        )
        self.assertEqual(
            evaluate_agent_buyer_preflight(
                {
                    "agent_role": "research_agent",
                    "agent_status": "disabled",
                    "product_category": "wallet_risk",
                }
            )["decision"],
            "DENY",
        )
        self.assertEqual(
            evaluate_agent_buyer_preflight(
                {
                    "agent_role": "research_agent",
                    "product_category": "wallet_risk",
                    "data_sensitivity": "restricted",
                }
            )["decision"],
            "DENY",
        )
        result = evaluate_agent_buyer_preflight(
            {
                "agent_role": "operator_agent",
                "product_category": "api_security",
                "price_usdc": "2.00",
            }
        )
        self.assertEqual(result["decision"], "APPROVAL_REQUIRED")
        self.assertIn("PRICE_EXCEEDS_ROLE_LIMIT", result["reason_codes"])

    def test_agentic_commerce_allows_scoped_checkout_mandate(self):
        result = evaluate_agentic_commerce_preflight(BASE_COMMERCE_INPUT)
        self.assertEqual(result["schema_version"], "agentic_commerce_preflight_result.v1")
        self.assertEqual(result["response_kind"], "decision_response")
        self.assertEqual(result["decision"], "ALLOW")
        self.assertFalse(result["signer_directive"]["required"])
        self.assertFalse(result["signer_directive"]["agent_may_directly_sign"])
        self.assertTrue(result["signer_directive"]["execution_may_be_agent_initiated"])
        self.assertFalse(result["decision_artifact"]["issued"])
        self.assertEqual(result["reason_codes"], ["ROLE_PRODUCT_CATEGORY_ALLOWED"])

    def test_agentic_commerce_denies_missing_mandate(self):
        result = evaluate_agentic_commerce_preflight(
            {**BASE_COMMERCE_INPUT, "mandate": None}
        )
        self.assertEqual(result["decision"], "DENY")
        self.assertIn("MANDATE_MISSING", result["reason_codes"])

    def test_agentic_commerce_denies_mandate_role_mismatch(self):
        result = evaluate_agentic_commerce_preflight(
            {
                **BASE_COMMERCE_INPUT,
                "mandate": {
                    **BASE_COMMERCE_INPUT["mandate"],
                    "agent_role": "research_agent",
                },
            }
        )
        self.assertEqual(result["decision"], "DENY")
        self.assertIn("MANDATE_ROLE_MISMATCH", result["reason_codes"])

    def test_agentic_commerce_denies_merchant_wallet_mismatch(self):
        result = evaluate_agentic_commerce_preflight(
            {
                **BASE_COMMERCE_INPUT,
                "merchant": {
                    **BASE_COMMERCE_INPUT["merchant"],
                    "expected_wallet": "0xdef0000000000000000000000000000000000002",
                },
            }
        )
        self.assertEqual(result["decision"], "DENY")
        self.assertIn("MERCHANT_WALLET_MISMATCH", result["reason_codes"])

    def test_agentic_commerce_payment_execution_requires_out_of_agent_signer(self):
        result = evaluate_agentic_commerce_preflight(
            {
                **BASE_COMMERCE_INPUT,
                "product_category": "payment_execution",
                "mandate": {
                    **BASE_COMMERCE_INPUT["mandate"],
                    "type": "payment",
                    "allowed_categories": ["payment_execution"],
                },
                "merchant": {
                    **BASE_COMMERCE_INPUT["merchant"],
                    "category": "payment_execution",
                },
            }
        )
        self.assertEqual(result["decision"], "REQUIRE_APPROVAL")
        self.assertTrue(result["signer_directive"]["required"])
        self.assertFalse(result["signer_directive"]["agent_may_directly_sign"])
        self.assertTrue(result["signer_directive"]["execution_may_be_agent_initiated"])
        self.assertEqual(
            result["signer_directive"]["required_signer"]["allowed_classes"],
            ["human_fido2", "hsm", "kms", "custody", "smart_account_module"],
        )
        self.assertIn(
            "PAYMENT_EXECUTION_REQUIRES_OUT_OF_AGENT_SIGNER",
            result["reason_codes"],
        )


if __name__ == "__main__":
    unittest.main()
