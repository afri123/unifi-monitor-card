// ================================================================
// UniFi Monitor Card  v0.0.13
// ================================================================

const UMC_VERSION = "0.0.13";

const UMC_DEFAULTS = {
  title:             "Network Infrastructure",
  title_icon:        "mdi:lan",
  auto_discover:     true,
  show_version:      true,
  show_temp:         true,
  show_uptime:       true,
  show_clients:      true,
  show_ip:           true,
  show_real_images:  true,
  image_base_url:    "https://raw.githubusercontent.com/cyberconsecurity/Unifi/main/",
  compact_mode:      false,
  sort_online_first: true,
  name_overrides:    {},
  style: {
    // Card container
    card_bg:            "var(--ha-card-background, var(--card-background-color, #fff))",
    card_padding:       "20px",
    card_border_radius: "16px",
    card_shadow:        "var(--ha-card-box-shadow, 0 2px 16px rgba(0,0,0,.07))",
    // Accent / brand
    accent_color:       "var(--primary-color, #2196f3)",
    // Typography
    font_family:        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    title_font_size:    "12px", 
    title_color:        "var(--secondary-text-color)",
    title_icon_color:   "var(--primary-color, #2196f3)",
    // Device rows
    device_bg:          "rgba(128,128,128,.05)",
    device_bg_hover:    "rgba(128,128,128,.10)",
    device_name_size:   "15px", 
    device_name_color:  "var(--primary-text-color)",
    // Meta / secondary text
    meta_color:         "var(--disabled-text-color, #9e9e9e)",
    // Status colors
    icon_online_color:  "#00c853",
    icon_offline_color: "#ff1744",
    // Bars
    bar_height:         "3px",
    bar_cpu_color:      "#2196f3",
    bar_ram_color:      "#9c27b0",
    bar_temp_color:     "#ff6d00",
  }
};

function _mergeConfig(config) {
  const out          = Object.assign({}, UMC_DEFAULTS, config);
  out.style          = Object.assign({}, UMC_DEFAULTS.style, config.style || {});
  out.name_overrides = Object.assign({}, config.name_overrides || {});
  return out;
}

// ── Helpers ──────────────────────────────────────────────────────

