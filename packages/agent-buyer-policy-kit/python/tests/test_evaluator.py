import unittest

from signgate_agent_buyer_policy_kit import evaluate_agent_buyer_preflight


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


if __name__ == "__main__":
    unittest.main()
