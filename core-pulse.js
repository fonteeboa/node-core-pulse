const axios = require("axios");
const http = require("http");
const https = require("https");
const fs = require("fs");
const finalSummary = [];

function parseArgs(argv) {
    const acc = { baseURL: [], header: [], route: [] };
    argv.slice(2).forEach((a) => {
        if (a.startsWith("--baseURL=")) acc.baseURL.push(a.split("=")[1]);
        else if (a.startsWith("--header=")) acc.header.push(a.slice(9));
        else if (a.startsWith("--route=")) acc.route.push(a.slice(8));
        else {
            const [k, v] = a.replace(/^--/, "").split("=");
            acc[k] = v ?? true;
        }
    });
    return acc;
}
const args = parseArgs(process.argv);

// Defaults e targets
let BASE_URLS = args.baseURL.length ? args.baseURL : ["http://localhost:3000"];
const MODE = (args.mode || "").toLowerCase();
const PROFILE = (args.profile || "all").toLowerCase();
const PATH_DEFAULT = args.path || "/health";
const CONCURRENCY = Number(args.concurrency || 500);
const RPS = args.rps ? Number(args.rps) : null;
const DURATION_SEC = Number(args.duration || 3000);
const RAMP_SEC = Number(args.ramp || 0);
const TIMEOUT_MS = Number(args.timeout || 8000);
const INSECURE_TLS = String(args.insecure ?? "true") === "true";
const LOG_ERRORS = String(args.logErrors || "false") === "true";
const MAX_SOCKETS = Number(args.maxSockets || 0);
const MAX_FREE = Number(args.maxFree || 256);
const DISABLE_KEEPALIVE = String(args.disableKeepAlive || "false") === "true";
const CSV_PATH = args.csv || null;
const JSON_PATH = args.json || null;
const PARALLEL_TARGETS = String(args.parallelTargets || "false") === "true";
const STOP_P95_MS = args.stopP95Ms ? Number(args.stopP95Ms) : null;
const STOP_ERR_PCT = args.stopErrPct ? Number(args.stopErrPct) : null;
const WINDOW_SEC = Number(args.windowSec || 10);
const WARMUP_SEC = Number(args.warmup || 0);
const STEP_START_RPS = Number(args.stepStartRps || 200);
const STEP_INCR = Number(args.step || 100);
const STEP_MAX_RPS = Number(args.stepMaxRps || 500);
const PHASE_DUR = Number(args.phaseDur || 60);
const SYNC_START = String(args.syncStart || "false") === "true";

function parseHeaders(list) {
    const headers = {};
    (Array.isArray(list) ? list : [list]).filter(Boolean).forEach((entry) => {
        const idx = entry.indexOf(":");
        if (idx > -1) headers[entry.slice(0, idx).trim()] = entry.slice(idx + 1).trim();
    });
    return headers;
}
const HEADERS = parseHeaders(args.header);

function parseRoutes(routeArgs, defaultPath) {
    const routes = [];
    if (!routeArgs || routeArgs.length === 0) {
        routes.push({ method: "GET", path: defaultPath, weight: 100 });
    } else {
        for (const r of routeArgs) {
            const [verbAndPath, w] = r.split("@");
            const [method, path] = verbAndPath.split(":");
            routes.push({
                method: (method || "GET").toUpperCase(),
                path: path || defaultPath,
                weight: w ? Number(w) : 1,
            });
        }
    }
    const total = routes.reduce((s, r) => s + (r.weight || 1), 0);
    routes.forEach((r) => (r._p = (r.weight || 1) / total));
    return routes;
}
const ROUTES = parseRoutes(args.route, PATH_DEFAULT);

function pickRouteWeighted(routes) {
    const x = Math.random();
    let cum = 0;
    for (const r of routes) {
        cum += r._p;
        if (x <= cum) return r;
    }
    return routes[routes.length - 1];
}

const httpAgent = new http.Agent({
    keepAlive: !DISABLE_KEEPALIVE,
    maxSockets: MAX_SOCKETS || Infinity,
    maxFreeSockets: MAX_FREE,
    timeout: TIMEOUT_MS,
});