function _uptime(seconds) {
  if (!seconds || isNaN(+seconds)) return null;
  const s = Math.floor(+seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function _sev(val, warn = 70, crit = 90) {
  if (val >= crit) return "crit";
  if (val >= warn) return "warn";
  return "";
}

// ================================================================
// MAIN CARD
// ================================================================
class UnifiMonitorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config   = null;
    this._hass     = null;
    this._devices  = null;
    this._rendered = false;
  }

  static getConfigElement() { return document.createElement("unifi-monitor-card-editor"); }

  static getStubConfig() {
    return {
      title:         "Network Infrastructure",
      title_icon:    "mdi:lan",
      auto_discover: true,
      show_version:  true,
      show_temp:     true,
      show_uptime:   true,
      show_clients:  true,
      show_ip:       true,
      show_real_images: true,
    };
  }

  setConfig(config) {
    this._config   = _mergeConfig(config);
    this._rendered = false;
    this._devices  = null;
    if (this._hass) this._paint();
  }

  set hass(hass) {
    this._hass = hass;
    this._paint();
  }

  _paint() {
    if (!this._config || !this._hass) return;
    if (!this._devices)  this._devices  = this._discover();
    if (!this._rendered) { this._buildShell(); this._rendered = true; }
    this._update();
  }

  // ── Build shadow DOM (CSS + static skeleton) ─────────────────────
  _buildShell() {
    const s = this._config.style;
    const c = this._config;

    this.shadowRoot.innerHTML = `
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:host { display: block; }

/* ── Card ───────────────────────────────────────────────── */
.card {
  background:    ${s.card_bg};
  border-radius: ${s.card_border_radius};
  padding:       ${s.card_padding};
  box-shadow:    ${s.card_shadow};
  font-family:   ${s.font_family};
  color:         var(--primary-text-color);
  overflow:      hidden;
  position:      relative;
}
/* Subtle geometric accent corner */
.card::before {
  content:       '';
  position:      absolute;
  top: 0; right: 0;
  width: 56px; height: 56px;
  background:    ${s.accent_color};
  opacity:       .06;
  border-radius: 0 ${s.card_border_radius} 0 56px;
  pointer-events: none;
}

/* ── Header ─────────────────────────────────────────────── */
.header {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  margin-bottom:   16px;
  padding-bottom:  12px;
  border-bottom:   1px solid rgba(128,128,128,.10);
}
.header-left { display: flex; align-items: center; gap: 7px; }
.header-icon { --mdc-icon-size: 16px; color: ${s.title_icon_color}; opacity: .9; }
.card-title {
  font-size:      ${s.title_font_size};
  font-weight:    800;
  color:          ${s.title_color};
  letter-spacing: .12em;
  text-transform: uppercase;
}
.pills { display: flex; gap: 5px; }
.pill {
  font-size:      10px;
  font-weight:    700;
  padding:        2px 8px;
  border-radius:  20px;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.pill-on  { background: rgba(0,200,83,.12);  color: ${s.icon_online_color};  }
.pill-off { background: rgba(255,23,68,.12); color: ${s.icon_offline_color}; }

/* ── Device list ─────────────────────────────────────────── */
.devices { display: flex; flex-direction: column; gap: ${c.compact_mode ? "6px" : "8px"}; }

/* ── Device row ─────────────────────────────────────────── */
.row {
  background:    ${s.device_bg};
  border-radius: 10px;
  border:        1px solid transparent;
  padding:       ${c.compact_mode ? "10px 13px" : "13px 15px"};
  transition:    background .15s, border-color .15s;
  position:      relative;
  overflow:      hidden;
}
.row:hover { background: ${s.device_bg_hover}; border-color: rgba(128,128,128,.13); }
/* Online accent stripe */
.row::before {
  content:       '';
  position:      absolute;
  left: 0; top: 18%; bottom: 18%;
  width:         2px;
  border-radius: 2px;
  background:    transparent;
  transition:    background .3s;
}
.row.is-online::before  { background: ${s.icon_online_color}; }
.row.is-offline { opacity: .55; }

/* ── Top grid: icon · info · actions ────────────────────── */
.top {
  display:               grid;
  grid-template-columns: 34px 1fr auto;
  align-items:           start;
  gap:                   11px;
}

/* ── Status icon & Real Images ────────────────────────────── */
.sicon {
  width: 34px; height: 34px;
  border-radius: 8px;
  display:       flex;
  align-items:   center;
  justify-content: center;
  flex-shrink:   0;
  position:      relative;
  margin-top:    1px;
}
.sicon ha-icon { --mdc-icon-size: 18px; }
.sicon.is-online  { background: rgba(0,200,83,.09);  color: ${s.icon_online_color}; }
.sicon.is-offline { background: rgba(255,23,68,.08); color: ${s.icon_offline_color}; }

.real-img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  transition: filter 0.3s;
}
.row.is-offline .real-img {
  filter: grayscale(100%) opacity(60%);
}

.dot {
  position:      absolute;
  bottom: 3px; right: 3px;
  width: 6px; height: 6px;
  border-radius: 50%;
  background:    ${s.icon_online_color};
  animation:     umcDot 2.8s infinite ease-in-out;
  z-index: 2;
}
@keyframes umcDot {
  0%   { box-shadow: 0 0 0 0   rgba(0,200,83,.6); }
  60%  { box-shadow: 0 0 0 5px rgba(0,200,83,0);  }
  100% { box-shadow: 0 0 0 0   rgba(0,200,83,0);  }
}

/* ── Info col ───────────────────────────────────────────── */
.info { min-width: 0; }
.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}
.name-row {
  display:     flex;
  align-items: center;
  gap:         7px;
  flex-wrap:   wrap;
  flex: 1;
}
.name {
  font-size:      ${s.device_name_size};
  font-weight:    600;
  color:          ${s.device_name_color};
  cursor:         pointer;
  white-space:    nowrap;
  overflow:       hidden;
  text-overflow:  ellipsis;
  letter-spacing: -.01em;
  transition:     opacity .13s;
}
.name:hover { opacity: .65; }

/* ── Tags & Badges ───────────────────────────────────────── */
.type-tag {
  font-size:      9px;
  font-weight:    800;
  letter-spacing: .06em;
  padding:        2px 5px;
  border-radius:  4px;
  background:     rgba(128,128,128,.15);
  color:          ${s.meta_color};
  text-transform: uppercase;
}

.ip-tag {
  font-size:      9px;
  font-weight:    600;
  letter-spacing: .04em;
  padding:        2px 5px;
  border-radius:  4px;
  background:     rgba(128,128,128,.08);
  color:          ${s.meta_color};
  font-family:    monospace;
}

.client-badge {
  display:       flex;
  align-items:   center;
  gap:           4px;
  font-size:     11px;
  font-weight:   600;
  color:         var(--primary-text-color);
  background:    rgba(128,128,128,.08);
  padding:       3px 7px;
  border-radius:  6px;
  border:        1px solid rgba(128,128,128,.12);
  flex-shrink:   0;
}
.client-badge ha-icon { --mdc-icon-size: 13px; color: ${s.accent_color}; }

.badge {
  display:        inline-flex;
  align-items:    center;
  gap:            3px;
  background:     ${s.accent_color};
  color:          #fff;
  font-size:      8px;
  font-weight:    800;
  padding:        2px 6px 2px 5px;
  border-radius:  20px;
  cursor:         pointer;
  letter-spacing: .07em;
  text-transform: uppercase;
  white-space:    nowrap;
  animation:      umcBadge 2.2s infinite;
}
@keyframes umcBadge {
  0%,100% { box-shadow: 0 0 0 0   color-mix(in srgb, ${s.accent_color} 60%, transparent); }
  50%     { box-shadow: 0 0 0 5px color-mix(in srgb, ${s.accent_color} 0%,  transparent); }
}
.badge ha-icon { --mdc-icon-size: 9px; }

.offline-tag {
  font-size:      8px;
  font-weight:    700;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding:        2px 6px;
  border-radius:  4px;
  background:     rgba(255,23,68,.10);
  color:          ${s.icon_offline_color};
}

/* Meta chips */
.meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px; }
.chip {
  display:     flex;
  align-items: center;
  gap:         3px;
  font-size:   10px;
  color:       ${s.meta_color};
  letter-spacing: .02em;
}
.chip ha-icon { --mdc-icon-size: 11px; opacity: .6; }

/* ── Action buttons ─────────────────────────────────────── */
.actions { display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
.btn {
  background:    transparent;
  border:        1px solid rgba(128,128,128,.18);
  color:         var(--secondary-text-color);
  width: 28px; height: 28px;
  border-radius: 7px;
  cursor:        pointer;
  display:       flex;
  align-items:   center;
  justify-content: center;
  transition:    all .14s;
}
.btn:hover {
  background:   rgba(128,128,128,.12);
  border-color: rgba(128,128,128,.30);
  color:        var(--primary-text-color);
}
.btn ha-icon { --mdc-icon-size: 15px; }

/* ── Metrics ─────────────────────────────────────────────── */
.metrics {
  margin-top:  ${c.compact_mode ? "9px" : "11px"};
  padding-top: ${c.compact_mode ? "9px" : "11px"};
  border-top:  1px solid rgba(128,128,128,.08);
  display:     flex;
  flex-direction: column;
  gap:         ${c.compact_mode ? "5px" : "6px"};
}
.mrow {
  display:               grid;
  grid-template-columns: 30px 1fr 32px;
  align-items:           center;
  gap:                   8px;
}
.mlabel {
  font-size:      9px;
  font-weight:    700;
  letter-spacing: .10em;
  text-transform: uppercase;
  color:          ${s.meta_color};
}
.track {
  height:        ${s.bar_height};
  background:    rgba(128,128,128,.13);
  border-radius: 99px;
  overflow:      hidden;
}
.fill {
  height:     100%;
  border-radius: 99px;
  transition: width .65s cubic-bezier(.4,0,.2,1);
}
.fill-cpu  { background: ${s.bar_cpu_color};  }
.fill-ram  { background: ${s.bar_ram_color};  }
.fill-temp { background: ${s.bar_temp_color}; }
.fill.warn { filter: brightness(1.25); }
.fill.crit { filter: brightness(1.5) saturate(1.3); }

.mval {
  font-size:   10px;
  font-weight: 700;
  text-align:  right;
  letter-spacing: .02em;
  font-variant-numeric: tabular-nums;
  color:       var(--primary-text-color);
}
.mval.warn { color: #ffab00; }
.mval.crit { color: ${s.icon_offline_color}; }

/* ── Empty state ─────────────────────────────────────────── */
.empty {
  padding:    36px 20px;
  text-align: center;
  color:      ${s.meta_color};
  font-size:  13px;
  line-height: 1.6;
}
.empty ha-icon { --mdc-icon-size: 36px; display: block; margin: 0 auto 10px; opacity: .22; }
</style>

<div class="card">
  <div class="header" id="hdr" style="display:none">
    <div class="header-left">
      <ha-icon class="header-icon" id="ttl-icon" icon="mdi:lan"></ha-icon>
      <span class="card-title" id="ttl"></span>
    </div>
    <div class="pills" id="pls"></div>
  </div>
  <div class="devices" id="dev"></div>
</div>`;

    this._hdrEl = this.shadowRoot.getElementById("hdr");
    this._ttlEl = this.shadowRoot.getElementById("ttl");
    this._devEl = this.shadowRoot.getElementById("dev");
    this._plsEl = this.shadowRoot.getElementById("pls");
  }

  // ── Discover UniFi devices via entity pattern matching ───────────
  _discover() {
    if (!this._hass) return [];
    const prefixes = new Set();
    for (const id in this._hass.states)
      if (id.startsWith("sensor.") && id.endsWith("_cpu_utilization"))
        prefixes.add(id.slice(7, -16));

    const out = [];
    prefixes.forEach(pfx => {
      const ent  = this._hass.states[`sensor.${pfx}_cpu_utilization`];
      const name = (ent?.attributes?.friendly_name || pfx)
                     .split(" (")[0]
                     .replace(/ cpu utilization/i, "")
                     .trim();
      let icon = "mdi:router-network";
      let type_label = "GATEWAY";
      
      if (/usw|switch/.test(pfx)) { icon = "mdi:switch"; type_label = "SWITCH"; }
      else if (/u6|uap|^ap_|wifi|iw|flex/.test(pfx)) { icon = "mdi:access-point"; type_label = "AP"; }
      
      out.push({ prefix: pfx, name, icon, type_label });
    });
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ── Re-render live data ───────────────────────────────────────────
  _update() {
    if (!this._devEl || !this._hass) return;
    const cfg = this._config;

    // Header
    if (cfg.title || cfg.title_icon) {
      this._ttlEl.textContent   = cfg.title || "";
      this.shadowRoot.getElementById("ttl-icon").icon = cfg.title_icon || "mdi:lan";
      this._hdrEl.style.display = "flex";
    } else {
      this._hdrEl.style.display = "none";
    }

    // Active device list
    const raw = (cfg.devices?.length > 0) ? cfg.devices : this._devices;
    if (!raw || raw.length === 0) {
      this._devEl.innerHTML = `
        <div class="empty">
          <ha-icon icon="mdi:lan-disconnect"></ha-icon>
          No UniFi devices found.<br>
          Make sure the UniFi Network integration is configured.
        </div>`;
      this._plsEl.innerHTML = "";
      return;
    }

    const ONLINE_STATES = ["connected", "online", "home"];
    const devices = raw.map(dev => {
      const so = this._hass.states[`sensor.${dev.prefix}_state`];
      return { ...dev, online: so ? ONLINE_STATES.includes(so.state?.toLowerCase()) : false };
    });

    if (cfg.sort_online_first)
      devices.sort((a, b) => (+b.online - +a.online) || a.name.localeCompare(b.name));

    // Summary pills
    const nOn  = devices.filter(d => d.online).length;
    const nOff = devices.length - nOn;
    this._plsEl.innerHTML =
      `<span class="pill pill-on">${nOn} online</span>` +
      (nOff > 0 ? `<span class="pill pill-off">${nOff} offline</span>` : "");

    // Build HTML
    let html = "";
    for (const dev of devices) {
      const p   = dev.prefix;
      const nom = cfg.name_overrides[p] || dev.name || p;
      const typeLabel = dev.type_label || "DEVICE";

      const cpuEnt = this._hass.states[`sensor.${p}_cpu_utilization`];
      const ramEnt = this._hass.states[`sensor.${p}_memory_utilization`];
      const tmpEnt = this._hass.states[`sensor.${p}_temperature`]
                  || this._hass.states[`sensor.${p}_cpu_temperature`];
      const uptEnt = this._hass.states[`sensor.${p}_uptime`];
      const updEnt = this._hass.states[`update.${p}`];
      const hasRst = !!this._hass.states[`button.${p}_restart`];

      const hasUpd  = updEnt?.state === "on";
      const version = updEnt?.attributes?.installed_version
                   || updEnt?.attributes?.latest_version
                   || null;

      // Smarte IP Extraktion
      const rawName = cpuEnt?.attributes?.friendly_name || p;
      const ipMatch = rawName.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
      const ipAddr  = this._hass.states[`sensor.${p}_ip_address`]?.state || (ipMatch ? ipMatch[0] : null);

      // Smarte Client Extraktion
      let cli = null;
      const cliEnt = this._hass.states[`sensor.${p}_clients`] 
                  || this._hass.states[`sensor.${p}_users`] 
                  || this._hass.states[`sensor.${p}_num_sta`];
      if (cliEnt && !isNaN(parseInt(cliEnt.state, 10))) {
        cli = parseInt(cliEnt.state, 10);
      } else {
        const wless = this._hass.states[`sensor.${p}_wireless_clients`];
        const wired = this._hass.states[`sensor.${p}_wired_clients`];
        if (wless || wired) {
          cli = (wless ? parseInt(wless.state, 10) || 0 : 0) + (wired ? parseInt(wired.state, 10) || 0 : 0);
        }
      }

      const cpu = cpuEnt ? parseFloat(cpuEnt.state) : null;
      const ram = ramEnt ? parseFloat(ramEnt.state) : null;
      const tmp = tmpEnt ? parseFloat(tmpEnt.state) : null;
      const upt = uptEnt ? _uptime(uptEnt.state)    : null;

      const cpuSev = cpu != null ? _sev(cpu)           : "";
      const ramSev = ram != null ? _sev(ram)           : "";
      const tmpSev = tmp != null ? _sev(tmp, 65, 80)   : "";

      // Meta chips
      const chips = [];
      if (cfg.show_version && version)
        chips.push(`<span class="chip"><ha-icon icon="mdi:tag-outline"></ha-icon>${version}</span>`);
      if (cfg.show_uptime && upt)
        chips.push(`<span class="chip"><ha-icon icon="mdi:clock-outline"></ha-icon>${upt}</span>`);

      // Bars
      const bars = [];
      if (cpu != null && !isNaN(cpu))
        bars.push(this._bar("CPU", "cpu", cpu, cpuSev, `${cpu.toFixed(0)}%`));
      if (ram != null && !isNaN(ram))
        bars.push(this._bar("RAM", "ram", ram, ramSev, `${ram.toFixed(0)}%`));
      if (cfg.show_temp && tmp != null && !isNaN(tmp))
        bars.push(this._bar("TMP", "temp", Math.min(tmp, 100), tmpSev, `${tmp.toFixed(0)}°`));

      const baseUrl = cfg.image_base_url || "https://raw.githubusercontent.com/cyberconsecurity/Unifi/main/";
      const imgUrl = `${baseUrl}${p}.png`;

      html += `
<div class="row${dev.online ? " is-online" : " is-offline"}">
  <div class="top">
    <div class="sicon ${dev.online ? "is-online" : "is-offline"}">
      ${cfg.show_real_images 
        ? `<img class="real-img" src="${imgUrl}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
           <ha-icon icon="${dev.icon || "mdi:router-network"}" style="display:none;"></ha-icon>`
        : `<ha-icon icon="${dev.icon || "mdi:router-network"}"></ha-icon>`
      }
      ${dev.online ? '<span class="dot"></span>' : ""}
    </div>
    <div class="info">
      <div class="info-header">
        <div class="name-row">
          <span class="name" onclick="this.getRootNode().host._openDetails('${p}')">${nom}</span>
          <span class="type-tag">${typeLabel}</span>
          ${(cfg.show_ip && ipAddr) ? `<span class="ip-tag">${ipAddr}</span>` : ""}
          ${!dev.online ? `<span class="offline-tag">offline</span>` : ""}
          ${hasUpd
            ? `<span class="badge" onclick="this.getRootNode().host._triggerUpdate('${p}')">
                 <ha-icon icon="mdi:arrow-up-circle"></ha-icon>Update
               </span>`
            : ""}
        </div>
        ${(cfg.show_clients && cli != null) 
          ? `<div class="client-badge" title="Connected Clients">
               <ha-icon icon="mdi:account-multiple"></ha-icon> ${cli}
             </div>` 
          : ""}
      </div>
      ${chips.length ? `<div class="meta">${chips.join("")}</div>` : ""}
    </div>
    <div class="actions">
      ${hasRst
        ? `<button class="btn" title="Restart" onclick="this.getRootNode().host._triggerRestart('${p}')">
             <ha-icon icon="mdi:restart"></ha-icon>
           </button>`
        : ""}
      <button class="btn" title="Details" onclick="this.getRootNode().host._openDetails('${p}')">
        <ha-icon icon="mdi:information-outline"></ha-icon>
      </button>
    </div>
  </div>
  ${bars.length ? `<div class="metrics">${bars.join("")}</div>` : ""}
</div>`;
    }

    this._devEl.innerHTML = html;
  }

  _bar(label, type, pct, sev, valStr) {
    return `
<div class="mrow">
  <span class="mlabel">${label}</span>
  <div class="track">
    <div class="fill fill-${type}${sev ? " " + sev : ""}" style="width:${Math.min(Math.max(pct, 0), 100).toFixed(1)}%"></div>
  </div>
  <span class="mval${sev ? " " + sev : ""}">${valStr}</span>
</div>`;
  }

  // ── Actions ───────────────────────────────────────────────────────
  _openDetails(pfx) {
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId: `sensor.${pfx}_cpu_utilization` },
      bubbles: true, composed: true,
    }));
  }
  _triggerRestart(pfx) {
    const nom = this._config.name_overrides[pfx]
             || this._devices?.find(d => d.prefix === pfx)?.name
             || pfx;
    if (confirm(`Restart "${nom}"?`))
      this._hass.callService("button", "press", { entity_id: `button.${pfx}_restart` });
  }
  _triggerUpdate(pfx) {
    const nom = this._config.name_overrides[pfx]
             || this._devices?.find(d => d.prefix === pfx)?.name
             || pfx;
    if (confirm(`Install firmware update for "${nom}"?`))
      this._hass.callService("update", "install", { entity_id: `update.${pfx}` });
  }

  getCardSize() { return (this._devices?.length || 2) + 1; }
}


