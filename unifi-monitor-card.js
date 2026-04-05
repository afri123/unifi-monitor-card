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
      name_overrides: {} 
    };
  }

  setConfig(config) {
    this.config = {
      title: 'UniFi Network',
      auto_discover: true,
      show_version: true,
      name_overrides: {},
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      this.render();
    }
    
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
      if (prefix.includes('u6') || prefix.includes('ap') || prefix.includes('wifi')) icon = 'mdi:access-point';
      devices.push({ prefix: prefix, default_name: name, icon: icon });
    });
    return devices.sort((a, b) => a.default_name.localeCompare(b.default_name));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --umc-bg: ${this.config.color_bg || 'var(--ha-card-background, var(--card-background-color, white))'};
          --umc-border-radius: ${this.config.border_radius || 'var(--ha-card-border-radius, 12px)'};
          --umc-icon-online: ${this.config.color_online || '#4caf50'};
          --umc-icon-offline: ${this.config.color_offline || '#f44336'};
          --umc-update-blue: #03a9f4;
        }
        .card-container { background: var(--umc-bg); border-radius: var(--umc-border-radius); padding: 16px; font-family: var(--primary-font-family, inherit); color: var(--primary-text-color); box-shadow: var(--ha-card-box-shadow, none); }
        .header { font-size: 1.2rem; font-weight: bold; margin-bottom: 12px; }
        .device-row { display: grid; grid-template-columns: 40px 1fr auto; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; background: rgba(150,150,150, 0.05); margin-bottom: 8px; }
        .icon-wrapper ha-icon { --mdc-icon-size: 26px; }
        .online { color: var(--umc-icon-online); }
        .offline { color: var(--umc-icon-offline); }
        .info-col { display: flex; flex-direction: column; }
        .name-row { display: flex; align-items: center; gap: 8px; }
        .device-name { font-weight: 600; font-size: 14px; cursor: pointer; }
        .device-name:hover { text-decoration: underline; color: var(--primary-color); }
        .version-text { font-size: 10px; color: var(--secondary-text-color); margin-top: -2px; }
        .update-badge { background: var(--umc-update-blue); color: white; font-size: 9px; padding: 2px 6px; border-radius: 10px; cursor: pointer; font-weight: bold; text-transform: uppercase; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(3, 169, 244, 0.7); } 70% { box-shadow: 0 0 0 6px rgba(3, 169, 244, 0); } 100% { box-shadow: 0 0 0 0 rgba(3, 169, 244, 0); } }
        .stats-container { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--secondary-text-color); margin-top: 6px; }
        .stat-row { display: flex; align-items: center; gap: 8px; }
        .bar-bg { flex-grow: 1; height: 4px; background: rgba(150,150,150, 0.2); border-radius: 2px; overflow: hidden; }
        .bar-fill { height: 100%; transition: width 0.5s; background: var(--primary-color); }
        .btn-restart { background: transparent; border: 1px solid rgba(150,150,150,0.2); color: var(--primary-text-color); padding: 4px; border-radius: 4px; cursor: pointer; }
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
      const versionObj = this._hass.states[`sensor.${prefix}_version`];
      const updateObj = this._hass.states[`update.${prefix}`];

      const isOnline = stateObj && (stateObj.state === 'connected' || stateObj.state === 'online');
      const hasUpdate = updateObj && updateObj.state === 'on';
      const version = versionObj ? versionObj.state : 'Unknown';

      html += `
        <div class="device-row">
          <div class="icon-wrapper ${isOnline ? 'online' : 'offline'}">
            <ha-icon icon="${device.icon || 'mdi:router-network'}"></ha-icon>
          </div>
          <div class="info-col">
            <div class="name-row">
              <span class="device-name" onclick="this.getRootNode().host.openDetails('${prefix}')">${displayName}</span>
              ${hasUpdate ? `<span class="update-badge" onclick="this.getRootNode().host.triggerUpdate('${prefix}')">Update</span>` : ''}
            </div>
            ${this.config.show_version ? `<span class="version-text">v${version}</span>` : ''}
            <div class="stats-container">
              <div class="stat-row">
                <div class="bar-bg"><div class="bar-fill" style="width: ${cpuObj ? cpuObj.state : 0}%"></div></div>
                <span>CPU: ${cpuObj ? cpuObj.state : 0}%</span>
              </div>
              <div class="stat-row">
                <div class="bar-bg"><div class="bar-fill" style="width: ${ramObj ? ramObj.state : 0}%; background: var(--accent-color);"></div></div>
                <span>RAM: ${ramObj ? ramObj.state : 0}%</span>
              </div>
            </div>
          </div>
          <button class="btn-restart" onclick="this.getRootNode().host.triggerRestart('${prefix}')">
            <ha-icon icon="mdi:restart" style="--mdc-icon-size: 18px;"></ha-icon>
          </button>
        </div>
      `;
    });
    this.content.innerHTML = html;
  }

  openDetails(prefix) {
    const entityId = `sensor.${prefix}_cpu_utilization`;
    const event = new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  triggerRestart(prefix) {
    if(confirm(`Gerät ${prefix} wirklich neu starten?`)) {
      this._hass.callService('button', 'press', { entity_id: `button.${prefix}_restart` });
    }
  }

  triggerUpdate(prefix) {
    if(confirm(`Firmware-Update für ${prefix} jetzt installieren?`)) {
      this._hass.callService('update', 'install', { entity_id: `update.${prefix}` });
    }
  }
}

