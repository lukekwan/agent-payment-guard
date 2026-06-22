import json
import uuid
from urllib.request import Request, urlopen


class PaymentGuardClient:
    def __init__(
        self,
        base_url,
        paid_transport,
        profile_id=None,
        agent_token=None,
        owner_token=None,
    ):
        self.base_url = base_url.rstrip("/")
        self.paid_transport = paid_transport
        self.profile_id = profile_id
        self.agent_token = agent_token
        self.owner_token = owner_token

    def _post(self, path, body, paid=False):
        encoded = json.dumps(body).encode()
        if paid:
            return self.paid_transport(self.base_url + path, encoded)
        request = Request(
            self.base_url + path,
            data=encoded,
            headers={"content-type": "application/json"},
            method="POST",
        )
        with urlopen(request) as response:
            return json.load(response)

    def evaluate(self, **input_data):
        if self.profile_id:
            input_data["profile_id"] = self.profile_id
        if self.agent_token:
            input_data["agent_token"] = self.agent_token
        return self._post(
            "/v1/x402/payment-guard/evaluate", input_data, paid=True
        )

    def status(self):
        return self._post(
            "/v1/payment-guard/status",
            {
                "profile_id": self.profile_id,
                "owner_token": self.owner_token,
            },
        )

    def approve(self, request_id, action, note=None):
        return self._post(
            "/v1/payment-guard/approvals",
            {
                "profile_id": self.profile_id,
                "owner_token": self.owner_token,
                "request_id": request_id,
                "action": action,
                "note": note,
            },
        )

    def guarded_request(
        self, merchant_transport, url, session_id="default", **policy
    ):
        decision = self.evaluate(
            url=url,
            session_id=session_id,
            request_id=policy.pop("request_id", str(uuid.uuid4())),
            **policy,
        )
        if decision["decision"] != "ALLOW":
            raise RuntimeError(
                f"Payment Guard decision: {decision['decision']}", decision
            )
        return merchant_transport(url)