const httpsAgent = new https.Agent({
    keepAlive: !DISABLE_KEEPALIVE,
    rejectUnauthorized: !INSECURE_TLS,
    maxSockets: MAX_SOCKETS || Infinity,
    maxFreeSockets: MAX_FREE,
    timeout: TIMEOUT_MS,
});

function mkClient(baseURL) {
    return axios.create({
        baseURL,
        timeout: TIMEOUT_MS,
        httpAgent,
        httpsAgent,
        headers: HEADERS,
        decompress: true,
        responseType: "arraybuffer",
        validateStatus: () => true,
    });
}

function mkMetrics() {
    return {
        latencies: [],
        latSampleLimit: 500000,
        success: 0,
        fail: 0,
        statusCount: new Map(),
        bytes: 0,
        inFlight: 0,
        window: [],
        windowSec: WINDOW_SEC,
        startedAt: Date.now(),
    };
}

function pushLatency(m, dur) {
    if (m.latencies.length < m.latSampleLimit) m.latencies.push(dur);
    else if (Math.random() < 0.2) m.latencies[(Math.random() * m.latSampleLimit) | 0] = dur;
}

function pushWindow(m, ok, dur) {
    const now = Date.now();
    m.window.push({ t: now, ok, dur });
    const cutoff = now - m.windowSec * 1000;
    while (m.window.length && m.window[0].t < cutoff) m.window.shift();
}

function percentiles(sorted, ps) {
    const out = {};
    const n = sorted.length;
    if (!n) {
        ps.forEach((p) => (out[p] = 0));
        return out;
    }
    ps.forEach((p) => {
        const idx = Math.ceil((p / 100) * n) - 1;
        out[p] = sorted[Math.max(0, Math.min(idx, n - 1))];
    });
    return out;
}

function windowStats(m) {
    const w = m.window;
    if (!w.length) return { errPct: 0, p95: 0, p99: 0 };
    const total = w.length;
    const err = w.filter((x) => !x.ok).length;
    const errPct = (err / total) * 100;
    const lats = w.map((x) => x.dur).sort((a, b) => a - b);
    const p = percentiles(lats, [95, 99]);
    return { errPct, p95: p[95], p99: p[99] };
}

async function oneRequest(client, route, metrics) {
    const start = process.hrtime.bigint();
    metrics.inFlight++;
    try {
        const res = await client.request({ method: route.method, url: route.path });
        const dur = Number(process.hrtime.bigint() - start) / 1e6;
        pushLatency(metrics, dur);
        pushWindow(metrics, res.status >= 200 && res.status < 400, dur);
        if (res.status >= 200 && res.status < 400) metrics.success++;
        else metrics.fail++;
        metrics.statusCount.set(res.status, (metrics.statusCount.get(res.status) || 0) + 1);
        if (res.data) metrics.bytes += res.data.byteLength || 0;
    } catch (err) {
        const dur = Number(process.hrtime.bigint() - start) / 1e6;
        pushLatency(metrics, dur);
        pushWindow(metrics, false, dur);
        metrics.fail++;
        const s = err?.code || "ERR";
        metrics.statusCount.set(s, (metrics.statusCount.get(s) || 0) + 1);
        trackErrorReason(err);
        if (LOG_ERRORS) console.error("erro:", { message: err?.message, code: err?.code });
    } finally {
        metrics.inFlight--;
    }
}

function startBucket(rps) {
    let tokens = 0;
    const intervalMs = 100;
    const perTick = rps / (1000 / intervalMs);
    const timer = setInterval(() => {
        tokens += perTick;
        if (tokens > rps * 2) tokens = rps * 2;
    }, intervalMs);
    return {
        async wait() {
            while (tokens < 1) await new Promise((r) => setTimeout(r, 1));
            tokens -= 1;
        },
        stop() {
            clearInterval(timer);
        },
    };
}

