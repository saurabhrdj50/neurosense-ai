import time
from typing import Dict, Any, Optional
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import threading


@dataclass
class RequestMetric:
    """Single request metric."""
    path: str
    method: str
    status_code: int
    duration_ms: float
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Counter:
    """Simple counter for metrics."""
    value: int = 0
    
    def increment(self, amount: int = 1) -> None:
        self.value += amount
    
    def get(self) -> int:
        return self.value
    
    def reset(self) -> None:
        self.value = 0


@dataclass
class Histogram:
    """Simple histogram for tracking distributions."""
    values: list = field(default_factory=list)
    max_size: int = 1000
    
    def observe(self, value: float) -> None:
        self.values.append(value)
        if len(self.values) > self.max_size:
            self.values.pop(0)
    
    def get_stats(self) -> Dict[str, float]:
        if not self.values:
            return {'count': 0, 'mean': 0, 'min': 0, 'max': 0, 'p50': 0, 'p95': 0, 'p99': 0}
        
        sorted_values = sorted(self.values)
        count = len(sorted_values)
        
        return {
            'count': count,
            'mean': sum(sorted_values) / count,
            'min': sorted_values[0],
            'max': sorted_values[-1],
            'p50': sorted_values[int(count * 0.5)],
            'p95': sorted_values[int(count * 0.95)] if count > 20 else sorted_values[-1],
            'p99': sorted_values[int(count * 0.99)] if count > 100 else sorted_values[-1],
        }


class MetricsCollector:
    """Collects and exposes application metrics."""
    
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        
        self._requests_total = Counter()
        self._requests_by_endpoint: Dict[str, Counter] = defaultdict(Counter)
        self._requests_by_status: Dict[int, Counter] = defaultdict(Counter)
        self._errors_total = Counter()
        
        self._request_duration = Histogram()
        self._analysis_duration = Histogram()
        
        self._active_requests = Counter()
        
        self._start_time = datetime.utcnow()
        
        self._analysis_counts: Dict[str, Counter] = defaultdict(Counter)
    
    def record_request(
        self,
        path: str,
        method: str,
        status_code: int,
        duration_ms: float
    ) -> None:
        """Record an HTTP request."""
        self._requests_total.increment()
        self._requests_by_endpoint[f"{method} {path}"].increment()
        self._requests_by_status[status_code].increment()
        self._request_duration.observe(duration_ms)
        
        if status_code >= 400:
            self._errors_total.increment()
    
    def record_analysis(self, modality: str, duration_ms: float) -> None:
        """Record an analysis operation."""
        self._analysis_counts[modality].increment()
        self._analysis_duration.observe(duration_ms)
    
    def increment_active_requests(self) -> None:
        """Increment active request counter."""
        self._active_requests.increment()
    
    def decrement_active_requests(self) -> None:
        """Decrement active request counter."""
        self._active_requests.increment(-1)
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all current metrics."""
        uptime = (datetime.utcnow() - self._start_time).total_seconds()
        
        return {
            'uptime_seconds': round(uptime, 2),
            'requests': {
                'total': self._requests_total.get(),
                'active': self._active_requests.get(),
                'by_endpoint': {
                    endpoint: counter.get()
                    for endpoint, counter in self._requests_by_endpoint.items()
                },
                'by_status': {
                    status: counter.get()
                    for status, counter in self._requests_by_status.items()
                },
                'duration': self._request_duration.get_stats(),
            },
            'errors': {
                'total': self._errors_total.get(),
                'rate': round(self._errors_total.get() / max(self._requests_total.get(), 1) * 100, 2),
            },
            'analysis': {
                'total': sum(counter.get() for counter in self._analysis_counts.values()),
                'by_modality': {
                    modality: counter.get()
                    for modality, counter in self._analysis_counts.items()
                },
                'duration': self._analysis_duration.get_stats(),
            },
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        }
    
    def get_prometheus_metrics(self) -> str:
        """Export metrics in Prometheus format."""
        metrics = self.get_all_metrics()
        lines = []
        
        lines.append('# HELP neurosense_uptime_seconds Application uptime in seconds')
        lines.append('# TYPE neurosense_uptime_seconds gauge')
        lines.append(f'neurosense_uptime_seconds {metrics["uptime_seconds"]}')
        
        lines.append('# HELP neurosense_requests_total Total HTTP requests')
        lines.append('# TYPE neurosense_requests_total counter')
        lines.append(f'neurosense_requests_total {metrics["requests"]["total"]}')
        
        lines.append('# HELP neurosense_requests_active Current active requests')
        lines.append('# TYPE neurosense_requests_active gauge')
        lines.append(f'neurosense_requests_active {metrics["requests"]["active"]}')
        
        lines.append('# HELP neurosense_errors_total Total HTTP errors')
        lines.append('# TYPE neurosense_errors_total counter')
        lines.append(f'neurosense_errors_total {metrics["errors"]["total"]}')
        
        for endpoint, count in metrics['requests']['by_endpoint'].items():
            endpoint_clean = endpoint.replace(' ', '_').replace('/', '_')
            lines.append(f'# HELP neurosense_requests_by_endpoint Requests by endpoint')
            lines.append(f'# TYPE neurosense_requests_by_endpoint counter')
            lines.append(f'neurosense_endpoint_total{{endpoint="{endpoint}"}} {count}')
        
        for status, count in metrics['requests']['by_status'].items():
            lines.append(f'# HELP neurosense_requests_by_status Requests by status code')
            lines.append(f'# TYPE neurosense_requests_by_status counter')
            lines.append(f'neurosense_status_total{{status="{status}"}} {count}')
        
        for modality, count in metrics['analysis']['by_modality'].items():
            lines.append(f'# HELP neurosense_analysis_total Analysis operations by modality')
            lines.append(f'# TYPE neurosense_analysis_total counter')
            lines.append(f'neurosense_analysis_total{{modality="{modality}"}} {count}')
        
        dur_stats = metrics['requests']['duration']
        lines.append('# HELP neurosense_request_duration_seconds Request duration in seconds')
        lines.append('# TYPE neurosense_request_duration_seconds summary')
        lines.append(f'neurosense_request_duration_seconds_mean {{quantile="0.5"}} {dur_stats["mean"] / 1000}')
        lines.append(f'neurosense_request_duration_seconds_p95 {{quantile="0.95"}} {dur_stats["p95"] / 1000}')
        lines.append(f'neurosense_request_duration_seconds_p99 {{quantile="0.99"}} {dur_stats["p99"] / 1000}')
        
        return '\n'.join(lines) + '\n'
    
    def reset(self) -> None:
        """Reset all metrics (useful for testing)."""
        self._requests_total.reset()
        self._errors_total.reset()
        self._active_requests.reset()
        self._requests_by_endpoint.clear()
        self._requests_by_status.clear()
        self._analysis_counts.clear()
        self._request_duration = Histogram()
        self._analysis_duration = Histogram()
        self._start_time = datetime.utcnow()


metrics = MetricsCollector()
