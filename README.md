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