async function runPhase({ baseURL, mode, rps, vus, durationSec, rampSec, routes, stopCfg }) {
    const client = mkClient(baseURL);
    const m = mkMetrics();
    const endAt = Date.now() + durationSec * 1000;
    const rampMs = (rampSec || 0) * 1000;

    let bucket = null;
    if (mode === "rps") bucket = startBucket(rps);

    const t0 = Date.now();
    const progress = setInterval(() => {
        const total = m.success + m.fail;
        const elapsed = (Date.now() - t0) / 1000;
        const rpsNow = total / Math.max(0.001, elapsed);
        const w = windowStats(m);
        process.stdout.write(
            `\r[${baseURL}] ${Math.max(0, Math.ceil((endAt - Date.now()) / 1000))}s | inFlight=${m.inFlight} | ok=${m.success} | err=${m.fail} | RPS≈${rpsNow.toFixed(
                1
            )} | window p95=${w.p95.toFixed(0)}ms err=${w.errPct.toFixed(1)}%     `
        );
    }, 500);

    const workersN =
        mode === "vus"
            ? vus
            : Math.max(Math.min((rps || 1) * 2, 2000), 100);

    function rampDelayFor(i, total, rampMs) {
        if (!rampMs || rampMs <= 0) return 0;
        const frac = i / Math.max(1, total - 1);
        return Math.floor(frac * rampMs);
    }

    let stopReason = null;
    const stopper = setInterval(() => {
        if (!stopCfg) return;
        const w = windowStats(m);
        if (STOP_P95_MS && w.p95 > STOP_P95_MS) stopReason = `stop-load: p95>${STOP_P95_MS}ms`;
        if (STOP_ERR_PCT && w.errPct > STOP_ERR_PCT) stopReason = `stop-load: err%>${STOP_ERR_PCT}%`;
    }, 1000);

    let startResolve;
    const startGate = new Promise((res) => (startResolve = res));
    const workers = [];
    for (let i = 0; i < workersN; i++) {
        const delay = rampDelayFor(i, workersN, rampMs);
        workers.push(
            (async () => {
                if (delay) await new Promise((r) => setTimeout(r, delay));
                if (SYNC_START) await startGate;
                while (Date.now() < endAt && !stopReason) {
                    if (bucket) await bucket.wait();
                    const route = pickRouteWeighted(routes);
                    await oneRequest(client, route, m);
                }
            })()
        );
    }

    if (SYNC_START) startResolve();

    await Promise.race([
        Promise.all(workers),
        (async () => {
            while (Date.now() < endAt && !stopReason) await new Promise((r) => setTimeout(r, 200));
        })(),
    ]);

    clearInterval(progress);
    clearInterval(stopper);
    if (bucket) bucket.stop();
    process.stdout.write("\n");
    return { metrics: m, stopReason };
}