// -------------------------------------------------------------
// EDITOR MIT AKKORDEON FÜR NAMEN
// -------------------------------------------------------------
class UnifiMonitorCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  render() {
    if (!this._config || !this._hass) return;

    this.innerHTML = `
      <style>
        .section { margin-bottom: 16px; border: 1px solid var(--divider-color); border-radius: 4px; padding: 12px; }
        .section-title { font-weight: bold; margin-bottom: 8px; display: block; color: var(--secondary-text-color); text-transform: uppercase; font-size: 12px; }
        details { border: 1px solid var(--divider-color); border-radius: 4px; padding: 8px; margin-top: 10px; }
        summary { cursor: pointer; font-weight: bold; padding: 4px; outline: none; }
        .name-edit-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        ha-textfield { width: 100%; }
        ha-switch { margin-bottom: 8px; }
        .flex-between { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      </style>

      <div class="section">
        <ha-textfield label="Kartentitel" .value="${this._config.title}" .configValue="${"title"}"></ha-textfield>
        
        <div class="flex-between" style="margin-top: 12px;">
          <span>Firmware-Version anzeigen</span>
          <ha-switch .checked="${this._config.show_version !== false}" .configValue="${"show_version"}"></ha-switch>
        </div>

        <div class="flex-between">
          <span>Automatische Gerätesuche</span>
          <ha-switch .checked="${this._config.auto_discover !== false}" .configValue="${"auto_discover"}"></ha-switch>
        </div>

        <details>
          <summary>Gerätenamen anpassen (Alias)</summary>
          <div id="name-editor-list" style="padding-top: 10px;">
            ${this.getDeviceListHTML()}
          </div>
        </details>
      </div>
    `;

    this.querySelectorAll('ha-textfield, ha-switch').forEach(el => {
      el.addEventListener('change', (ev) => this._valueChanged(ev));
    });

    this.querySelectorAll('.name-override-input').forEach(el => {
      el.addEventListener('input', (ev) => this._handleNameOverride(ev));
    });
  }

  getDeviceListHTML() {
    // Liste der verfügbaren Geräte generieren
    const prefixes = new Set();
    for (const entityId in this._hass.states) {
      if (entityId.startsWith('sensor.') && entityId.endsWith('_cpu_utilization')) {
        prefixes.add(entityId.substring(7, entityId.length - 16));
      }
    }

    return Array.from(prefixes).map(prefix => `
      <div class="name-edit-row">
        <ha-textfield 
          label="${prefix}" 
          .value="${this._config.name_overrides?.[prefix] || ''}" 
          .prefix="${prefix}"
          class="name-override-input"
        ></ha-textfield>
      </div>
    `).join('');
  }

  _handleNameOverride(ev) {
    const prefix = ev.target.prefix;
    const value = ev.target.value;
    const name_overrides = { ...this._config.name_overrides, [prefix]: value };
    
    this._dispatchEvent({ ...this._config, name_overrides });
  }

  _valueChanged(ev) {
    const value = ev.target.tagName === 'HA-SWITCH' ? ev.target.checked : ev.target.value;
    this._dispatchEvent({ ...this._config, [ev.target.configValue]: value });
  }

  _dispatchEvent(config) {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('unifi-monitor-card', UnifiMonitorCard);
customElements.define('unifi-monitor-card-editor', UnifiMonitorCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "unifi-monitor-card",
  name: "UniFi Monitor",
  preview: true,
  description: "Automatisierter UniFi Infrastruktur-Monitor mit Firmware-Steuerung."
});
