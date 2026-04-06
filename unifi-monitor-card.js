// ================================================================
// UniFi Monitor Card  v0.0.18
// ================================================================

const UMC_VERSION = "0.0.18";

// Hardcoded list of exact filenames from the repository for the picker
const UNIFI_IMAGES = [
  "UDM.png", "UDM-Pro.png", "UDM-SE.png", "UDR.png", "UX.png", "UXG-Lite.png", "UXG-Pro.png", "UXG-Max.png",
  "USG.png", "USG-Pro-4.png",
  "U6-Lite.png", "U6-LR.png", "U6-Pro.png", "U6-Enterprise.png", "U6-Mesh.png", "U6-Extender.png", "U6-IW.png", "U6-Enterprise-IW.png",
  "U7-Pro.png", "U7-Pro-Max.png",
  "UAP-AC-Lite.png", "UAP-AC-LR.png", "UAP-AC-Pro.png", "UAP-AC-M.png", "UAP-AC-M-Pro.png", "UAP-AC-IW.png", "UAP-nanoHD.png", "UAP-FlexHD.png", "UAP-BeaconHD.png",
  "USW-Flex-Mini.png", "USW-Flex.png", "USW-Lite-8-PoE.png", "USW-Lite-16-PoE.png",
  "USW-16-PoE.png", "USW-24-PoE.png", "USW-48-PoE.png", "USW-24.png", "USW-48.png",
  "USW-Pro-8-PoE.png", "USW-Pro-24-PoE.png", "USW-Pro-48-PoE.png",
  "USW-Enterprise-8-PoE.png", "USW-Enterprise-24-PoE.png", "USW-Enterprise-48-PoE.png",
  "USW-Aggregation.png", "USW-Pro-Aggregation.png",
  "US-8.png", "US-8-60W.png", "US-8-150W.png", "US-16-150W.png", "US-24-250W.png", "US-48-500W.png"
];

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
  image_overrides:   {},
  style: {
    card_bg:            "var(--ha-card-background, var(--card-background-color, #fff))",
    card_padding:       "20px",
    card_border_radius: "16px",
    card_shadow:        "var(--ha-card-box-shadow, 0 2px 16px rgba(0,0,0,.07))",
    accent_color:       "var(--primary-color, #2196f3)",
    font_family:        "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    title_font_family:  "inherit", 
    title_text_transform: "uppercase", 
    title_font_size:    "12px", 
    title_color:        "var(--secondary-text-color)",
    title_icon_color:   "var(--primary-color, #2196f3)",
    device_bg:          "rgba(128,128,128,.05)",
    device_bg_hover:    "rgba(128,128,128,.10)",
    device_name_size:   "15px", 
    device_name_color:  "var(--primary-text-color)",
    meta_color:         "var(--disabled-text-color, #9e9e9e)",
    icon_online_color:  "#00c853",
    icon_offline_color: "#ff1744",
    bar_height:         "3px",
    bar_cpu_color:      "#2196f3",
    bar_ram_color:      "#9c27b0",
    bar_temp_color:     "#ff6d00",
  }
};