function printAndSave(label, baseURL, res, jsonPath, csvPath) {
    const m = res.metrics;
    const total = m.success + m.fail;
    const elapsedSec = (Date.now() - m.startedAt) / 1000;
    const lats = m.latencies.slice().sort((a, b) => a - b);
    const p = percentiles(lats, [50, 90, 95, 99]);
    const errPct = total ? (m.fail / total) * 100 : 0;

    console.info(`📊 Resultados (${label}) — ${baseURL}`);
    console.table({
        "Reqs total": total,
        "Sucesso (2xx/3xx)": m.success,
        "Falhas": m.fail,
        "Erro %": `${errPct.toFixed(2)}%`,
        "RPS médio": (total / Math.max(0.001, elapsedSec)).toFixed(2),
        "Latency min": lats[0] ? `${lats[0].toFixed(2)} ms` : "0.00 ms",
        p50: `${p[50].toFixed(2)} ms`,
        p90: `${p[90].toFixed(2)} ms`,
        p95: `${p[95].toFixed(2)} ms`,
        p99: `${p[99].toFixed(2)} ms`,
        "Latency max": lats.length ? `${lats[lats.length - 1].toFixed(2)} ms` : "0.00 ms",
        "Bytes recebidos": `${(m.bytes / (1024 * 1024)).toFixed(2)} MB`,
        "Elapsed(s)": elapsedSec.toFixed(2),
        "Stop reason": res.stopReason || "—",
    });

    console.info("📦 Status:");
    for (const [k, v] of m.statusCount.entries()) {
        console.info(`  - ${k}: ${v}`);
    }

    if (jsonPath) {
        const obj = {
            label,
            baseURL,
            totals: {
                total,
                success: m.success,
                fail: m.fail,
                errPct: Number(errPct.toFixed(4)),
                rpsAvg: Number((total / Math.max(0.001, elapsedSec)).toFixed(4)),
                bytesMB: Number((m.bytes / (1024 * 1024)).toFixed(4)),
                elapsedSec: Number(elapsedSec.toFixed(3)),
                stopReason: res.stopReason || null,
            },
            percentiles: {
                p50: Number(p[50].toFixed(3)),
                p90: Number(p[90].toFixed(3)),
                p95: Number(p[95].toFixed(3)),
                p99: Number(p[99].toFixed(3)),
                min: lats[0] || 0,
                max: lats[lats.length - 1] || 0,
            },
            statusCount: Object.fromEntries(m.statusCount),
            timestamp: new Date().toISOString(),
        };
        try {
            let existing = [];

            if (fs.existsSync(jsonPath)) {
                const content = fs.readFileSync(jsonPath, "utf-8");
                existing = JSON.parse(content);
                if (!Array.isArray(existing)) {
                    console.warn(`⚠️ JSON em ${jsonPath} não é um array. Substituindo por novo array.`);
                    existing = [];
                }
            }

            existing.push(obj);
            fs.writeFileSync(jsonPath, JSON.stringify(existing, null, 2));
            console.info(`📝 JSON atualizado em ${jsonPath}`);
        } catch (e) {
            console.error("❌ Falha ao atualizar JSON:", e.message);
        }
    }
    if (csvPath) {
        try {
            const header =
                "ts,label,baseURL,total,success,fail,err_pct,rps_avg,p50_ms,p90_ms,p95_ms,p99_ms,min_ms,max_ms,bytes_mb,elapsed_s,stop_reason\n";
            if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, header);
            const line = [
                new Date().toISOString(),
                label,
                baseURL,
                total,
                m.success,
                m.fail,
                errPct.toFixed(4),
                (total / Math.max(0.001, elapsedSec)).toFixed(4),
                p[50].toFixed(3),
                p[90].toFixed(3),
                p[95].toFixed(3),
                p[99].toFixed(3),
                lats[0]?.toFixed(3) || "0",
                lats.length ? lats[lats.length - 1].toFixed(3) : "0",
                (m.bytes / (1024 * 1024)).toFixed(4),
                elapsedSec.toFixed(3),
                (res.stopReason || "").replace(/,/g, ";"),
            ].join(",");
            fs.appendFileSync(csvPath, line + "\n");
            console.info(`🗂  CSV anexado em ${csvPath}`);
        } catch (e) {
            console.error("Falha ao salvar CSV:", e.message);
        }
    }
    return {
        baseURL,
        label,
        total,
        success: m.success,
        fail: m.fail,
        errPct: Number(errPct.toFixed(2)),
        rpsAvg: Number((total / Math.max(0.001, elapsedSec)).toFixed(2)),
        p50: Number(p[50].toFixed(2)),
        p90: Number(p[90].toFixed(2)),
        p95: Number(p[95].toFixed(2)),
        p99: Number(p[99].toFixed(2)),
        min: lats[0] ? Number(lats[0].toFixed(2)) : 0,
        max: lats.length ? Number(lats[lats.length - 1].toFixed(2)) : 0,
        bytesMB: Number((m.bytes / (1024 * 1024)).toFixed(2)),
        elapsedSec: Number(elapsedSec.toFixed(2)),
        stopReason: res.stopReason || null
    };

}

