class UnifiMonitorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._discoveredDevices = null;
  }

  static getConfigElement() {
    return document.createElement("unifi-monitor-card-editor");
  }

  static getStubConfig() {
    return { 
      title: "UniFi Network", 
      auto_discover: true, 
      show_version: true,
      name_overrides: {},
      style: {
        card_bg: "var(--ha-card-background, var(--card-background-color, white))",
        card_padding: "16px",
        card_border_radius: "12px",
        card_shadow: "var(--ha-card-box-shadow, none)",
        title_font_size: "1.2rem",
        title_color: "var(--primary-text-color)",
        device_bg: "rgba(150,150,150, 0.05)",
        device_name_size: "14px",
        device_name_color: "var(--primary-text-color)",
        version_color: "var(--secondary-text-color)",
        bar_height: "4px"
      }
    };
  }

  setConfig(config) {
    this.config = {
      title: 'UniFi Network',
      auto_discover: true,
      show_version: true,
      name_overrides: {},
      style: { ...UnifiMonitorCard.getStubConfig().style, ...(config.style || {}) },
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.content) this.render();
    if (this.config.auto_discover && !this._discoveredDevices) {
      this._discoveredDevices = this.discoverDevices();
    }
    this.updateData();
  }

  discoverDevices() {
    const devices = [];
    const prefixes = new Set();
    for (const entityId in this._hass.states) {
      if (entityId.startsWith('sensor.') && entityId.endsWith('_cpu_utilization')) {
        const prefix = entityId.substring(7, entityId.length - 16);
        prefixes.add(prefix);
      }
    }
    prefixes.forEach(prefix => {
      let name = prefix.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      let icon = 'mdi:router-network';
      if (prefix.includes('usw') || prefix.includes('switch')) icon = 'mdi:switch';
      if (prefix.includes('u6') || prefix.includes('ap') || prefix.includes('wifi') || prefix.includes('iw')) icon = 'mdi:access-point';
      devices.push({ prefix: prefix, default_name: name, icon: icon });
    });
    return devices.sort((a, b) => a.default_name.localeCompare(b.default_name));
  }

  render() {
    const s = this.config.style;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --umc-update-blue: #03a9f4;
          --umc-online: ${this.config.color_online || '#4caf50'};
          --umc-offline: ${this.config.color_offline || '#f44336'};
        }
        .card-container { 
          background: ${s.card_bg}; 
          border-radius: ${s.card_border_radius}; 
          padding: ${s.card_padding}; 
          box-shadow: ${s.card_shadow};
          font-family: var(--primary-font-family, inherit); 
          color: var(--primary-text-color); 
        }
        .header { 
          font-size: ${s.title_font_size}; 
          color: ${s.title_color};
          font-weight: bold; 
          margin-bottom: 12px; 
        }
        .device-row { 
          display: grid; 
          grid-template-columns: 40px 1fr auto; 
          align-items: center; 
          gap: 12px; 
          padding: 12px; 
          border-radius: 8px; 
          background: ${s.device_bg}; 
          margin-bottom: 8px; 
        }
        .online { color: var(--umc-online); }
        .offline { color: var(--umc-offline); }
        .device-name { 
          font-weight: 600; 
          font-size: ${s.device_name_size}; 
          color: ${s.device_name_color};
          cursor: pointer; 
        }
        .version-text { font-size: 10px; color: ${s.version_color}; margin-top: -2px; }
        .update-badge { background: var(--umc-update-blue); color: white; font-size: 9px; padding: 2px 6px; border-radius: 10px; cursor: pointer; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(3, 169, 244, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(3, 169, 244, 0); } 100% { box-shadow: 0 0 0 0 rgba(3, 169, 244, 0); } }
        .stat-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--secondary-text-color); margin-top: 4px; }
        .bar-bg { flex-grow: 1; height: ${s.bar_height}; background: rgba(150,150,150, 0.2); border-radius: 2px; overflow: hidden; }
        .bar-fill { height: 100%; transition: width 0.5s; background: var(--primary-color); }
        .btn-restart { background: transparent; border: none; color: var(--primary-text-color); cursor: pointer; opacity: 0.6; }
        .btn-restart:hover { opacity: 1; }
      </style>
      <div class="card-container">
        ${this.config.title ? `<div class="header">${this.config.title}</div>` : ''}
        <div id="devices"></div>
      </div>
    `;
    this.content = this.shadowRoot.getElementById('devices');
  }

  updateData() {
    let html = '';
    const activeDevices = (this.config.devices && this.config.devices.length > 0) ? this.config.devices : this._discoveredDevices;
    if (!activeDevices) return;

    activeDevices.forEach(device => {
      const prefix = device.prefix;
      const displayName = this.config.name_overrides?.[prefix] || device.name || device.default_name;
      const cpuObj = this._hass.states[`sensor.${prefix}_cpu_utilization`];
      const ramObj = this._hass.states[`sensor.${prefix}_memory_utilization`];
      const stateObj = this._hass.states[`sensor.${prefix}_state`];
      const updateObj = this._hass.states[`update.${prefix}`];

      const isOnline = stateObj && (stateObj.state === 'connected' || stateObj.state === 'online' || stateObj.state === 'home');
      const hasUpdate = updateObj && updateObj.state === 'on';
      const version = updateObj?.attributes?.installed_version || 'Unknown';

      html += `
        <div class="device-row">
          <div class="icon-wrapper ${isOnline ? 'online' : 'offline'}">
            <ha-icon icon="${device.icon || 'mdi:router-network'}"></ha-icon>
          </div>
          <div class="info-col">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="device-name" onclick="this.getRootNode().host.openDetails('${prefix}')">${displayName}</span>
              ${hasUpdate ? `<span class="update-badge" onclick="this.getRootNode().host.triggerUpdate('${prefix}')">Update</span>` : ''}
            </div>
            ${this.config.show_version ? `<span class="version-text">FW: ${version}</span>` : ''}
            <div class="stat-row">
              <div class="bar-bg"><div class="bar-fill" style="width: ${cpuObj?.state || 0}%"></div></div>
              <span>CPU: ${cpuObj?.state || 0}%</span>
            </div>
          </div>
          <button class="btn-restart" onclick="this.getRootNode().host.triggerRestart('${prefix}')">
            <ha-icon icon="mdi:restart"></ha-icon>
          </button>
        </div>
      `;
    });
    this.content.innerHTML = html;
  }

  openDetails(prefix) {
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: `sensor.${prefix}_cpu_utilization` }, bubbles: true, composed: true }));
  }

  triggerRestart(prefix) {
    if(confirm(`Gerät ${prefix} neu starten?`)) this._hass.callService('button', 'press', { entity_id: `button.${prefix}_restart` });
  }

  triggerUpdate(prefix) {
    if(confirm(`Update für ${prefix} installieren?`)) this._hass.callService('update', 'install', { entity_id: `update.${prefix}` });
  }
}

// -------------------------------------------------------------
// EDITOR MIT MEHREREN AKKORDEONS (Kategorien)
// -------------------------------------------------------------
class UnifiMonitorCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this.render();
  }

  set hass(hass) { this._hass = hass; }

  render() {
    if (!this._config || !this._hass) return;

    this.innerHTML = `
      <style>
        details { border: 1px solid var(--divider-color); border-radius: 8px; margin-bottom: 8px; background: var(--card-background-color); }
        summary { cursor: pointer; padding: 12px; font-weight: bold; outline: none; transition: background 0.2s; border-radius: 8px; }
        summary:hover { background: rgba(0,0,0,0.05); }
        .content { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        ha-textfield, ha-select { width: 100%; }
      </style>

      <details open>
        <summary>General Settings</summary>
        <div class="content">
          <ha-textfield label="Card Title" .value="${this._config.title}" .configValue="${"title"}"></ha-textfield>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>Auto Discover</span>
            <ha-switch .checked="${this._config.auto_discover}" .configValue="${"auto_discover"}"></ha-switch>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>Show Firmware Version</span>
            <ha-switch .checked="${this._config.show_version}" .configValue="${"show_version"}"></ha-switch>
          </div>
        </div>
      </details>

      <details>
        <summary>Card Styling (Container)</summary>
        <div class="content">
          <ha-textfield label="Background (CSS)" .value="${this._config.style.card_bg}" .configValue="${"style.card_bg"}"></ha-textfield>
          <div class="grid">
            <ha-textfield label="Padding" .value="${this._config.style.card_padding}" .configValue="${"style.card_padding"}"></ha-textfield>
            <ha-textfield label="Border Radius" .value="${this._config.style.card_border_radius}" .configValue="${"style.card_border_radius"}"></ha-textfield>
          </div>
          <ha-textfield label="Box Shadow" .value="${this._config.style.card_shadow}" .configValue="${"style.card_shadow"}"></ha-textfield>
        </div>
      </details>

      <details>
        <summary>Typography & Colors</summary>
        <div class="content">
          <div class="grid">
            <ha-textfield label="Title Size" .value="${this._config.style.title_font_size}" .configValue="${"style.title_font_size"}"></ha-textfield>
            <ha-textfield label="Title Color" .value="${this._config.style.title_color}" .configValue="${"style.title_color"}"></ha-textfield>
          </div>
          <div class="grid">
            <ha-textfield label="Device Name Size" .value="${this._config.style.device_name_size}" .configValue="${"style.device_name_size"}"></ha-textfield>
            <ha-textfield label="Name Color" .value="${this._config.style.device_name_color}" .configValue="${"style.device_name_color"}"></ha-textfield>
          </div>
          <ha-textfield label="Firmware Text Color" .value="${this._config.style.version_color}" .configValue="${"style.version_color"}"></ha-textfield>
        </div>
      </details>

      <details>
        <summary>Device Rows & Elements</summary>
        <div class="content">
          <ha-textfield label="Row Background" .value="${this._config.style.device_bg}" .configValue="${"style.device_bg"}"></ha-textfield>
          <ha-textfield label="Bar Height" .value="${this._config.style.bar_height}" .configValue="${"style.bar_height"}"></ha-textfield>
        </div>
      </details>

      <details>
        <summary>Device Name Aliases (Manual Naming)</summary>
        <div class="content">
          ${this.getDeviceListHTML()}
        </div>
      </details>
    `;

    this.querySelectorAll('ha-textfield, ha-switch').forEach(el => {
      el.addEventListener('change', (ev) => this._valueChanged(ev));
    });
  }

  getDeviceListHTML() {
    const prefixes = new Set();
    for (const entityId in this._hass.states) {
      if (entityId.startsWith('sensor.') && entityId.endsWith('_cpu_utilization')) {
        prefixes.add(entityId.substring(7, entityId.length - 16));
      }
    }
    return Array.from(prefixes).map(prefix => `
      <ha-textfield label="Alias for ${prefix}" .value="${this._config.name_overrides?.[prefix] || ''}" .prefix="${prefix}" class="alias-input"></ha-textfield>
    `).join('');
  }

  _valueChanged(ev) {
    const configValue = ev.target.configValue;
    const value = ev.target.tagName === 'HA-SWITCH' ? ev.target.checked : ev.target.value;

    let newConfig = JSON.parse(JSON.stringify(this._config));

    if (configValue.startsWith('style.')) {
      const key = configValue.split('.')[1];
      newConfig.style[key] = value;
    } else {
      newConfig[configValue] = value;
    }

    if (ev.target.classList.contains('alias-input')) {
      if (!newConfig.name_overrides) newConfig.name_overrides = {};
      newConfig.name_overrides[ev.target.prefix] = value;
    }

    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
  }
}

customElements.define('unifi-monitor-card', UnifiMonitorCard);
customElements.define('unifi-monitor-card-editor', UnifiMonitorCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "unifi-monitor-card",
  name: "UniFi Monitor Pro",
  preview: true,
  description: "Advanced UniFi Monitoring with full styling support."
});