function _mergeConfig(config) {
  const out           = Object.assign({}, UMC_DEFAULTS, config);
  out.style           = Object.assign({}, UMC_DEFAULTS.style, config.style || {});
  out.name_overrides  = Object.assign({}, config.name_overrides || {});
  out.image_overrides = Object.assign({}, config.image_overrides || {});
  return out;
}

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
  static getStubConfig() { return { title: "Network Infrastructure", title_icon: "mdi:lan" }; }

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

  _buildShell() {
    const s = this._config.style;
    const c = this._config;

    this.shadowRoot.innerHTML = `
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:host { display: block; }

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
.card::before {
  content: ''; position: absolute; top: 0; right: 0;
  width: 56px; height: 56px; background: ${s.accent_color};
  opacity: .06; border-radius: 0 ${s.card_border_radius} 0 56px; pointer-events: none;
}

.header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid rgba(128,128,128,.10);
}
.header-left { display: flex; align-items: center; gap: 7px; }
.header-icon { --mdc-icon-size: 16px; color: ${s.title_icon_color}; opacity: .9; }
.card-title {
  font-family: ${s.title_font_family === 'inherit' ? s.font_family : s.title_font_family};
  font-size: ${s.title_font_size}; font-weight: 800; color: ${s.title_color};
  letter-spacing: .12em; text-transform: ${s.title_text_transform};
}
.pills { display: flex; gap: 5px; }
.pill {
  font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px;
  letter-spacing: .04em; text-transform: uppercase;
}
.pill-on  { background: rgba(0,200,83,.12);  color: ${s.icon_online_color};  }
.pill-off { background: rgba(255,23,68,.12); color: ${s.icon_offline_color}; }

.devices { display: flex; flex-direction: column; gap: ${c.compact_mode ? "6px" : "8px"}; }

/* DEVICE ROW */
.row {
  background:    ${s.device_bg};
  border-radius: 10px;
  border:        1px solid transparent;
  padding:       ${c.compact_mode ? "10px 13px" : "13px 15px"};
  transition:    background-color 0.2s ease, border-color 0.2s ease;
  position:      relative;
  overflow:      hidden;
  transform:     translateZ(0); 
  cursor:        default;
}
.row:hover { background-color: ${s.device_bg_hover}; border-color: rgba(128,128,128,.13); }
.row::before {
  content: ''; position: absolute; left: 0; top: 18%; bottom: 18%;
  width: 2px; border-radius: 2px; background: transparent;
  transition: background .3s; pointer-events: none;
}
.row.is-online::before  { background: ${s.icon_online_color}; }
.row.is-offline { opacity: .55; }

/* HOVER FLICKER FIX: Disable pointer events on internal structural elements */
.top, .metrics { pointer-events: none; }
/* Re-enable interaction ONLY for explicitly clickable elements */
.name, .badge, .btn { pointer-events: auto; }

.top { display: grid; grid-template-columns: 36px 1fr auto; align-items: start; gap: 11px; }

/* SICON / IMAGES */
.sicon {
  width: 36px; height: 36px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; position: relative; margin-top: 1px;
  background: rgba(128,128,128,.04);
}
.sicon-icon { --mdc-icon-size: 20px; color: ${s.meta_color}; position: absolute; z-index: 1; transition: opacity 0.3s; }
.row.is-online .sicon-icon { color: ${s.icon_online_color}; opacity: 0.8; }
.row.is-offline .sicon-icon { color: ${s.icon_offline_color}; opacity: 0.8; }

.real-img {
  width: 28px; height: 28px; object-fit: contain;
  position: relative; z-index: 2; transition: opacity 0.3s ease; opacity: 0;
}
.row.is-offline .real-img { filter: grayscale(100%) opacity(70%); }

.dot {
  position: absolute; bottom: -2px; right: -2px; width: 10px; height: 10px;
  border-radius: 50%; border: 2px solid ${s.device_bg}; z-index: 3;
  transition: border-color 0.2s ease;
}
.row:hover .dot { border-color: ${s.device_bg_hover}; }
.dot.on { background: ${s.icon_online_color}; animation: umcDot 2.8s infinite ease-in-out; }
.dot.off { background: ${s.icon_offline_color}; }
@keyframes umcDot { 0% { box-shadow: 0 0 0 0 rgba(0,200,83,.6); } 60% { box-shadow: 0 0 0 4px rgba(0,200,83,0); } 100% { box-shadow: 0 0 0 0 rgba(0,200,83,0); } }

/* INFO */
.info { min-width: 0; }
.info-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.name-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; flex: 1; }
.name {
  font-size: ${s.device_name_size}; font-weight: 600; color: ${s.device_name_color};
  cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  letter-spacing: -.01em; transition: opacity .13s;
}
.name:hover { opacity: .65; }

/* TAGS */
.type-tag, .ip-tag {
  font-size: 9px; padding: 2px 5px; border-radius: 4px;
  background: rgba(128,128,128,.10); color: ${s.meta_color};
}
.type-tag { font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.ip-tag { font-weight: 600; font-family: monospace; letter-spacing: .04em; }

.client-badge {
  display: flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600;
  color: var(--primary-text-color); background: rgba(128,128,128,.08); padding: 3px 7px;
  border-radius: 6px; border: 1px solid rgba(128,128,128,.12); flex-shrink: 0;
}
.client-badge ha-icon { --mdc-icon-size: 13px; color: ${s.accent_color}; }

.badge {
  display: inline-flex; align-items: center; gap: 3px; background: ${s.accent_color};
  color: #fff; font-size: 8px; font-weight: 800; padding: 2px 6px 2px 5px;
  border-radius: 20px; cursor: pointer; letter-spacing: .07em; text-transform: uppercase;
  white-space: nowrap; animation: umcBadge 2.2s infinite;
}
@keyframes umcBadge { 0%,100% { box-shadow: 0 0 0 0 color-mix(in srgb, ${s.accent_color} 60%, transparent); } 50% { box-shadow: 0 0 0 5px color-mix(in srgb, ${s.accent_color} 0%, transparent); } }
.badge ha-icon { --mdc-icon-size: 9px; }

.offline-tag {
  font-size: 8px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  padding: 2px 6px; border-radius: 4px; background: rgba(255,23,68,.10); color: ${s.icon_offline_color};
}

.meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 5px; }
.chip { display: flex; align-items: center; gap: 3px; font-size: 10px; color: ${s.meta_color}; letter-spacing: .02em; }
.chip ha-icon { --mdc-icon-size: 11px; opacity: .6; }

/* ACTIONS */
.actions { display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
.btn {
  background: transparent; border: 1px solid rgba(128,128,128,.18); color: var(--secondary-text-color);
  width: 28px; height: 28px; border-radius: 7px; cursor: pointer; display: flex;
  align-items: center; justify-content: center; transition: all .14s;
}
.btn:hover { background: rgba(128,128,128,.12); border-color: rgba(128,128,128,.30); color: var(--primary-text-color); }
.btn ha-icon { --mdc-icon-size: 15px; }

/* METRICS */
.metrics {
  margin-top: ${c.compact_mode ? "9px" : "11px"}; padding-top: ${c.compact_mode ? "9px" : "11px"};
  border-top: 1px solid rgba(128,128,128,.08); display: flex; flex-direction: column; gap: ${c.compact_mode ? "5px" : "6px"};
}
.mrow { display: grid; grid-template-columns: 30px 1fr 32px; align-items: center; gap: 8px; }
.mlabel { font-size: 9px; font-weight: 700; letter-spacing: .10em; text-transform: uppercase; color: ${s.meta_color}; }
.track { height: ${s.bar_height}; background: rgba(128,128,128,.13); border-radius: 99px; overflow: hidden; }
.fill { height: 100%; border-radius: 99px; transition: width .65s cubic-bezier(.4,0,.2,1); }
.fill-cpu  { background: ${s.bar_cpu_color};  }
.fill-ram  { background: ${s.bar_ram_color};  }
.fill-temp { background: ${s.bar_temp_color}; }
.fill.warn { filter: brightness(1.25); }
.fill.crit { filter: brightness(1.5) saturate(1.3); }

.mval { font-size: 10px; font-weight: 700; text-align: right; letter-spacing: .02em; font-variant-numeric: tabular-nums; color: var(--primary-text-color); }
.mval.warn { color: #ffab00; }
.mval.crit { color: ${s.icon_offline_color}; }

.empty { padding: 36px 20px; text-align: center; color: ${s.meta_color}; font-size: 13px; line-height: 1.6; }
.empty ha-icon { --mdc-icon-size: 36px; display: block; margin: 0 auto 10px; opacity: .22; }
</style>

<div class="card">
  <div class="header" id="hdr" style="display:none">
    <div class="header-left"><ha-icon class="header-icon" id="ttl-icon" icon="mdi:lan"></ha-icon><span class="card-title" id="ttl"></span></div>
    <div class="pills" id="pls"></div>
  </div>
  <div class="devices" id="dev"></div>
</div>`;

    this._hdrEl = this.shadowRoot.getElementById("hdr");
    this._ttlEl = this.shadowRoot.getElementById("ttl");
    this._devEl = this.shadowRoot.getElementById("dev");
    this._plsEl = this.shadowRoot.getElementById("pls");
  }

  _discover() {
    if (!this._hass) return [];
    const prefixes = new Set();
    for (const id in this._hass.states)
      if (id.startsWith("sensor.") && id.endsWith("_cpu_utilization")) prefixes.add(id.slice(7, -16));

    const out = [];
    prefixes.forEach(pfx => {
      const ent  = this._hass.states[`sensor.${pfx}_cpu_utilization`];
      const name = (ent?.attributes?.friendly_name || pfx).split(" (")[0].replace(/ cpu utilization/i, "").trim();
      let icon = "mdi:router-network";
      let type_label = "GATEWAY";
      if (/usw|switch/.test(pfx)) { icon = "mdi:switch"; type_label = "SWITCH"; }
      else if (/u6|uap|^ap_|wifi|iw|flex/.test(pfx)) { icon = "mdi:access-point"; type_label = "AP"; }
      out.push({ prefix: pfx, name, icon, type_label });
    });
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  _formatImageName(pfx) {
    let name = pfx.replace(/_/g, '-');
    const exactMatches = { 'u6-ent': 'U6-Enterprise', 'u6-enterprise': 'U6-Enterprise', 'u6-ext': 'U6-Extender', 'uap-ac-m-pro': 'UAP-AC-M-Pro', 'uap-ac-m': 'UAP-AC-M' };
    if (exactMatches[name.toLowerCase()]) return exactMatches[name.toLowerCase()];
    name = name.replace(/\b(usw|uap|udm|udr|usg|u6|us|uxg|ux)\b/gi, match => match.toUpperCase());
    name = name.replace(/\b(ac|hd|iw|se|poe|pro|lite|lr|mesh|flex|mini|enterprise|aggregation|xg|max)\b/gi, match => {
      const map = { 'ac':'AC', 'hd':'HD', 'iw':'IW', 'se':'SE', 'poe':'PoE', 'pro':'Pro', 'lite':'Lite', 'lr':'LR', 'mesh':'Mesh', 'flex':'Flex', 'mini':'Mini', 'enterprise':'Enterprise', 'aggregation':'Aggregation', 'xg':'XG', 'max':'Max' };
      return map[match.toLowerCase()] || match;
    });
    return name;
  }

  _update() {
    if (!this._devEl || !this._hass) return;
    const cfg = this._config;

    // Headings
    if (cfg.title || cfg.title_icon) {
      if (this._ttlEl.textContent !== (cfg.title || "")) this._ttlEl.textContent = cfg.title || "";
      if (this.shadowRoot.getElementById("ttl-icon").icon !== (cfg.title_icon || "mdi:lan")) this.shadowRoot.getElementById("ttl-icon").icon = cfg.title_icon || "mdi:lan";
      this._hdrEl.style.display = "flex";
    } else {
      this._hdrEl.style.display = "none";
    }

    const raw = (cfg.devices?.length > 0) ? cfg.devices : this._devices;
    if (!raw || raw.length === 0) {
      this._devEl.innerHTML = `<div class="empty"><ha-icon icon="mdi:lan-disconnect"></ha-icon>No UniFi devices found.</div>`;
      this._plsEl.innerHTML = "";
      return;
    }
    if (this._devEl.querySelector('.empty')) this._devEl.innerHTML = '';

    const ONLINE_STATES = ["connected", "online", "home"];
    const devices = raw.map(dev => {
      const so = this._hass.states[`sensor.${dev.prefix}_state`];
      return { ...dev, online: so ? ONLINE_STATES.includes(so.state?.toLowerCase()) : false };
    });

    if (cfg.sort_online_first) devices.sort((a, b) => (+b.online - +a.online) || a.name.localeCompare(b.name));

    // Summary pills
    const nOn = devices.filter(d => d.online).length;
    const nOff = devices.length - nOn;
    const plsHtml = `<span class="pill pill-on">${nOn} online</span>` + (nOff > 0 ? `<span class="pill pill-off">${nOff} offline</span>` : "");
    if (this._plsEl.innerHTML !== plsHtml) this._plsEl.innerHTML = plsHtml;

    // SMART RENDER LOOP
    const validPrefixes = new Set();

    devices.forEach((dev, index) => {
      const p = dev.prefix;
      validPrefixes.add(p);
      
      let rowEl = this._devEl.querySelector(`.row[data-pfx="${p}"]`);
      let isNew = false;
      if (!rowEl) {
        rowEl = document.createElement('div');
        rowEl.dataset.pfx = p;
        isNew = true;
      }

      const expectedClass = `row ${dev.online ? "is-online" : "is-offline"}`;
      if (rowEl.className !== expectedClass) rowEl.className = expectedClass;

      const nom = cfg.name_overrides[p] || dev.name || p;
      const manualImg = cfg.image_overrides[p]; 
      const typeLabel = dev.type_label || "DEVICE";

      // Entites
      const cpuEnt = this._hass.states[`sensor.${p}_cpu_utilization`];
      const ramEnt = this._hass.states[`sensor.${p}_memory_utilization`];
      const tmpEnt = this._hass.states[`sensor.${p}_temperature`] || this._hass.states[`sensor.${p}_cpu_temperature`];
      const uptEnt = this._hass.states[`sensor.${p}_uptime`];
      const updEnt = this._hass.states[`update.${p}`];
      const hasRst = !!this._hass.states[`button.${p}_restart`];
      const hasUpd = updEnt?.state === "on";
      const version = updEnt?.attributes?.installed_version || updEnt?.attributes?.latest_version || null;

      // Smart IP/Client extraction
      const rawName = cpuEnt?.attributes?.friendly_name || p;
      const ipMatch = rawName.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
      const ipAddr  = this._hass.states[`sensor.${p}_ip_address`]?.state || (ipMatch ? ipMatch[0] : null);

      let cli = null;
      const cliEnt = this._hass.states[`sensor.${p}_clients`] || this._hass.states[`sensor.${p}_users`] || this._hass.states[`sensor.${p}_num_sta`];
      if (cliEnt && !isNaN(parseInt(cliEnt.state, 10))) cli = parseInt(cliEnt.state, 10);
      else {
        const wl = this._hass.states[`sensor.${p}_wireless_clients`];
        const wr = this._hass.states[`sensor.${p}_wired_clients`];
        if (wl || wr) cli = (wl ? parseInt(wl.state, 10) || 0 : 0) + (wr ? parseInt(wr.state, 10) || 0 : 0);
      }

      const cpu = cpuEnt ? parseFloat(cpuEnt.state) : null;
      const ram = ramEnt ? parseFloat(ramEnt.state) : null;
      const tmp = tmpEnt ? parseFloat(tmpEnt.state) : null;
      const upt = uptEnt ? _uptime(uptEnt.state) : null;

      const cpuSev = cpu != null ? _sev(cpu) : "";
      const ramSev = ram != null ? _sev(ram) : "";
      const tmpSev = tmp != null ? _sev(tmp, 65, 80) : "";

      const chips = [];
      if (cfg.show_version && version) chips.push(`<span class="chip"><ha-icon icon="mdi:tag-outline"></ha-icon>${version}</span>`);
      if (cfg.show_uptime && upt) chips.push(`<span class="chip"><ha-icon icon="mdi:clock-outline"></ha-icon>${upt}</span>`);

      const bars = [];
      if (cpu != null && !isNaN(cpu)) bars.push(this._bar("CPU", "cpu", cpu, cpuSev, `${cpu.toFixed(0)}%`));
      if (ram != null && !isNaN(ram)) bars.push(this._bar("RAM", "ram", ram, ramSev, `${ram.toFixed(0)}%`));
      if (cfg.show_temp && tmp != null && !isNaN(tmp)) bars.push(this._bar("TMP", "temp", Math.min(tmp, 100), tmpSev, `${tmp.toFixed(0)}°`));

      // Image Logic
      const baseUrl = cfg.image_base_url || "https://raw.githubusercontent.com/cyberconsecurity/Unifi/main/";
      const imgUrl = manualImg ? `${baseUrl}${manualImg}` : `${baseUrl}${this._formatImageName(p)}.png`;

      // Flawless Image Fallback structure
      const imageHtml = cfg.show_real_images 
        ? `<ha-icon class="sicon-icon" icon="${dev.icon || "mdi:router-network"}"></ha-icon>
           <img class="real-img" src="${imgUrl}" 
                onload="this.style.opacity='1'; this.previousElementSibling.style.opacity='0';" 
                onerror="this.style.opacity='0'; this.previousElementSibling.style.opacity='1';" />`
        : `<ha-icon class="sicon-icon" icon="${dev.icon || "mdi:router-network"}"></ha-icon>`;

      const innerHtml = `
  <div class="top">
    <div class="sicon">
      ${imageHtml}
      <span class="dot ${dev.online ? 'on' : 'off'}"></span>
    </div>
    <div class="info">
      <div class="info-header">
        <div class="name-row">
          <span class="name" onclick="this.getRootNode().host._openDetails('${p}')">${nom}</span>
          <span class="type-tag">${typeLabel}</span>
          ${(cfg.show_ip && ipAddr) ? `<span class="ip-tag">${ipAddr}</span>` : ""}
          ${!dev.online ? `<span class="offline-tag">offline</span>` : ""}
          ${hasUpd ? `<span class="badge" onclick="this.getRootNode().host._triggerUpdate('${p}')"><ha-icon icon="mdi:arrow-up-circle"></ha-icon>Update</span>` : ""}
        </div>
        ${(cfg.show_clients && cli != null) ? `<div class="client-badge" title="Connected Clients"><ha-icon icon="mdi:account-multiple"></ha-icon> ${cli}</div>` : ""}
      </div>
      ${chips.length ? `<div class="meta">${chips.join("")}</div>` : ""}
    </div>
    <div class="actions">
      ${hasRst ? `<button class="btn" title="Restart" onclick="this.getRootNode().host._triggerRestart('${p}')"><ha-icon icon="mdi:restart"></ha-icon></button>` : ""}
      <button class="btn" title="Details" onclick="this.getRootNode().host._openDetails('${p}')"><ha-icon icon="mdi:information-outline"></ha-icon></button>
    </div>
  </div>
  ${bars.length ? `<div class="metrics">${bars.join("")}</div>` : ""}
`;

      // Update HTML ONLY if changed
      if (rowEl._cachedHtml !== innerHtml) {
        rowEl.innerHTML = innerHtml;
        rowEl._cachedHtml = innerHtml;

        // Force check if image is cached to bypass onload bug
        const img = rowEl.querySelector('.real-img');
        if (img && img.complete && img.naturalHeight !== 0) {
            img.style.opacity = '1';
            if(img.previousElementSibling) img.previousElementSibling.style.opacity = '0';
        }
      }

      // FLICKER FIX: Only append if it's new. Prevent moving nodes unnecessarily!
      if (isNew) {
        this._devEl.appendChild(rowEl);
      } else {
        // Correct position if DOM order doesn't match Array order
        if (this._devEl.children[index] !== rowEl) {
          this._devEl.insertBefore(rowEl, this._devEl.children[index]);
        }
      }
    });

    // Cleanup removed devices
    Array.from(this._devEl.children).forEach(child => {
      if (child.classList.contains('row') && !validPrefixes.has(child.dataset.pfx)) {
        child.remove();
      }
    });
  }

  _bar(label, type, pct, sev, valStr) {
    return `<div class="mrow"><span class="mlabel">${label}</span><div class="track"><div class="fill fill-${type}${sev ? " " + sev : ""}" style="width:${Math.min(Math.max(pct, 0), 100).toFixed(1)}%"></div></div><span class="mval${sev ? " " + sev : ""}">${valStr}</span></div>`;
  }

  _openDetails(pfx) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: `sensor.${pfx}_cpu_utilization` }, bubbles: true, composed: true }));
  }
  _triggerRestart(pfx) {
    const nom = this._config.name_overrides[pfx] || pfx;
    if (confirm(`Restart "${nom}"?`)) this._hass.callService("button", "press", { entity_id: `button.${pfx}_restart` });
  }
  _triggerUpdate(pfx) {
    const nom = this._config.name_overrides[pfx] || pfx;
    if (confirm(`Install firmware update for "${nom}"?`)) this._hass.callService("update", "install", { entity_id: `update.${pfx}` });
  }

  getCardSize() { return (this._devices?.length || 2) + 1; }
}