function buildPhasesFromProfile(profile) {
    const phases = [];

    switch (profile) {
        case "step": {
            for (let r = STEP_START_RPS; r <= STEP_MAX_RPS; r += STEP_INCR) {
                phases.push({ mode: "rps", rps: r, durationSec: PHASE_DUR, rampSec: Math.min(10, Math.floor(PHASE_DUR / 3)) });
            }
            break;
        }
        case "soak": {
            const r = RPS || 300;
            const dur = DURATION_SEC || 1800;
            phases.push({ mode: "rps", rps: r, durationSec: dur, rampSec: Math.min(60, Math.floor(dur / 6)) });
            break;
        }
        case "spike": {
            phases.push({ mode: "rps", rps: RPS || 1000, durationSec: DURATION_SEC || 15, rampSec: 0 });
            break;
        }
        case "all": {
            const baseRps = RPS || 200;
            const baseDuration = DURATION_SEC || 60;
            const stepIncr = STEP_INCR || Math.max(50, Math.floor(baseRps * 0.25));
            const maxRps = STEP_MAX_RPS || Math.max(baseRps * 3, 600);
            const soakRps = Math.floor(maxRps * 0.6);
            const spikeRps = Math.floor(maxRps * 1.5);

            console.info(`🔄 Perfil "all" configurado com:`);
            console.info(`   - Step: ${baseRps} → ${maxRps} RPS (incremento: ${stepIncr})`);
            console.info(`   - Soak: ${soakRps} RPS por ${baseDuration * 10}s`);
            console.info(`   - Spike: ${spikeRps} RPS por ${Math.min(baseDuration / 2, 30)}s`);

            // Fase 1: Step Test (encontrar limite gradual)
            for (let r = baseRps; r <= maxRps; r += stepIncr) {
                phases.push({
                    mode: "rps",
                    rps: r,
                    durationSec: baseDuration,
                    rampSec: Math.min(15, Math.floor(baseDuration / 4)),
                    label: `step-${r}rps`
                });
            }

            // Fase 2: Cooldown (reduz carga antes do soak)
            phases.push({
                mode: "rps",
                rps: Math.floor(baseRps * 0.5),
                durationSec: Math.min(30, baseDuration / 2),
                rampSec: 0,
                label: "cooldown"
            });

            // Fase 3: Soak Test (resistência)
            phases.push({
                mode: "rps",
                rps: soakRps,
                durationSec: baseDuration * 10,
                rampSec: Math.min(60, Math.floor(baseDuration / 2)),
                label: "soak"
            });

            // Fase 4: Recovery (volta ao normal após soak)
            phases.push({
                mode: "rps",
                rps: baseRps,
                durationSec: Math.min(60, baseDuration),
                rampSec: 0,
                label: "recovery"
            });

            // Fase 5: Spike Test (pico de carga)
            phases.push({
                mode: "rps",
                rps: spikeRps,
                durationSec: Math.min(baseDuration / 2, 30),
                rampSec: 0,
                label: "spike"
            });

            // Fase 6: Final cooldown
            phases.push({
                mode: "rps",
                rps: Math.floor(baseRps * 0.3),
                durationSec: Math.min(30, baseDuration / 3),
                rampSec: 0,
                label: "final-cooldown"
            });

            break;
        }
        default:
            return null;
    }

    if (phases.length > 0) {
        const totalDuration = phases.reduce((sum, phase) => sum + phase.durationSec, 0);
        const maxRpsInPhases = Math.max(...phases.map(p => p.rps || 0));
        const minRpsInPhases = Math.min(...phases.map(p => p.rps || Infinity));

        console.info(`✅ Perfil "${profile}" validado:`);
        console.info(`   - ${phases.length} fases geradas`);
        console.info(`   - Duração total: ${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`);
        console.info(`   - RPS range: ${minRpsInPhases} → ${maxRpsInPhases}`);

        if (totalDuration > 7200) {
            console.warn(`⚠️  Duração total muito longa: ${Math.floor(totalDuration / 3600)}h. Considere reduzir --duration.`);
        }

        if (maxRpsInPhases > 10000) {
            console.warn(`⚠️  RPS muito alto: ${maxRpsInPhases}. Verifique se o sistema suporta essa carga.`);
        }

        phases.forEach((phase, idx) => {
            phase.phaseIndex = idx + 1;
            phase.totalPhases = phases.length;
            phase.profile = profile;
            const estimatedReqs = phase.rps * phase.durationSec;
            phase.estimatedRequests = estimatedReqs;
            phase.recommendedWorkers = Math.max(
                Math.min(phase.rps * 2, 2000),
                50
            );
        });

        if (profile === "all") {
            console.info(`📋 Fases detalhadas do perfil "all":`);
            phases.forEach((phase, idx) => {
                console.info(`   ${idx + 1}. ${phase.label}: ${phase.rps} RPS × ${phase.durationSec}s (est: ${phase.estimatedRequests.toLocaleString()} reqs)`);
            });
        }
    }

    return phases;
}

