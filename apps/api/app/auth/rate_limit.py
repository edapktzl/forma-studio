"""Bounded, in-process limits for the single API worker used by this deployment.

The ASGI client address must come from a trusted reverse proxy configuration;
raw Forwarded/X-Forwarded-For headers are deliberately never read here.
"""
from collections import OrderedDict, deque
import math
from time import monotonic


class RateLimiter:
    def __init__(self, max_clients: int = 10_000):
        self.max_clients = max_clients
        self.buckets = OrderedDict()

    def retry_after(self, key: tuple[str, str], limit: int, window: int) -> int:
        now = monotonic()
        bucket = self.buckets.pop(key, deque())
        while bucket and bucket[0] <= now - window:
            bucket.popleft()
        self.buckets[key] = bucket
        while len(self.buckets) > self.max_clients:
            self.buckets.popitem(last=False)
        if len(bucket) >= limit:
            return max(1, math.ceil(bucket[0] + window - now))
        bucket.append(now)
        return 0


rate_limiter = RateLimiter()
