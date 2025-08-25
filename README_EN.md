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