function buildSinglePhaseFromArgs() {
    if (MODE === "rps") return [{ mode: "rps", rps: RPS || 300, durationSec: DURATION_SEC, rampSec: RAMP_SEC }];
    return [{ mode: "vus", vus: CONCURRENCY, durationSec: DURATION_SEC, rampSec: RAMP_SEC }];
}

const errorReasons = new Map();

function trackErrorReason(err) {
    const code = err?.code || (err?.response?.status ? `HTTP_${err.response.status}` : "UNKNOWN");
    const msg = err?.message || "";
    let reason = code;
    if (code === "ECONNABORTED" && /timeout/i.test(msg)) reason = "TIMEOUT_CLIENT";
    if (code === "ECONNRESET") reason = "CONN_RESET";
    if (code === "ETIMEDOUT") reason = "SOCKET_TIMEOUT";
    if (code === "EAI_AGAIN") reason = "DNS_RETRY";
    errorReasons.set(reason, (errorReasons.get(reason) || 0) + 1);
}

async function warmupIfNeeded(baseURL) {
    if (!WARMUP_SEC) return;
    const client = mkClient(baseURL);
    const endAt = Date.now() + WARMUP_SEC * 1000;
    console.info(`🔥 Warmup ${WARMUP_SEC}s em ${baseURL} ...`);
    while (Date.now() < endAt) {
        try { await client.get(PATH_DEFAULT); } catch { }
    }
    console.info("🔥 Warmup concluído.");
}

let abortAll = false;
process.on("SIGINT", () => {
    console.info("\n🛑 Ctrl+C detectado. Tentando shutdown gracioso (5s)...");
    abortAll = true;
    setTimeout(() => {
        console.info("⏹️  Forçando encerramento.");
        process.exit(1);
    }, 5000);
});