// ================================================================
// EDITOR
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

  _build() {
    if (this._built) return;
    this._built = true;

    this.shadowRoot.innerHTML = `
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:host { display: block; font-family: var(--primary-font-family, 'Roboto', sans-serif); }
details { border: 1px solid var(--divider-color, rgba(0,0,0,.10)); border-radius: 10px; margin-bottom: 8px; background: var(--card-background-color, #fff); overflow: hidden; }
summary { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 11px 14px; font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--secondary-text-color); user-select: none; list-style: none; outline: none; background: rgba(0,0,0,.02); }
summary::after { content: '›'; margin-left: auto; font-size: 15px; line-height: 1; transition: transform .18s; }
details[open] summary::after { transform: rotate(90deg); }
summary ha-icon { --mdc-icon-size: 14px; }
.content { padding: 14px 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.sw-row { display: flex; align-items: center; justify-content: space-between; min-height: 38px; gap: 12px; }
.sw-label { font-size: 13px; color: var(--primary-text-color); }
.sw-sub { font-size: 11px; color: var(--secondary-text-color); margin-top: 1px; }
ha-textfield, ha-icon-picker { width: 100%; }
.hint { font-size: 11px; color: var(--secondary-text-color); line-height: 1.55; margin-top: -4px; }

.custom-select { flex: 1; padding: 10px 12px; font-size: 14px; font-family: inherit; color: var(--primary-text-color); background-color: var(--input-idle-line-color, rgba(0, 0, 0, 0.05)); border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1)); border-radius: 4px; outline: none; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23757575%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E"); background-repeat: no-repeat; background-position: right 12px top 50%; background-size: 12px auto; }
.custom-select:hover, .custom-select:focus { border-color: var(--primary-color); }
</style>

<details open>
  <summary><ha-icon icon="mdi:cog-outline"></ha-icon>General</summary>
  <div class="content">
    <div class="row2"><ha-textfield id="f_title" label="Card title"></ha-textfield><ha-icon-picker id="f_title_icon" label="Title icon"></ha-icon-picker></div>
    <div class="sw-row"><div><div class="sw-label">Auto-discover</div><div class="sw-sub">Scan for UniFi entities</div></div><ha-switch id="sw_auto"></ha-switch></div>
    <div class="sw-row"><div class="sw-label">Sort online devices first</div><ha-switch id="sw_sort"></ha-switch></div>
    <div class="sw-row"><div><div class="sw-label">Compact mode</div><div class="sw-sub">Reduced spacing</div></div><ha-switch id="sw_compact"></ha-switch></div>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:eye-outline"></ha-icon>Display Options</summary>
  <div class="content">
    <div class="sw-row"><div class="sw-label">Firmware version</div><ha-switch id="sw_version"></ha-switch></div>
    <div class="sw-row"><div class="sw-label">Temperature bar</div><ha-switch id="sw_temp"></ha-switch></div>
    <div class="sw-row"><div class="sw-label">Uptime</div><ha-switch id="sw_uptime"></ha-switch></div>
    <div class="sw-row"><div class="sw-label">Connected clients</div><ha-switch id="sw_clients"></ha-switch></div>
    <div class="sw-row"><div class="sw-label">IP Address</div><ha-switch id="sw_ip"></ha-switch></div>
    <div class="sw-row"><div><div class="sw-label">Real Device Images</div><div class="sw-sub">Load images instead of icons</div></div><ha-switch id="sw_real_images"></ha-switch></div>
    <ha-textfield id="f_image_base_url" label="Image Base URL"></ha-textfield>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:palette-outline"></ha-icon>Card Styling</summary>
  <div class="content">
    <ha-textfield id="f_card_bg" label="Background"></ha-textfield>
    <div class="row2"><ha-textfield id="f_card_border_radius" label="Border radius"></ha-textfield><ha-textfield id="f_card_padding" label="Padding"></ha-textfield></div>
    <ha-textfield id="f_card_shadow" label="Box shadow"></ha-textfield><ha-textfield id="f_accent_color" label="Accent color"></ha-textfield>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:format-text"></ha-icon>Typography</summary>
  <div class="content">
    <ha-textfield id="f_font_family" label="Global Font Family"></ha-textfield>
    <div class="row2"><ha-textfield id="f_title_font_family" label="Title Font (e.g. inherit)"></ha-textfield><ha-textfield id="f_title_text_transform" label="Title Transform"></ha-textfield></div>
    <div class="row2"><ha-textfield id="f_title_font_size" label="Title size"></ha-textfield><ha-textfield id="f_title_color" label="Title color"></ha-textfield></div>
    <ha-textfield id="f_title_icon_color" label="Title icon color"></ha-textfield>
    <div class="row2"><ha-textfield id="f_device_name_size" label="Name size"></ha-textfield><ha-textfield id="f_device_name_color" label="Name color"></ha-textfield></div>
    <ha-textfield id="f_meta_color" label="Meta text color"></ha-textfield>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:server-outline"></ha-icon>Device Rows</summary>
  <div class="content">
    <ha-textfield id="f_device_bg" label="Row background"></ha-textfield><ha-textfield id="f_device_bg_hover" label="Row background (hover)"></ha-textfield>
    <div class="row2"><ha-textfield id="f_icon_online_color" label="Online color"></ha-textfield><ha-textfield id="f_icon_offline_color" label="Offline color"></ha-textfield></div>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:chart-bar"></ha-icon>Metric Bars</summary>
  <div class="content">
    <ha-textfield id="f_bar_height" label="Bar height (e.g. 3px)"></ha-textfield>
    <div class="row2"><ha-textfield id="f_bar_cpu_color" label="CPU color"></ha-textfield><ha-textfield id="f_bar_ram_color" label="RAM color"></ha-textfield></div>
    <ha-textfield id="f_bar_temp_color" label="Temperature color"></ha-textfield>
  </div>
</details>

<details>
  <summary><ha-icon icon="mdi:cellphone-link"></ha-icon>Device Overrides</summary>
  <div class="content" id="alias-list">
    <p class="hint">Override the display name and select an exact image from the Unifi Repository.</p>
  </div>
</details>`;

    this._buildOverridesList();
    this._sync();
    this._bind();
  }

  _buildOverridesList() {
    const list = this.shadowRoot.getElementById("alias-list");
    if (!list || !this._hass) return;
    const hint = list.querySelector("p");
    list.innerHTML = "";
    if (hint) list.appendChild(hint);

    const prefixes = [];
    for (const id in this._hass.states)
      if (id.startsWith("sensor.") && id.endsWith("_cpu_utilization")) prefixes.push(id.slice(7, -16));
    prefixes.sort();

    if (prefixes.length === 0) {
      list.innerHTML += `<p class="hint">No UniFi devices discovered yet.</p>`;
      return;
    }

    let optionsHtml = `<option value="">-- Auto-Discovery --</option>`;
    UNIFI_IMAGES.forEach(img => { optionsHtml += `<option value="${img}">${img.replace('.png', '')}</option>`; });

    for (const pfx of prefixes) {
      const wrapper = document.createElement("div");
      wrapper.style.display = "flex"; wrapper.style.gap = "8px"; wrapper.style.marginBottom = "10px";

      const tfAlias = document.createElement("ha-textfield");
      tfAlias.style.flex = "1"; tfAlias.label = `Alias: ${pfx}`;
      tfAlias.value = (this._config.name_overrides || {})[pfx] || "";
      tfAlias.dataset.pfx = pfx; tfAlias.dataset.otype = "name";
      tfAlias.addEventListener("change", e => this._onChangeOverride(e));

      const selImg = document.createElement("select");
      selImg.className = "custom-select"; selImg.innerHTML = optionsHtml;
      selImg.value = (this._config.image_overrides || {})[pfx] || "";
      selImg.dataset.pfx = pfx; selImg.dataset.otype = "image";
      selImg.addEventListener("change", e => this._onChangeOverride(e));

      wrapper.appendChild(tfAlias); wrapper.appendChild(selImg); list.appendChild(wrapper);
    }
  }

  _bind() {
    this.shadowRoot.querySelectorAll("ha-textfield, ha-switch, ha-icon-picker").forEach(el => {
      if (!el.dataset.otype) {
        if (el.tagName === "HA-ICON-PICKER") el.addEventListener("value-changed", e => this._onChange(e));
        else el.addEventListener("change", e => this._onChange(e));
      }
    });
  }

  _onChangeOverride(ev) {
    if (!this._config) return;
    const el = ev.currentTarget;
    const val = el.value, pfx = el.dataset.pfx, type = el.dataset.otype; 
    const newCfg = _mergeConfig(this._config);
    const targetObj = type === 'name' ? 'name_overrides' : 'image_overrides';

    if (val) newCfg[targetObj][pfx] = val;
    else delete newCfg[targetObj][pfx];

    this._config = newCfg;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newCfg }, bubbles: true, composed: true }));
  }

  static get _MAP() {
    return {
      f_title: ["title"], f_title_icon: ["title_icon"], sw_auto: ["auto_discover"], sw_sort: ["sort_online_first"],
      sw_compact: ["compact_mode"], sw_version: ["show_version"], sw_temp: ["show_temp"], sw_uptime: ["show_uptime"],
      sw_clients: ["show_clients"], sw_ip: ["show_ip"], sw_real_images: ["show_real_images"], f_image_base_url: ["image_base_url"],
      f_card_bg: ["style", "card_bg"], f_card_border_radius: ["style", "card_border_radius"], f_card_padding: ["style", "card_padding"],
      f_card_shadow: ["style", "card_shadow"], f_accent_color: ["style", "accent_color"], f_font_family: ["style", "font_family"],
      f_title_font_family: ["style", "title_font_family"], f_title_text_transform: ["style", "title_text_transform"],
      f_title_font_size: ["style", "title_font_size"], f_title_color: ["style", "title_color"], f_title_icon_color: ["style", "title_icon_color"],
      f_device_name_size: ["style", "device_name_size"], f_device_name_color: ["style", "device_name_color"], f_meta_color: ["style", "meta_color"],
      f_device_bg: ["style", "device_bg"], f_device_bg_hover: ["style", "device_bg_hover"], f_icon_online_color: ["style", "icon_online_color"],
      f_icon_offline_color: ["style", "icon_offline_color"], f_bar_height: ["style", "bar_height"], f_bar_cpu_color: ["style", "bar_cpu_color"],
      f_bar_ram_color: ["style", "bar_ram_color"], f_bar_temp_color: ["style", "bar_temp_color"],
    };
  }

  _sync() {
    const c = this._config, s = c.style;
    const set = (id, v) => { const el = this.shadowRoot.getElementById(id); if (el) el.value = String(v ?? ""); };
    const chk = (id, v) => { const el = this.shadowRoot.getElementById(id); if (el) el.checked = !!v; };

    set("f_title", c.title || ""); set("f_title_icon", c.title_icon || "");
    chk("sw_auto", c.auto_discover !== false); chk("sw_sort", c.sort_online_first !== false); chk("sw_compact", !!c.compact_mode);
    chk("sw_version", c.show_version !== false); chk("sw_temp", c.show_temp !== false); chk("sw_uptime", c.show_uptime !== false);
    chk("sw_clients", c.show_clients !== false); chk("sw_ip", c.show_ip !== false); chk("sw_real_images", c.show_real_images !== false);
    set("f_image_base_url", c.image_base_url || "");
    
    set("f_card_bg", s.card_bg); set("f_card_border_radius", s.card_border_radius); set("f_card_padding", s.card_padding);
    set("f_card_shadow", s.card_shadow); set("f_accent_color", s.accent_color); set("f_font_family", s.font_family);
    set("f_title_font_family", s.title_font_family); set("f_title_text_transform", s.title_text_transform);
    set("f_title_font_size", s.title_font_size); set("f_title_color", s.title_color); set("f_title_icon_color", s.title_icon_color);
    set("f_device_name_size", s.device_name_size); set("f_device_name_color", s.device_name_color); set("f_meta_color", s.meta_color);
    set("f_device_bg", s.device_bg); set("f_device_bg_hover", s.device_bg_hover); set("f_icon_online_color", s.icon_online_color);
    set("f_icon_offline_color", s.icon_offline_color); set("f_bar_height", s.bar_height); set("f_bar_cpu_color", s.bar_cpu_color);
    set("f_bar_ram_color", s.bar_ram_color); set("f_bar_temp_color", s.bar_temp_color);

    const list = this.shadowRoot.getElementById("alias-list");
    if (list) {
      list.querySelectorAll("[data-otype='name']").forEach(el => { el.value = (c.name_overrides || {})[el.dataset.pfx] || ""; });
      list.querySelectorAll("[data-otype='image']").forEach(el => { el.value = (c.image_overrides || {})[el.dataset.pfx] || ""; });
    }
  }

  _onChange(ev) {
    if (!this._config) return;
    const el = ev.currentTarget;
    let value = ev.type === "value-changed" ? ev.detail.value : (el.tagName === "HA-SWITCH" ? el.checked : el.value);
    
    const newCfg = _mergeConfig(this._config);
    const path = UnifiMonitorCardEditor._MAP[el.id];
    if (!path) return;
    if (path.length === 1) newCfg[path[0]] = value;
    else if (path[0] === "style") newCfg.style[path[1]] = value;

    this._config = newCfg;
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newCfg }, bubbles: true, composed: true }));
  }
}

customElements.define("unifi-monitor-card", UnifiMonitorCard);
customElements.define("unifi-monitor-card-editor", UnifiMonitorCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({ type: "unifi-monitor-card", name: "UniFi Monitor Card", preview: true, description: `v${UMC_VERSION} · Auto-discovery · Full visual editor` });
