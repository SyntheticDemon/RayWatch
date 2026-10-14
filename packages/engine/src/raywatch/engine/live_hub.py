"""In-process pub/sub for live sync notifications (WebSocket fan-out)."""

from __future__ import annotations

import asyncio
import contextlib
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any


@dataclass
class LiveHub:
    """Broadcast JSON events to subscribed asyncio queues."""

    _channels: dict[str, set[asyncio.Queue[dict[str, Any]]]] = field(
        default_factory=lambda: defaultdict(set)
    )

    def subscribe(self, channel: str) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=64)
        self._channels[channel].add(queue)
        return queue

    def unsubscribe(self, channel: str, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._channels[channel].discard(queue)
        if not self._channels[channel]:
            del self._channels[channel]

    def publish(self, channel: str, message: dict[str, Any]) -> None:
        for queue in list(self._channels.get(channel, ())):
            with contextlib.suppress(asyncio.QueueFull):
                queue.put_nowait(message)
        if channel != "*":
            self.publish("*", message)


live_hub = LiveHub()
