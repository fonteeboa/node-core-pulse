# Core Pulse 🚀

*Advanced Node.js Load Testing Framework*

An advanced **load testing framework** in Node.js, designed to evaluate the performance, scalability, and stability of APIs, web services, and distributed systems in production-like environments.

📄 **Versão em português**: [README.md](README.md)  

---

## 📖 Project Vision

**Core Pulse** was born out of the need for a **simple, robust, and extensible** solution for load testing real-world systems.
Instead of relying on complex or closed-source tools, we created something **open for the community**, focused on:

* **Transparency** in results (export to JSON/CSV)
* **Flexibility** in configuration (routes, multiple targets, stop-conditions)
* **Practicality** for DevOps, CI/CD, and SRE environments
* **Knowledge sharing** and performance testing best practices

Our goal is to empower any team — developers, QA, or SRE — to run **reliable load tests** in minutes and improve the **resilience** of their systems.

---

## 📋 Table of Contents

- [Core Pulse 🚀](#core-pulse-)
  - [📖 Project Vision](#-project-vision)
  - [📋 Table of Contents](#-table-of-contents)
  - [What is Load Testing? 🎯](#what-is-load-testing-)
  - [🔑 Main Flags](#-main-flags)
  - [📊 Test Profiles](#-test-profiles)
    - [⚡ Usage Examples](#-usage-examples)
  - [Why Use This Script? 💡](#why-use-this-script-)
    - [**Advantages over traditional tools:**](#advantages-over-traditional-tools)
    - [**Ideal for:**](#ideal-for)
  - [License 📝](#license-)

---

## What is Load Testing? 🎯

**Load Testing** is a software testing technique that evaluates how a system behaves under normal and peak workload conditions. The main objectives are:

* **Identify performance bottlenecks**
* **Validate SLAs** (Service Level Agreements)
* **Determine system capacity limits**
* **Detect failure points** before production
* **Optimize infrastructure resources**
* **Ensure stability** under prolonged load

---

## 🔑 Main Flags

| Flag                 | Description                                                   | Example                                                   |
| -------------------- | ------------------------------------------------------------- | --------------------------------------------------------- |
| `--baseURL`          | Defines targets (can repeat).                                 | `--baseURL=https://api1:3001 --baseURL=https://api2:3001` |
| `--path`             | Default path if no `--route` is given.                        | `--path=/health`                                          |
| `--header`           | Adds HTTP headers.                                            | `--header="Authorization: Bearer token"`                  |
| `--route`            | Defines routes with weight (`METHOD:/path@weight`).           | `--route=GET:/health@70 --route=POST:/login@30`           |
| `--profile`          | Generates automatic profiles: `step`, `soak`, `spike`, `all`. | `--profile=all`                                           |
| `--mode`             | Manual execution: `rps` (rate) or `vus` (virtual users).      | `--mode=rps --rps=200 --duration=60`                      |
| `--concurrency`      | Number of virtual users in `vus` mode.                        | `--concurrency=500`                                       |
| `--rps`              | Requests per second in `rps` mode.                            | `--rps=400`                                               |
| `--duration`         | Phase duration (s).                                           | `--duration=120`                                          |
| `--ramp`             | Ramp up time (s).                                             | `--ramp=15`                                               |
| `--timeout`          | Request timeout (ms).                                         | `--timeout=8000`                                          |
| `--insecure`         | Ignore invalid TLS.                                           | `--insecure=true`                                         |
| `--disableKeepAlive` | Disable keep-alive.                                           | `--disableKeepAlive=true`                                 |
| `--json`             | Export metrics to JSON (append).                              | `--json=results.json`                                     |
| `--csv`              | Export metrics to CSV (append).                               | `--csv=results.csv`                                       |
| `--parallelTargets`  | Run phases on all targets in parallel.                        | `--parallelTargets=true`                                  |
| `--stopP95Ms`        | Stop if p95 > threshold (ms).                                 | `--stopP95Ms=1200`                                        |
| `--stopErrPct`       | Stop if error % > threshold.                                  | `--stopErrPct=2`                                          |

---

## 📊 Test Profiles

* **step** → Gradually increases RPS (stress).
* **soak** → Long steady load (endurance).
* **spike** → Sudden burst of load (resilience).
* **all** → Full mix (step + cooldown + soak + recovery + spike).

---

### ⚡ Usage Examples

```bash
# Simple smoke test
node core-pulse.js --baseURL=https://srv:3001 --mode=rps --rps=200 --duration=60

# Full profile (all) with warmup and JSON/CSV export
node core-pulse.js --baseURL=https://srv:3001 --profile=all --warmup=15 --json=out.json --csv=out.csv

# Weighted routes (70% health, 30% login)
node core-pulse.js --baseURL=https://srv:3001 --route=GET:/health@70 --route=POST:/login@30 --mode=rps --rps=400 --duration=120

# 🔥 Spike-to-failure (ramp until break)
node core-pulse.js \
  --baseURL=https://srv:3001 \
  --profile=step \
  --stepStartRps=300 --step=200 --stepMaxRps=8000 --phaseDur=30 \
  --warmup=10 \
  --stopP95Ms=1200 --stopErrPct=2 \
  --json=out.json --csv=out.csv

# 🔥 Connection saturation (VUs mode)
node core-pulse.js \
  --baseURL=https://srv:3001 \
  --mode=vus --concurrency=20000 --duration=60 --ramp=0 --syncStart=true \
  --disableKeepAlive=true --maxSockets=100000 --timeout=15000 \
  --path=/health \
  --json=conn.json --csv=conn.csv

# 🔥 Final resilience (endurance + spike)
node core-pulse.js \
  --baseURL=https://srv:3001 \
  --profile=all \
  --stepStartRps=400 --step=200 --stepMaxRps=5000 --phaseDur=45 \
  --warmup=15 \
  --stopP95Ms=1500 --stopErrPct=3 \
  --json=resilience.json --csv=resilience.csv
```

---

## Why Use This Script? 💡

### **Advantages over traditional tools:**

| Feature                           | Core Pulse | Apache Bench | JMeter | Artillery |
| --------------------------------- | ---------- | ------------ | ------ | --------- |
| **Multiple routes with weights**  | ✅          | ❌            | ✅      | ✅         |
| **Intelligent stop conditions**   | ✅          | ❌            | ❌      | ❌         |
| **Pre-configured profiles**       | ✅          | ❌            | ⚠️     | ⚠️        |
| **Smart ramp-up**                 | ✅          | ❌            | ✅      | ✅         |
| **Real-time metrics**             | ✅          | ❌            | ⚠️     | ⚠️        |
| **Multiple simultaneous targets** | ✅          | ❌            | ✅      | ❌         |
| **CLI configuration**             | ✅          | ⚠️           | ❌      | ⚠️        |
| **JSON/CSV export**               | ✅          | ❌            | ✅      | ✅         |

### **Ideal for:**

* **DevOps/SRE**: CI/CD testing and deployment validation
* **Architects**: Capacity planning and scaling analysis
* **Developers**: Performance validation during development
* **QA**: Performance regression testing

---

**Dependencies:**

* Node.js >= 14.x
* axios (for HTTP requests)

---

## License 📝

This project is licensed under the **Apache License 2.0** (January 2004). See the `LICENSE` file for more details.
