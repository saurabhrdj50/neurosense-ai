"""Async load test for the NeuroSense API.

Simulates a realistic clinician mix against a running server and reports
throughput plus latency percentiles per scenario.

Usage:
    python scripts/load_test.py --base-url http://localhost:10002 \
        --duration 45 --concurrency 25 --username admin --password admin

Scenarios (weighted, per virtual user loop):
    35%  GET  /api/patients                     (registry view)
    25%  GET  /api/analyses                     (dashboard feed)
    15%  GET  /api/patients/history/PAT-1001    (patient dossier)
    15%  POST /api/analysis/report/pdf         (PDF generation)
    10%  GET  /api/health                       (probe traffic)

All virtual users log in once up front and reuse the session cookie, matching
how the React frontend behaves.
"""
import argparse
import asyncio
import io
import json
import statistics
import time

import httpx

PDF_BODY = {
    'patient_info': {'patient_id': 'PAT-1001', 'name': 'Ramesh Kumar', 'age': 68,
                     'sex': 'M', 'education_years': 16},
    'mri': {'stage': 'Very Mild Demented', 'confidence': 81.7,
            'probabilities': {'Non-Demented': 12.0, 'Very Mild Demented': 81.7, 'Mild Demented': 6.3},
            'gradcam_image': ''},
    'cognitive': {'composite_score': 72, 'tests_completed': 4},
    'risk_profile': {'overall_risk_score': 41},
    'final_stage': {'stage': 'Very Mild Demented', 'confidence': 66.4},
}


async def worker(user_id: int, client: httpx.AsyncClient, deadline: float,
                 latencies: dict, errors: list, lock: asyncio.Lock):
    rng = asyncio.get_event_loop()  # noqa: F841 (deterministic pick via counter instead)
    counter = user_id
    while time.monotonic() < deadline:
        counter += 1
        pick = counter % 20
        if pick < 7:
            scenario = 'GET /api/patients'
            coro = client.get('/api/patients')
        elif pick < 12:
            scenario = 'GET /api/analyses'
            coro = client.get('/api/analyses')
        elif pick < 15:
            scenario = 'GET /api/patients/history/PAT-1001'
            coro = client.get('/api/patients/history/PAT-1001')
        elif pick < 18:
            scenario = 'POST /api/analysis/report/pdf'
            coro = client.post('/api/analysis/report/pdf', json=PDF_BODY)
        else:
            scenario = 'GET /api/health'
            coro = client.get('/api/health')

        start = time.perf_counter()
        try:
            resp = await coro
            elapsed_ms = (time.perf_counter() - start) * 1000
            ok = resp.status_code < 500
            if not ok:
                async with lock:
                    errors.append((scenario, resp.status_code))
        except Exception as e:  # noqa: BLE001
            elapsed_ms = (time.perf_counter() - start) * 1000
            ok = False
            async with lock:
                errors.append((scenario, repr(e)))
        async with lock:
            latencies.setdefault(scenario, []).append(elapsed_ms)


def pct(sorted_vals: list, p: float) -> float:
    if not sorted_vals:
        return 0.0
    idx = min(len(sorted_vals) - 1, int(round(p / 100 * (len(sorted_vals) - 1))))
    return sorted_vals[idx]


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base-url', default='http://localhost:10002')
    parser.add_argument('--duration', type=int, default=45, help='measured seconds')
    parser.add_argument('--concurrency', type=int, default=25, help='virtual users')
    parser.add_argument('--username', default='admin')
    parser.add_argument('--password', default='admin')
    args = parser.parse_args()

    limits = httpx.Limits(max_connections=args.concurrency + 10,
                          max_keepalive_connections=args.concurrency)
    timeout = httpx.Timeout(30.0)

    # One login, one session cookie shared by all virtual users — mirrors a
    # deployed frontend (one browser session, many parallel requests) and
    # avoids tripping the login rate limit (10/min per key) on setup itself.
    print(f"Logging in as {args.username}…")
    bootstrap = httpx.Client(base_url=args.base_url, limits=limits, timeout=timeout)
    r = bootstrap.post('/api/auth/login',
                       json={'username': args.username, 'password': args.password})
    if r.status_code != 200:
        print(f"login failed: {r.status_code} {r.text[:120]}")
        bootstrap.close()
        return
    cookie = r.cookies
    print(f"login OK; spawning {args.concurrency} virtual users…")
    clients = []
    for i in range(args.concurrency):
        c = httpx.AsyncClient(base_url=args.base_url, limits=limits, timeout=timeout,
                              cookies=cookie)
        clients.append(c)
    bootstrap.close()

    latencies: dict = {}
    errors: list = []
    lock = asyncio.Lock()
    print(f"Load test: {args.duration}s, {args.concurrency} vusers → {args.base_url}\n")

    # 3s warmup (not counted)
    deadline = time.monotonic() + 3
    await asyncio.gather(*[worker(i, c, deadline, latencies, errors, lock) for i, c in enumerate(clients)])
    latencies.clear(); errors.clear()

    start = time.monotonic()
    deadline = start + args.duration
    await asyncio.gather(*[worker(i, c, deadline, latencies, errors, lock) for i, c in enumerate(clients)])
    wall = time.monotonic() - start

    for c in clients:
        await c.aclose()

    total = sum(len(v) for v in latencies.values())
    all_lat = sorted(v for vals in latencies.values() for v in vals)
    print(f"\n{'SCENARIO':40} {'reqs':>6} {'rps':>7} {'p50':>8} {'p95':>8} {'p99':>8} {'max':>8}  {'5xx/err':>7}")
    print('-' * 100)
    for scenario in sorted(latencies):
        vals = sorted(latencies[scenario])
        errs = sum(1 for s, _ in errors if s == scenario)
        print(f"{scenario:40} {len(vals):>6} {len(vals)/wall:>7.1f} "
              f"{pct(vals, 50):>7.1f}ms {pct(vals, 95):>7.1f}ms "
              f"{pct(vals, 99):>7.1f}ms {vals[-1]:>7.1f}ms {errs:>7}")
    print('-' * 100)
    print(f"{'TOTAL':40} {total:>6} {total/wall:>7.1f} "
          f"{pct(all_lat, 50):>7.1f}ms {pct(all_lat, 95):>7.1f}ms "
          f"{pct(all_lat, 99):>7.1f}ms {all_lat[-1]:>7.1f}ms {len(errors):>7}")
    print(f"\nwall={wall:.1f}s  concurrency={args.concurrency}  base={args.base_url}")
    if errors:
        sample = errors[:5]
        print("error samples:", json.dumps([{'scenario': s, 'detail': str(d)[:80]} for s, d in sample],
                                           indent=1))


if __name__ == '__main__':
    asyncio.run(main())
