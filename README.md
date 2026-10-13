# ZK Proof of Vaccination PKI

**Repository status:** Prototype for evaluating synthetic task metrics. The current implementation does **not** issue, sign, revoke, present, or cryptographically verify vaccination credentials. In particular, BBS+ signatures, PKI certificate validation, W3C Verifiable Credentials, and zero-knowledge proofs are **not implemented**. No results establish vaccination status or meet a clinical standard.

## Browser demonstration

Open `web/index.html` in a modern browser. It provides an entirely local, deterministic interface for the three Python supervisor alert rules (primary metric >25, secondary metric >12 or critical flag, and selected anomaly descriptors). It generates **no audit signature** and **does not transmit data** in local mode. The optional "Same-origin Python API" mode requires you to run your own backend; it sends the submitted values to `/api/audit`.

A GitHub Pages deployment workflow is included, but a production URL should only be used after the Pages environment is enabled and the live website has been verified.

## Python functionality

There are two existing, distinct threshold-evaluation implementations:

- `agents/` with `python cli.py` and `agents.api:app`: Pydantic models, three deterministic alert workers, and an in-memory chained HMAC-SHA256 event log. HMAC integrity verification recomputes signatures. The event log is **not persisted**, and a new process cannot verify another process's log.
- `zk_health_pass/` with `python -m zk_health_pass.cli` or the installed `zk-proof-of-vaccination-pki` command: a separate, legacy three-worker evaluation path with different secondary thresholds. Classes bearing cryptographic names do **not** implement those algorithms.
- `enrichment.py`: eight generic threshold monitors named after vaccination-related workflows. These do not perform cryptographic operations.

The two Python paths are retained for compatibility. Their thresholds are demonstration constants, not validated clinical decision rules.

## Install and run

Python 3.10 or newer:

```bash
python -m pip install '.[server,test]'
python cli.py audit --task-id TASK-001 --target DEMO-001 --primary 28.5 --secondary 14.2 --critical --status DISCORDANT
python cli.py batch -i sample.csv -o results.csv
python cli.py verify-audit
python cli.py serve --host 127.0.0.1 --port 8000
```

On a separate shell, `curl http://127.0.0.1:8000/health` checks the API. Endpoint `POST /api/audit` accepts the Pydantic task payload; see `agents/models.py`.

For the alternative CLI, run `python -m zk_health_pass.cli audit`.

For an isolated container:

```bash
docker build -t zk-proof-of-vaccination-pki .
docker run --rm -p 127.0.0.1:8000:8000 -e AUDIT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')" zk-proof-of-vaccination-pki
```

`docker compose up --build` also works when `AUDIT_SECRET_KEY` is exported in the shell.

## Testing

```bash
python -m pytest -q
node --test web/app.test.cjs
node --check web/app.js
```

GitHub Actions tests Python 3.10–3.12 and the browser evaluator with Node 22.

## Privacy and security

Use **synthetic identifiers only**. The PHI regex filter catches a limited set of obvious identifiers; it is **not** a HIPAA Safe Harbor de-identification procedure or a guarantee of privacy. The API is unauthenticated, so bind it to localhost or provide authentication and TLS through your own infrastructure before exposing it to a network. The in-memory audit HMAC uses `AUDIT_SECRET_KEY`; without it a temporary key is generated and the log cannot be verified across restarts. Never put that key in browser code.

The static browser mode requires no server and uses no Python/Pyodide runtime, third-party fonts, or local storage. Same-origin API mode sends data to your server.

## Technology and license

Python, Pydantic 2, optional FastAPI/Uvicorn, HTML/CSS/JavaScript. Browser evaluator requires modern JavaScript support (current Chrome, Firefox, Safari, or Edge). MIT license; see [LICENSE](LICENSE).