// ================================================================
// EDITOR
// Renders the DOM exactly once (_build).
// Every subsequent setConfig() call only pushes new values into
// the existing elements (_sync) — so accordions stay open and
// switches do not snap back.
// ================================================================
class UnifiMonitorCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass   = null;
    this._built  = false;
  }

  setConfig(config) {
    this._config = _mergeConfig(config);
    if   (this._built)   this._sync();
    else if (this._hass) this._build();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._config && !this._built) this._build();
  }

  // ── Build editor DOM once ─────────────────────────────────────────
  _build() {
    if (this._built) return;
    this._built = true;

    this.shadowRoot.innerHTML = `
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:host { display: block; font-family: var(--primary-font-family, 'Roboto', sans-serif); }

details {
  border:        1px solid var(--divider-color, rgba(0,0,0,.10));
  border-radius: 10px;
  margin-bottom: 8px;
  background:    var(--card-background-color, #fff);
  overflow:      hidden;
}
summary {
  display:       flex;
  align-items:   center;
  gap:           8px;
  cursor:        pointer;
  padding:       11px 14px;
  font-size:     11px;
  font-weight:   700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color:         var(--secondary-text-color);
  user-select:   none;
  list-style:    none;
  outline:       none;
  background:    rgba(0,0,0,.02);
}
summary::after {
  content: '›'; margin-left: auto;
  font-size: 15px; line-height: 1;
  transition: transform .18s;
}
details[open] summary::after { transform: rotate(90deg); }
summary ha-icon { --mdc-icon-size: 14px; }

.content { padding: 14px 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.row2    { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sw-row  {
  display:         flex;
  align-items:     center;
  justify-content: space-between;
  min-height:      38px; gap: 12px;
}
.sw-label { font-size: 13px; color: var(--primary-text-color); }
.sw-sub   { font-size: 11px; color: var(--secondary-text-color); margin-top: 1px; }
ha-textfield, ha-icon-picker { width: 100%; }
.hint {
  font-size:   11px;
  color:       var(--secondary-text-color);
  line-height: 1.55;
  margin-top: -4px;
}
code {
  font-family:   'DM Mono','Roboto Mono',monospace;
  font-size:     10px;
  background:    rgba(128,128,128,.1);
  padding:       1px 4px;
  border-radius: 3px;
}
</style>

<details open>
  <summary><ha-icon icon="mdi:cog-outline"></ha-icon>General</summary>
  <div class="content">
    <div class="row2">
      <ha-textfield id="f_title" label="Card title"></ha-textfield>
      <ha-icon-picker id="f_title_icon" label="Title icon"></ha-icon-picker>
    </div>
    <div class="sw-row">
      <div><div class="sw-label">Auto-discover devices</div><div class="sw-sub">Scan HA for UniFi entities</div></div>
      <ha-switch id="sw_auto"></ha-switch>
    </div>
    <div class="sw-row">
      <div class="sw-label">Sort online devices first</div>
      <ha-switch id="sw_sort"></ha-switch>
    </div>
    <div class="sw-row">
      <div><div class="sw-label">Compact mode</div><div class="sw-sub">Reduced spacing</div></div>
      <ha-switch id="sw_compact"></ha-switch>
    </div>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:eye-outline"></ha-icon>Display Options</summary>
  <div class="content">
    <div class="sw-row">
      <div class="sw-label">Firmware version</div>
      <ha-switch id="sw_version"></ha-switch>
    </div>
    <div class="sw-row">
      <div class="sw-label">Temperature bar</div>
      <ha-switch id="sw_temp"></ha-switch>
    </div>
    <div class="sw-row">
      <div class="sw-label">Uptime</div>
      <ha-switch id="sw_uptime"></ha-switch>
    </div>
    <div class="sw-row">
      <div class="sw-label">Connected clients (Badge)</div>
      <ha-switch id="sw_clients"></ha-switch>
    </div>
    <div class="sw-row">
      <div class="sw-label">IP Address</div>
      <ha-switch id="sw_ip"></ha-switch>
    </div>
    <div class="sw-row">
      <div><div class="sw-label">Real Device Images</div><div class="sw-sub">Load images instead of icons</div></div>
      <ha-switch id="sw_real_images"></ha-switch>
    </div>
    <ha-textfield id="f_image_base_url" label="Image Base URL"></ha-textfield>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:palette-outline"></ha-icon>Card Styling</summary>
  <div class="content">
    <ha-textfield id="f_card_bg" label="Background"></ha-textfield>
    <p class="hint">Any CSS value: <code>#1c1c1e</code> · <code>rgba(255,255,255,.9)</code> · <code>var(--ha-card-background)</code></p>
    <div class="row2">
      <ha-textfield id="f_card_border_radius" label="Border radius"></ha-textfield>
      <ha-textfield id="f_card_padding"       label="Padding"></ha-textfield>
    </div>
    <ha-textfield id="f_card_shadow"  label="Box shadow"></ha-textfield>
    <ha-textfield id="f_accent_color" label="Accent color"></ha-textfield>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:format-text"></ha-icon>Typography</summary>
  <div class="content">
    <ha-textfield id="f_font_family" label="Global Font Family"></ha-textfield>
    <p class="hint">e.g. <code>var(--primary-font-family)</code>, <code>Roboto</code>, or <code>sans-serif</code>.</p>
    <div class="row2">
      <ha-textfield id="f_title_font_size"   label="Title size"></ha-textfield>
      <ha-textfield id="f_title_color"       label="Title color"></ha-textfield>
    </div>
    <ha-textfield id="f_title_icon_color"  label="Title icon color"></ha-textfield>
    <div class="row2">
      <ha-textfield id="f_device_name_size"  label="Name size"></ha-textfield>
      <ha-textfield id="f_device_name_color" label="Name color"></ha-textfield>
    </div>
    <ha-textfield id="f_meta_color" label="Meta / secondary text color"></ha-textfield>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:server-outline"></ha-icon>Device Rows</summary>
  <div class="content">
    <ha-textfield id="f_device_bg"       label="Row background"></ha-textfield>
    <ha-textfield id="f_device_bg_hover" label="Row background (hover)"></ha-textfield>
    <div class="row2">
      <ha-textfield id="f_icon_online_color"  label="Online color"></ha-textfield>
      <ha-textfield id="f_icon_offline_color" label="Offline color"></ha-textfield>
    </div>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:chart-bar"></ha-icon>Metric Bars</summary>
  <div class="content">
    <ha-textfield id="f_bar_height" label="Bar height (e.g. 3px)"></ha-textfield>
    <div class="row2">
      <ha-textfield id="f_bar_cpu_color"  label="CPU color"></ha-textfield>
      <ha-textfield id="f_bar_ram_color"  label="RAM color"></ha-textfield>
    </div>
    <ha-textfield id="f_bar_temp_color" label="Temperature color"></ha-textfield>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:rename-outline"></ha-icon>Device Name Aliases</summary>
  <div class="content" id="alias-list">
    <p class="hint">Override the auto-discovered display name for each device.</p>
  </div>
</details>`;

    this._buildAliases();
    this._sync();
    this._bind();
  }

  _buildAliases() {
    const list = this.shadowRoot.getElementById("alias-list");
    if (!list || !this._hass) return;
    const hint = list.querySelector("p");
    list.innerHTML = "";
    if (hint) list.appendChild(hint);

    const prefixes = [];
    for (const id in this._hass.states)
      if (id.startsWith("sensor.") && id.endsWith("_cpu_utilization"))
        prefixes.push(id.slice(7, -16));
    prefixes.sort();

    if (prefixes.length === 0) {
      const p = document.createElement("p");
      p.className = "hint";
      p.textContent = "No UniFi devices discovered yet.";
      list.appendChild(p);
      return;
    }

    for (const pfx of prefixes) {
      const tf = document.createElement("ha-textfield");
      tf.style.width        = "100%";
      tf.style.marginBottom = "6px";
      tf.label              = `Alias for: ${pfx}`;
      tf.value              = (this._config.name_overrides || {})[pfx] || "";
      tf.dataset.aliasPfx   = pfx;
      tf.addEventListener("change", e => this._onChange(e));
      list.appendChild(tf);
    }
  }

  _bind() {
    this.shadowRoot.querySelectorAll("ha-textfield").forEach(el =>
      el.addEventListener("change", e => this._onChange(e)));
    this.shadowRoot.querySelectorAll("ha-switch").forEach(el =>
      el.addEventListener("change", e => this._onChange(e)));
    this.shadowRoot.querySelectorAll("ha-icon-picker").forEach(el =>
      el.addEventListener("value-changed", e => this._onChange(e)));
  }

  static get _MAP() {
    return {
      f_title:               ["title"],
      f_title_icon:          ["title_icon"],
      sw_auto:               ["auto_discover"],
      sw_sort:               ["sort_online_first"],
      sw_compact:            ["compact_mode"],
      sw_version:            ["show_version"],
      sw_temp:               ["show_temp"],
      sw_uptime:             ["show_uptime"],
      sw_clients:            ["show_clients"],
      sw_ip:                 ["show_ip"],
      sw_real_images:        ["show_real_images"],
      f_image_base_url:      ["image_base_url"],
      f_card_bg:             ["style", "card_bg"],
      f_card_border_radius:  ["style", "card_border_radius"],
      f_card_padding:        ["style", "card_padding"],
      f_card_shadow:         ["style", "card_shadow"],
      f_accent_color:        ["style", "accent_color"],
      f_font_family:         ["style", "font_family"],
      f_title_font_size:     ["style", "title_font_size"],
      f_title_color:         ["style", "title_color"],
      f_title_icon_color:    ["style", "title_icon_color"],
      f_device_name_size:    ["style", "device_name_size"],
      f_device_name_color:   ["style", "device_name_color"],
      f_meta_color:          ["style", "meta_color"],
      f_device_bg:           ["style", "device_bg"],
      f_device_bg_hover:     ["style", "device_bg_hover"],
      f_icon_online_color:   ["style", "icon_online_color"],
      f_icon_offline_color:  ["style", "icon_offline_color"],
      f_bar_height:          ["style", "bar_height"],
      f_bar_cpu_color:       ["style", "bar_cpu_color"],
      f_bar_ram_color:       ["style", "bar_ram_color"],
      f_bar_temp_color:      ["style", "bar_temp_color"],
    };
  }

  _sync() {
    const c = this._config;
    const s = c.style;

    const set = (id, v) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.value = String(v ?? "");
    };
    const chk = (id, v) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.checked = !!v;
    };

    set("f_title",              c.title || "");
    set("f_title_icon",         c.title_icon || "");
    chk("sw_auto",              c.auto_discover      !== false);
    chk("sw_sort",              c.sort_online_first  !== false);
    chk("sw_compact",           !!c.compact_mode);
    chk("sw_version",           c.show_version       !== false);
    chk("sw_temp",              c.show_temp          !== false);
    chk("sw_uptime",            c.show_uptime        !== false);
    chk("sw_clients",           c.show_clients       !== false);
    chk("sw_ip",                c.show_ip            !== false);
    chk("sw_real_images",       c.show_real_images   !== false);
    set("f_image_base_url",     c.image_base_url || "");
    set("f_card_bg",            s.card_bg);
    set("f_card_border_radius", s.card_border_radius);
    set("f_card_padding",       s.card_padding);
    set("f_card_shadow",        s.card_shadow);
    set("f_accent_color",       s.accent_color);
    set("f_font_family",        s.font_family);
    set("f_title_font_size",    s.title_font_size);
    set("f_title_color",        s.title_color);
    set("f_title_icon_color",   s.title_icon_color);
    set("f_device_name_size",   s.device_name_size);
    set("f_device_name_color",  s.device_name_color);
    set("f_meta_color",         s.meta_color);
    set("f_device_bg",          s.device_bg);
    set("f_device_bg_hover",    s.device_bg_hover);
    set("f_icon_online_color",  s.icon_online_color);
    set("f_icon_offline_color", s.icon_offline_color);
    set("f_bar_height",         s.bar_height);
    set("f_bar_cpu_color",      s.bar_cpu_color);
    set("f_bar_ram_color",      s.bar_ram_color);
    set("f_bar_temp_color",     s.bar_temp_color);

    const list = this.shadowRoot.getElementById("alias-list");
    if (list) {
      list.querySelectorAll("[data-alias-pfx]").forEach(el => {
        el.value = (c.name_overrides || {})[el.dataset.aliasPfx] || "";
      });
    }
  }

  _onChange(ev) {
    if (!this._config) return;
    const el    = ev.target;
    let value   = el.value;
    
    // Für ha-icon-picker und ha-switch
    if (ev.type === "value-changed") value = ev.detail.value;
    if (el.tagName === "HA-SWITCH") value = el.checked;
    
    const newCfg = _mergeConfig(this._config);

    if (el.dataset.aliasPfx) {
      if (value) newCfg.name_overrides[el.dataset.aliasPfx] = value;
      else        delete newCfg.name_overrides[el.dataset.aliasPfx];
    } else {
      const path = UnifiMonitorCardEditor._MAP[el.id];
      if (!path) return;
      if (path.length === 1)          newCfg[path[0]]       = value;
      else if (path[0] === "style")   newCfg.style[path[1]] = value;
    }

    this._config = newCfg;
    this.dispatchEvent(new CustomEvent("config-changed",
      { detail: { config: newCfg }, bubbles: true, composed: true }));
  }
}

// ================================================================
customElements.define("unifi-monitor-card",        UnifiMonitorCard);
customElements.define("unifi-monitor-card-editor", UnifiMonitorCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type:        "unifi-monitor-card",
  name:        "UniFi Monitor Card",
  preview:     true,
  description: `v${UMC_VERSION} · Auto-discovery · CPU · RAM · Temp · Uptime · Clients · Full visual editor`,
});
