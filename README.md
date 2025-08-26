# Core Pulse 🚀

*Advanced Node.js Load Testing Framework*

Uma ferramenta avançada de **teste de carga (load testing)** em Node.js, projetada para avaliar performance, escalabilidade e estabilidade de APIs, serviços web e sistemas distribuídos em ambiente de produção.

📄 **English Version**: [README_EN.md](README_EN.md)

---

## 📖 Ideia por trás do projeto

O **Core Pulse** nasceu da necessidade de uma solução **simples, robusta e extensível** para testar cargas em ambientes reais.
Ao invés de depender de ferramentas complexas ou fechadas, criamos algo **aberto à comunidade**, focado em:

* **Transparência** nos resultados (exportação em JSON/CSV)
* **Flexibilidade** na configuração (rotas, múltiplos targets, stop-conditions)
* **Praticidade** em ambientes DevOps, CI/CD e SRE
* **Compartilhamento** de conhecimento e boas práticas de testes de performance

Nosso objetivo é que qualquer equipe — seja dev, QA, ou SRE — consiga **rodar testes confiáveis** em minutos e **aprimorar a resiliência** dos seus sistemas.

---

## 📋 Índice

- [Core Pulse 🚀](#core-pulse-)
  - [📖 Ideia por trás do projeto](#-ideia-por-trás-do-projeto)
  - [📋 Índice](#-índice)
  - [O que é Load Testing? 🎯](#o-que-é-load-testing-)
  - [🔑 Principais Comandos](#-principais-comandos)
  - [📊 Perfis de Teste](#-perfis-de-teste)
    - [⚡ Exemplos de Uso](#-exemplos-de-uso)
  - [Por que usar este script? 💡](#por-que-usar-este-script-)
    - [**Vantagens sobre ferramentas tradicionais:**](#vantagens-sobre-ferramentas-tradicionais)
    - [**Ideal para:**](#ideal-para)
  - [Licença 📝](#licença-)

---

## O que é Load Testing? 🎯

**Load Testing** é uma técnica de teste de software que avalia o comportamento de um sistema sob condições normais e de pico de carga de trabalho. O objetivo é:

* **Identificar gargalos** de performance
* **Validar SLAs** (Service Level Agreements)
* **Determinar capacidade máxima** do sistema
* **Detectar pontos de falha** antes da produção
* **Otimizar recursos** de infraestrutura
* **Garantir estabilidade** sob carga prolongada

---

## 🔑 Principais Comandos

| Flag                 | Descrição                                                          | Exemplo                                                   |
| -------------------- | ------------------------------------------------------------------ | --------------------------------------------------------- |
| `--baseURL`          | Define os alvos do teste (pode repetir).                           | `--baseURL=https://api1:3001 --baseURL=https://api2:3001` |
| `--path`             | Caminho padrão caso não use `--route`.                             | `--path=/health`                                          |
| `--header`           | Adiciona cabeçalhos HTTP.                                          | `--header="Authorization: Bearer token"`                  |
| `--route`            | Define rotas com peso (`METHOD:/caminho@peso`).                    | `--route=GET:/health@70 --route=POST:/login@30`           |
| `--profile`          | Gera perfis automáticos: `step`, `soak`, `spike`, `all`.           | `--profile=all`                                           |
| `--mode`             | Define execução manual: `rps` (taxa) ou `vus` (usuários virtuais). | `--mode=rps --rps=200 --duration=60`                      |
| `--concurrency`      | Nº de usuários virtuais no modo `vus`.                             | `--concurrency=500`                                       |
| `--rps`              | Requests por segundo no modo `rps`.                                | `--rps=400`                                               |
| `--duration`         | Duração da fase (s).                                               | `--duration=120`                                          |
| `--ramp`             | Tempo de ramp up inicial (s).                                      | `--ramp=15`                                               |
| `--timeout`          | Timeout de requests (ms).                                          | `--timeout=8000`                                          |
| `--insecure`         | Ignora TLS inválido.                                               | `--insecure=true`                                         |
| `--disableKeepAlive` | Desativa keep-alive.                                               | `--disableKeepAlive=true`                                 |
| `--json`             | Exporta métricas em JSON (append).                                 | `--json=resultados.json`                                  |
| `--csv`              | Exporta métricas em CSV (append).                                  | `--csv=resultados.csv`                                    |
| `--parallelTargets`  | Executa fases em todos os targets em paralelo.                     | `--parallelTargets=true`                                  |
| `--stopP95Ms`        | Para execução se p95 > limite (ms).                                | `--stopP95Ms=1200`                                        |
| `--stopErrPct`       | Para execução se % de erro > limite.                               | `--stopErrPct=2`                                          |

---

## 📊 Perfis de Teste

* **step** → RPS sobe em degraus (stress incremental).
* **soak** → Longa duração em carga estável (endurance).
* **spike** → Pico súbito de carga (resiliência).
* **all** → Combinação completa (step + cooldown + soak + recovery + spike).

---

### ⚡ Exemplos de Uso

```bash
# Smoke test simples
node core-pulse.js --baseURL=https://srv:3001 --mode=rps --rps=200 --duration=60

# Perfil completo (all) com warmup e saída JSON/CSV
node core-pulse.js --baseURL=https://srv:3001 --profile=all --warmup=15 --json=out.json --csv=out.csv

# Rotas ponderadas (70% health, 30% login)
node core-pulse.js --baseURL=https://srv:3001 --route=GET:/health@70 --route=POST:/login@30 --mode=rps --rps=400 --duration=120

# 🔥 Spike-to-failure (degrafos até quebrar)
node core-pulse.js \
  --baseURL=https://srv:3001 \
  --profile=step \
  --stepStartRps=300 --step=200 --stepMaxRps=8000 --phaseDur=30 \
  --warmup=10 \
  --stopP95Ms=1200 --stopErrPct=2 \
  --json=out.json --csv=out.csv

# 🔥 Saturação de conexões simultâneas (modo VUs)
node core-pulse.js \
  --baseURL=https://srv:3001 \
  --mode=vus --concurrency=20000 --duration=60 --ramp=0 --syncStart=true \
  --disableKeepAlive=true --maxSockets=100000 --timeout=15000 \
  --path=/health \
  --json=conn.json --csv=conn.csv

# 🔥 Resiliência final (endurance + spike)
node core-pulse.js \
  --baseURL=https://srv:3001 \
  --profile=all \
  --stepStartRps=400 --step=200 --stepMaxRps=5000 --phaseDur=45 \
  --warmup=15 \
  --stopP95Ms=1500 --stopErrPct=3 \
  --json=resilience.json --csv=resilience.csv
```

---

## Por que usar este script? 💡

### **Vantagens sobre ferramentas tradicionais:**

| Recurso                           | Core Pulse | Apache Bench | JMeter | Artillery |
| --------------------------------- | ---------- | ------------ | ------ | --------- |
| **Múltiplas rotas com peso**      | ✅          | ❌            | ✅      | ✅         |
| **Stop conditions inteligentes**  | ✅          | ❌            | ❌      | ❌         |
| **Perfis pré-configurados**       | ✅          | ❌            | ⚠️     | ⚠️        |
| **Ramp-up inteligente**           | ✅          | ❌            | ✅      | ✅         |
| **Métricas em tempo real**        | ✅          | ❌            | ⚠️     | ⚠️        |
| **Múltiplos targets simultâneos** | ✅          | ❌            | ✅      | ❌         |
| **Configuração via CLI**          | ✅          | ⚠️           | ❌      | ⚠️        |
| **Exportação JSON/CSV**           | ✅          | ❌            | ✅      | ✅         |

### **Ideal para:**

* **DevOps/SRE**: Testes de CI/CD e validação de deploy
* **Arquitetos**: Análise de capacidade e dimensionamento
* **Desenvolvedores**: Validação de performance durante desenvolvimento
* **QA**: Testes de regressão de performance

---

**Dependências:**

* Node.js >= 14.x
* axios (para requisições HTTP)

---

## Licença 📝

Este projeto está sob a **Apache License 2.0** (Janeiro 2004). Veja o arquivo `LICENSE` para mais detalhes.
