
class SubnetCalculator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          max-width: 460px;
          font-family: system-ui, sans-serif;
        }

        label {
          display: block;
          margin-top: 0.6rem;
          color: var(--label-color, #000);
        }

        input, select {
          width: 100%;
          padding: 0.4rem;
          margin-top: 0.2rem;
        }

        .results {
          margin-top: 1rem;
          color: var(--label-color, #000);
        }

        .error {
          color: #c00;
          margin-top: 0.5rem;
        }
      </style>

      <label>
        IP Address
        <input data-ip placeholder="192.168.1.10">
      </label>

      <label>
        CIDR
        <input data-cidr type="number" min="0" max="32">
      </label>

      <label>
        Subnet Mask
        <select data-mask></select>
      </label>

      <div class="error" data-error></div>

      <div class="results">
        <div><strong>Network:</strong> <span data-net></span></div>
        <div><strong>Broadcast:</strong> <span data-bc></span></div>
        <div><strong>Subnet Mask:</strong> <span data-sm></span></div>
        <div><strong>Wildcard:</strong> <span data-wc></span></div>
        <div><strong>Usable Hosts:</strong> <span data-hosts></span></div>
      </div>
    `;
  }

  connectedCallback() {
    this.cacheElements();
    this.populateMasks();
    this.bindEvents();

    const defaultCidr = this.getAttribute("cidr") ?? 24;
    this.cidr.value = defaultCidr;
    this.syncFromCidr();
  }

  /* ---------- element cache ---------- */
  cacheElements() {
    const r = this.shadowRoot;
    this.ip = r.querySelector("[data-ip]");
    this.cidr = r.querySelector("[data-cidr]");
    this.mask = r.querySelector("[data-mask]");
    this.error = r.querySelector("[data-error]");
    this.net = r.querySelector("[data-net]");
    this.bc = r.querySelector("[data-bc]");
    this.sm = r.querySelector("[data-sm]");
    this.wc = r.querySelector("[data-wc]");
    this.hosts = r.querySelector("[data-hosts]");
  }

  /* ---------- helpers ---------- */
  ipToInt(ip) {
    return ip.split('.').reduce((a,o)=> (a<<8)+ +o,0)>>>0;
  }

  intToIp(n) {
    return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
  }

  validIPv4(ip) {
    return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
           ip.split('.').every(o => +o >= 0 && +o <= 255);
  }

  cidrToMask(c) {
    return c === 0 ? 0 : (~0 << (32 - c)) >>> 0;
  }

  /* ---------- setup ---------- */
  populateMasks() {
    for (let c = 0; c <= 32; c++) {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = this.intToIp(this.cidrToMask(c));
      this.mask.appendChild(opt);
    }
  }

  bindEvents() {
    this.ip.addEventListener("input", () => this.calc());
    this.cidr.addEventListener("input", () => this.syncFromCidr());
    this.mask.addEventListener("change", () => this.syncFromMask());
  }

  /* ---------- syncing ---------- */
  syncFromCidr() {
    const c = +this.cidr.value;
    if (c < 0 || c > 32) return;
    this.mask.value = c;
    this.calc();
  }

  syncFromMask() {
    this.cidr.value = this.mask.value;
    this.calc();
  }

  /* ---------- calculation ---------- */
  calc() {
    this.error.textContent = "";
    const ip = this.ip.value.trim();
    if (!ip) return;

    if (!this.validIPv4(ip)) {
      this.error.textContent = "Invalid IPv4 address";
      return;
    }

    const c = +this.cidr.value;
    const ipInt = this.ipToInt(ip);
    const maskInt = this.cidrToMask(c);
    const wildcard = (~maskInt) >>> 0;

    const network = ipInt & maskInt;
    const broadcast = network | wildcard;

    this.net.textContent = this.intToIp(network);
    this.bc.textContent = this.intToIp(broadcast);
    this.sm.textContent = this.intToIp(maskInt);
    this.wc.textContent = this.intToIp(wildcard);
    this.hosts.textContent = c >= 31 ? 0 : (2 ** (32 - c) - 2);
  }
}

customElements.define("subnet-calculator", SubnetCalculator);