(async function main() {
    const routes = ROUTES;
    const phases =
        buildPhasesFromProfile(PROFILE) ||
        buildSinglePhaseFromArgs();

    console.info("⚙️  Config geral:", {
        targets: BASE_URLS,
        parallelTargets: PARALLEL_TARGETS,
        routes: routes.map((r) => `${r.method} ${r.path} (${r.weight})`),
        profile: PROFILE || "(manual)",
        phases,
        headers: HEADERS,
        timeout_ms: TIMEOUT_MS,
        insecure_tls: INSECURE_TLS,
        keepAlive: !DISABLE_KEEPALIVE,
        maxSockets: MAX_SOCKETS || "∞",
        maxFreeSockets: MAX_FREE,
        warmup_sec: WARMUP_SEC,
        stop_p95_ms: STOP_P95_MS || "none",
        stop_err_pct: STOP_ERR_PCT || "none",
        window_sec: WINDOW_SEC,
    });

    if (!PARALLEL_TARGETS) {
        for (const baseURL of BASE_URLS) {
            if (abortAll) break;
            await warmupIfNeeded(baseURL);
            for (let i = 0; i < phases.length; i++) {
                if (abortAll) break;
                const ph = phases[i];
                console.info(`\n🚀 Fase ${i + 1}/${phases.length} -> ${baseURL} :: ${ph.mode === "rps" ? `${ph.rps} RPS` : `${ph.vus} VUs`} por ${ph.durationSec}s (ramp ${ph.rampSec || 0}s)`);
                const res = await runPhase({
                    baseURL,
                    mode: ph.mode,
                    rps: ph.rps,
                    vus: ph.vus,
                    durationSec: ph.durationSec,
                    rampSec: ph.rampSec || 0,
                    routes,
                    stopCfg: STOP_P95_MS || STOP_ERR_PCT,
                });
                printAndSave(`phase-${i + 1}`, baseURL, res, JSON_PATH, CSV_PATH);
                const summary = printAndSave(`phase-${i + 1}`, baseURL, res, JSON_PATH, CSV_PATH);
                finalSummary.push(summary);

                if (res.stopReason) {
                    console.info(`⚠️  Parando sequência em ${baseURL} por "${res.stopReason}"`);
                    break;
                }
            }
        }
    } else {
        const basePerPhase = BASE_URLS.slice();
        if (WARMUP_SEC) await Promise.all(basePerPhase.map((u) => warmupIfNeeded(u)));

        for (let i = 0; i < phases.length; i++) {
            if (abortAll) break;
            const ph = phases[i];
            console.info(`\n🚀 Fase paralela ${i + 1}/${phases.length} :: ${ph.mode === "rps" ? `${ph.rps} RPS` : `${ph.vus} VUs`} total por ${ph.durationSec}s (ramp ${ph.rampSec || 0}s)`);
            const perTarget = Object.fromEntries(
                basePerPhase.map((u) => [
                    u,
                    ph.mode === "rps"
                        ? { ...ph, rps: Math.max(1, Math.floor(ph.rps / basePerPhase.length)) }
                        : { ...ph, vus: Math.max(1, Math.floor(ph.vus / basePerPhase.length)) },
                ])
            );
            const results = await Promise.all(
                basePerPhase.map((u) =>
                    runPhase({
                        baseURL: u,
                        mode: ph.mode,
                        rps: perTarget[u].rps,
                        vus: perTarget[u].vus,
                        durationSec: ph.durationSec,
                        rampSec: ph.rampSec || 0,
                        routes,
                        stopCfg: STOP_P95_MS || STOP_ERR_PCT,
                    }).then((r) => ({ url: u, res: r }))
                )
            );
            results.forEach(({ url, res }) => {
                const summary = printAndSave(`phase-${i + 1}`, url, res, JSON_PATH && JSON_PATH.replace(".json", `-${i + 1}-${url.replace(/[:/]/g, "_")}.json`), CSV_PATH);
                finalSummary.push(url, summary);
            });

            if (results.some(({ res }) => res.stopReason)) {
                console.info(`⚠️  Parando sequência paralela por stop-load em algum alvo.`);
                break;
            }
        }
    }

    if (errorReasons.size > 0) {
        console.info("❗ Top error reasons:");
        for (const [reason, count] of errorReasons.entries()) {
            console.info(`  - ${reason}: ${count}`);
        }
    }

    console.info("\n✅ Teste finalizado.");

    if (finalSummary.length > 0) {
        console.info("\n📊 Tabela comparativa final entre URLs:");
        const comparison = [];
        for (const data of finalSummary) {
            comparison.push({
                "Fase": data.label,
                "URL": data.baseURL,
                "RPS médio": data.rpsAvg,
                "Erro %": `${data.errPct}%`,
                "p50": `${data.p50} ms`,
                "p90": `${data.p90} ms`,
                "p95": `${data.p95} ms`,
                "p99": `${data.p99} ms`,
                "Lat min": `${data.min} ms`,
                "Lat max": `${data.max} ms`,
                "Bytes recebidos": `${data.bytesMB} MB`,
                "Requisições": data.total,
                "Sucesso": data.success,
                "Falha": data.fail,
                "Stop Reason": data.stopReason || "—"
            });
        }

        console.table(comparison);
    }
    process.exit(1);

})().catch((e) => {
    console.error("Falha no runner:", e);
    process.exit(1);
});
