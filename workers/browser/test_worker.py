import asyncio
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("browser_worker", Path(__file__).with_name("worker.py"))
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class WorkerSecurity(unittest.TestCase):
    def test_only_operator_authorized_origins(self):
        with self.assertRaises(ValueError):
            worker.validate_job({"target": "https://evil.example/api/public/demo/site", "test_type": "availability"}, {"https://demo.example"})

    def test_demo_only_not_arbitrary_site_or_code(self):
        for job in [
            {"target": "https://demo.example/admin", "test_type": "availability"},
            {"target": "https://demo.example/api/public/demo/site", "test_type": "shell"},
            {"target": "https://demo.example/api/public/demo/site", "test_type": "availability", "code": "run_me"},
        ]:
            with self.assertRaises(ValueError):
                worker.validate_job(job, {"https://demo.example"})

    def test_private_network_blocked(self):
        with self.assertRaises(ValueError):
            asyncio.run(worker.vetted_addresses("127.0.0.1", 8080))

    def test_fixture_login_only(self):
        with self.assertRaises(ValueError):
            worker.validate_job({"target": "https://demo.example/api/public/demo/site", "test_type": "login_flow", "login": {"path": "/api/public/demo/site/login", "user": "real-user", "pass": "not-fixture"}}, {"https://demo.example"})


if __name__ == "__main__":
    unittest.main()