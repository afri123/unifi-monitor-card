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
    this.config = JSON.parse(JSON.stringify(config));
    if (!this.config.style) this.config.style = {};
    if (!this.config.name_overrides) this.config.name_overrides = {};
    
    const defaults = UnifiMonitorCard.getStubConfig().style;
    for (const key in defaults) {
      if (this.config.style[key] === undefined) {
        this.config.style[key] = defaults[key];
      }
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.content) this.render();
    this._discoveredDevices = this.discoverDevices();
    this.updateData();
  }

  discoverDevices() {
    const devices = [];
    if (!this._hass) return devices;
    const prefixes = new Set();
    for (const entityId in this._hass.states) {
      if (entityId.startsWith('sensor.') && entityId.endsWith('_cpu_utilization')) {
        const prefix = entityId.substring(7, entityId.length - 16);
        prefixes.add(prefix);
      }
    }
    prefixes.forEach(prefix => {
      const cpuEntity = this._hass.states[`sensor.${prefix}_cpu_utilization`];
      let rawName = cpuEntity?.attributes?.friendly_name || prefix;
      let cleanName = rawName.split(' (')[0].replace(/ CPU utilization/i, '');
      let icon = 'mdi:router-network';
      if (prefix.includes('usw') || prefix.includes('switch')) icon = 'mdi:switch';
      if (prefix.includes('u6') || prefix.includes('ap') || prefix.includes('wifi') || prefix.includes('iw')) icon = 'mdi:access-point';
      devices.push({ prefix: prefix, default_name: cleanName, icon: icon });
    });
    return devices.sort((a, b) => a.default_name.localeCompare(b.default_name));
  }

  render() {
    const s = this.config.style || {};
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --umc-update-blue: #03a9f4;
          --umc-online: ${this.config.color_online || '#4caf50'};
          --umc-offline: ${this.config.color_offline || '#f44336'};
        }
        .card-container { 
          background: ${s.card_bg}; border-radius: ${s.card_border_radius}; 
          padding: ${s.card_padding}; box-shadow: ${s.card_shadow};
          font-family: var(--primary-font-family, inherit); color: var(--primary-text-color); 
        }
        .header { font-size: ${s.title_font_size}; color: ${s.title_color}; font-weight: bold; margin-bottom: 12px; }
        .device-row { 
          display: grid; grid-template-columns: 40px 1fr auto; align-items: center; 
          gap: 12px; padding: 12px; border-radius: 8px; background: ${s.device_bg}; margin-bottom: 8px; 
        }
        .online { color: var(--umc-online); }
        .offline { color: var(--umc-offline); }
        .device-name { font-weight: 600; font-size: ${s.device_name_size}; color: ${s.device_name_color}; cursor: pointer; }
        .version-text { font-size: 10px; color: ${s.version_color}; margin-top: -2px; }
        .update-badge { background: var(--umc-update-blue); color: white; font-size: 9px; padding: 2px 6px; border-radius: 10px; cursor: pointer; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(3, 169, 244, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(3, 169, 244, 0); } 100% { box-shadow: 0 0 0 0 rgba(3, 169, 244, 0); } }
        .stat-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--secondary-text-color); margin-top: 4px; }
        .bar-bg { flex-grow: 1; height: ${s.bar_height}; background: rgba(150,150,150, 0.2); border-radius: 2px; overflow: hidden; }
        .bar-fill { height: 100%; transition: width 0.5s; background: var(--primary-color); }
        .btn-restart { background: transparent; border: none; color: var(--primary-text-color); cursor: pointer; opacity: 0.6; }
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
    if (!this._discoveredDevices) return;
    this._discoveredDevices.forEach(device => {
      const prefix = device.prefix;
      const displayName = this.config.name_overrides?.[prefix] || device.default_name;
      const cpuObj = this._hass.states[`sensor.${prefix}_cpu_utilization`];
      const ramObj = this._hass.states[`sensor.${prefix}_memory_utilization`];
      const stateObj = this._hass.states[`sensor.${prefix}_state`];
      const updateObj = this._hass.states[`update.${prefix}`];
      const isOnline = stateObj && (stateObj.state === 'connected' || stateObj.state === 'online' || stateObj.state === 'home');
      const hasUpdate = updateObj && updateObj.state === 'on';
      const version = updateObj?.attributes?.installed_version || 'N/A';

      html += `
        <div class="device-row">
          <div class="icon-wrapper ${isOnline ? 'online' : 'offline'}">
            <ha-icon icon="${device.icon}"></ha-icon>
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

// --- STABILISIERTER EDITOR ---
class UnifiMonitorCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  render() {
    if (!this._config || !this._hass) return;
    const style = this._config.style || {};

    this.innerHTML = `
      <style>
        details { border: 1px solid var(--divider-color); border-radius: 8px; margin-bottom: 8px; background: var(--card-background-color); overflow: hidden; }
        summary { cursor: pointer; padding: 12px; font-weight: bold; outline: none; background: rgba(0,0,0,0.02); }
        .content { padding: 12px; display: flex; flex-direction: column; gap: 12px; }
        ha-textfield { width: 100%; }
        .flex { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
      </style>

      <details open>
        <summary>General Settings</summary>
        <div class="content">
          <ha-textfield label="Title" .value="${this._config.title || ''}" .configValue="title"></ha-textfield>
          <div class="flex">
            <span>Show Firmware Version</span>
            <ha-switch .checked="${this._config.show_version !== false}" .configValue="show_version"></ha-switch>
          </div>
          <div class="flex">
            <span>Auto Discover Devices</span>
            <ha-switch .checked="${this._config.auto_discover !== false}" .configValue="auto_discover"></ha-switch>
          </div>
        </div>
      </details>

      <details>
        <summary>Card Styling</summary>
        <div class="content">
          <ha-textfield label="Background Color / Gradient" .value="${style.card_bg || ''}" .configValue="style.card_bg"></ha-textfield>
          <div class="grid">
            <ha-textfield label="Padding" .value="${style.card_padding || ''}" .configValue="style.card_padding"></ha-textfield>
            <ha-textfield label="Border Radius" .value="${style.card_border_radius || ''}" .configValue="style.card_border_radius"></ha-textfield>
          </div>
          <ha-textfield label="Box Shadow" .value="${style.card_shadow || ''}" .configValue="style.card_shadow"></ha-textfield>
          <div class="grid">
             <ha-textfield label="Title Size" .value="${style.title_font_size || ''}" .configValue="style.title_font_size"></ha-textfield>
             <ha-textfield label="Title Color" .value="${style.title_color || ''}" .configValue="style.title_color"></ha-textfield>
          </div>
        </div>
      </details>

      <details>
        <summary>Device Customization</summary>
        <div class="content">
          <ha-textfield label="Device Row Background" .value="${style.device_bg || ''}" .configValue="style.device_bg"></ha-textfield>
          <div class="grid">
            <ha-textfield label="Name Size" .value="${style.device_name_size || ''}" .configValue="style.device_name_size"></ha-textfield>
            <ha-textfield label="Name Color" .value="${style.device_name_color || ''}" .configValue="style.device_name_color"></ha-textfield>
          </div>
          <ha-textfield label="Bar Height" .value="${style.bar_height || ''}" .configValue="style.bar_height"></ha-textfield>
        </div>
      </details>

      <details>
        <summary>Manual Name Aliases</summary>
        <div class="content">
          ${this.getDeviceListHTML()}
        </div>
      </details>
    `;

    // Event Listener binden
    this.querySelectorAll('ha-textfield').forEach(el => {
      el.addEventListener('change', (ev) => this._valueChanged(ev));
    });
    this.querySelectorAll('ha-switch').forEach(el => {
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
    return Array.from(prefixes).map(prefix => {
      const currentAlias = (this._config.name_overrides || {})[prefix] || '';
      return `<ha-textfield label="Alias for ${prefix}" .value="${currentAlias}" .prefix="${prefix}" class="alias-input"></ha-textfield>`;
    }).join('');
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;
    const target = ev.target;
    const configValue = target.configValue;
    const value = target.tagName === 'HA-SWITCH' ? target.checked : target.value;

    let newConfig = JSON.parse(JSON.stringify(this._config));

    if (target.classList.contains('alias-input')) {
      const prefix = target.prefix;
      if (!newConfig.name_overrides) newConfig.name_overrides = {};
      if (value === "") delete newConfig.name_overrides[prefix];
      else newConfig.name_overrides[prefix] = value;
    } else if (configValue.includes('.')) {
      const [parent, child] = configValue.split('.');
      if (!newConfig[parent]) newConfig[parent] = {};
      newConfig[parent][child] = value;
    } else {
      newConfig[configValue] = value;
    }

    this._config = newConfig;
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
  description: "Advanced UniFi Monitoring with persistent editor state."
});
