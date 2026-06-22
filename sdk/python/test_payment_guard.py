import json
import unittest

from payment_guard import PaymentGuardClient


class PaymentGuardClientTest(unittest.TestCase):
    def test_evaluate_uses_paid_transport_and_credentials(self):
        captured = {}

        def paid_transport(url, body):
            captured["url"] = url
            captured["body"] = json.loads(body)
            return {"decision": "ALLOW"}

        client = PaymentGuardClient(
            "https://guard.example/",
            paid_transport,
            profile_id="profile-1",
            agent_token="agent-secret",
        )
        result = client.evaluate(
            url="https://merchant.example/data",
            session_id="session-1",
            request_id="request-1",
        )

        self.assertEqual(result["decision"], "ALLOW")
        self.assertEqual(
            captured["url"],
            "https://guard.example/v1/x402/payment-guard/evaluate",
        )
        self.assertEqual(captured["body"]["profile_id"], "profile-1")
        self.assertEqual(captured["body"]["agent_token"], "agent-secret")


if __name__ == "__main__":
    unittest.main()
