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
    return { title: "Netzwerk Infrastruktur", auto_discover: true };
  }

  setConfig(config) {
    this.config = {
      title: 'Netzwerk Infrastruktur',
      auto_discover: true,
      devices: [],
      // Standard leere Theme-Werte
      color_bg: '',
      color_cpu: '',
      color_ram: '',
      color_online: '',
      color_offline: '',
      border_radius: '',
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
      const hasMem = this._hass.states[`sensor.${prefix}_memory_utilization`];
      const hasRestart = this._hass.states[`button.${prefix}_restart`];

      if (hasMem || hasRestart) {
        let name = prefix.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        let icon = 'mdi:router-network';
        if (prefix.includes('usw') || prefix.includes('switch')) icon = 'mdi:switch';
        if (prefix.includes('u6') || prefix.includes('ap') || prefix.includes('wifi') || prefix.includes('flex')) icon = 'mdi:access-point';

        devices.push({ prefix: prefix, name: name, icon: icon });
      }
    });

    return devices.sort((a, b) => a.name.localeCompare(b.name));
  }

  render() {
    // Hier mappen wir die Konfigurationswerte auf unsere CSS Variablen.
    // Wenn nichts im Editor gesetzt wurde, greift der Fallback.
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --umc-bg: ${this.config.color_bg || 'var(--ha-card-background, var(--card-background-color, white))'};
          --umc-border-radius: ${this.config.border_radius || 'var(--ha-card-border-radius, 12px)'};
          --umc-shadow: var(--ha-card-box-shadow, 0px 2px 4px 0px rgba(0,0,0,0.16));
          --umc-text-color: var(--primary-text-color);
          --umc-subtext-color: var(--secondary-text-color);
          --umc-icon-color: var(--state-icon-color, #44739e);
          
          --umc-icon-online: ${this.config.color_online || '#4caf50'};
          --umc-icon-offline: ${this.config.color_offline || '#f44336'};
          
          --umc-bar-bg: rgba(150, 150, 150, 0.2);
          --umc-bar-cpu: ${this.config.color_cpu || 'var(--primary-color, #03a9f4)'};
          --umc-bar-ram: ${this.config.color_ram || 'var(--accent-color, #ff9800)'};
          
          --umc-font-family: var(--primary-font-family, inherit);
        }
        
        .card-container {
          background: var(--umc-bg);
          border-radius: var(--umc-border-radius);
          box-shadow: var(--umc-shadow);
          padding: 16px;
          font-family: var(--umc-font-family);
          color: var(--umc-text-color);
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .header {
          font-size: 1.2rem;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .device-row {
          display: grid;
          grid-template-columns: 40px 1fr auto;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          background: rgba(150,150,150, 0.05);
          transition: background 0.2s;
        }

        .device-row:hover { background: rgba(150,150,150, 0.1); }

        .icon-wrapper ha-icon {
          color: var(--umc-icon-color);
          --mdc-icon-size: 28px;
        }
        .icon-wrapper.online ha-icon { color: var(--umc-icon-online); }
        .icon-wrapper.offline ha-icon { color: var(--umc-icon-offline); }

        .info-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .device-name {
          font-weight: 600;
          font-size: 14px;
        }

        .stats-container {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 11px;
          color: var(--umc-subtext-color);
        }

        .stat-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stat-label { width: 35px; }

        .bar-bg {
          flex-grow: 1;
          height: 6px;
          background: var(--umc-bar-bg);
          border-radius: 3px;
          overflow: hidden;
        }

        .bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s ease;
        }
        .bar-fill.cpu { background: var(--umc-bar-cpu); }
        .bar-fill.ram { background: var(--umc-bar-ram); }

        .actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-end;
        }

        .btn {
          background: transparent;
          border: 1px solid var(--umc-bar-bg);
          color: var(--umc-text-color);
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .btn:hover { background: rgba(150,150,150,0.1); }
        
        .update-available {
          color: var(--umc-bar-ram);
          border-color: var(--umc-bar-ram);
        }
        
        .empty-state {
          text-align: center;
          padding: 20px;
          color: var(--umc-subtext-color);
          font-style: italic;
        }
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
    
    const activeDevices = (this.config.devices && this.config.devices.length > 0) 
                            ? this.config.devices 
                            : this._discoveredDevices;

    if (!activeDevices || activeDevices.length === 0) {
      this.content.innerHTML = '<div class="empty-state">Keine UniFi-Geräte gefunden.</div>';
      return;
    }

    activeDevices.forEach(device => {
      const prefix = device.prefix;
      const name = device.name || prefix.replace(/_/g, ' ').toUpperCase();
      const icon = device.icon || 'mdi:router-network';

      const stateObj = this._hass.states[`sensor.${prefix}_state`] || this._hass.states[`device_tracker.${prefix}`];
      const cpuObj = this._hass.states[`sensor.${prefix}_cpu_utilization`];
      const ramObj = this._hass.states[`sensor.${prefix}_memory_utilization`];
      const tempObj = this._hass.states[`sensor.${prefix}_temperature`] || this._hass.states[`sensor.${prefix}_cpu_temperature`];
      const updateObj = this._hass.states[`update.${prefix}`];

      const status = stateObj ? stateObj.state.toLowerCase() : 'unknown';
      const statusClass = (status === 'connected' || status === 'home' || status === 'online') ? 'online' : (status === 'unknown' ? '' : 'offline');

      const cpu = cpuObj ? parseFloat(cpuObj.state) : null;
      const ram = ramObj ? parseFloat(ramObj.state) : null;
      const temp = tempObj ? parseFloat(tempObj.state) : null;
      const hasUpdate = updateObj && updateObj.state === 'on';

      html += `
        <div class="device-row">
          <div class="icon-wrapper ${statusClass}">
            <ha-icon icon="${icon}"></ha-icon>
          </div>
          
          <div class="info-col">
            <div class="device-name">${name}</div>
            <div class="stats-container">
              ${cpu !== null && !isNaN(cpu) ? `
                <div class="stat-row">
                  <span class="stat-label">CPU:</span>
                  <div class="bar-bg"><div class="bar-fill cpu" style="width: ${cpu}%"></div></div>
                  <span>${cpu}%</span>
                </div>
              ` : ''}
              ${ram !== null && !isNaN(ram) ? `
                <div class="stat-row">
                  <span class="stat-label">RAM:</span>
                  <div class="bar-bg"><div class="bar-fill ram" style="width: ${ram}%"></div></div>
                  <span>${ram}%</span>
                </div>
              ` : ''}
              ${temp !== null && !isNaN(temp) ? `
                <div class="stat-row">
                  <span class="stat-label">Temp:</span>
                  <span>${temp}°C</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="actions">
            ${hasUpdate ? `
              <button class="btn update-available" onclick="this.getRootNode().host.triggerUpdate('${prefix}')">
                <ha-icon icon="mdi:cellphone-arrow-down" style="--mdc-icon-size: 14px;"></ha-icon> Update
              </button>
            ` : ''}
            ${this._hass.states[`button.${prefix}_restart`] ? `
            <button class="btn" onclick="this.getRootNode().host.triggerRestart('${prefix}')">
              <ha-icon icon="mdi:restart" style="--mdc-icon-size: 14px;"></ha-icon>
            </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    this.content.innerHTML = html;
  }

  triggerRestart(prefix) {
    if(confirm('Gerät wirklich neu starten?')) {
      this._hass.callService('button', 'press', { entity_id: `button.${prefix}_restart` });
    }
  }

  triggerUpdate(prefix) {
    if(confirm('Update installieren? Dies kann einige Minuten dauern.')) {
      this._hass.callService('update', 'install', { entity_id: `update.${prefix}` });
    }
  }

  getCardSize() {
    return this._discoveredDevices ? this._discoveredDevices.length + 1 : 2;
  }
}

// -------------------------------------------------------------
// DER ERWEITERTE VISUELLE EDITOR
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
    if (!this._config) return;
    
    // Hilfsfunktion für Textfelder
    const createField = (label, configKey, placeholder = "") => `
      <ha-textfield
        label="${label}"
        value="${this._config[configKey] || ''}"
        placeholder="${placeholder}"
        configValue="${configKey}"
        style="width: 100%; margin-bottom: 8px;"
      ></ha-textfield>
    `;

    this.innerHTML = `
      <style>
        .section-title {
          font-weight: 600;
          font-size: 14px;
          margin: 16px 0 8px 0;
          color: var(--secondary-text-color);
          border-bottom: 1px solid var(--divider-color);
          padding-bottom: 4px;
        }
        .row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
      </style>

      <div style="display: flex; flex-direction: column;">
        
        <div class="section-title">Allgemeine Einstellungen</div>
        ${createField("Titel der Karte", "title")}
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin: 12px 0;">
          <span>Auto-Discovery (Automatische Gerätesuche)</span>
          <ha-switch
            ${this._config.auto_discover !== false ? 'checked' : ''}
            configValue="auto_discover"
          ></ha-switch>
        </div>

        <div class="section-title">Farben & Design (Hex oder var)</div>
        <p style="font-size: 12px; color: var(--secondary-text-color); margin-top: 0;">
          Du kannst Werte wie <code>#FF0000</code>, <code>rgb(0,0,0)</code> oder HA-Variablen wie <code>var(--primary-color)</code> nutzen. Leer lassen für Standard.
        </p>
        
        <div class="row">
          ${createField("Karten-Hintergrund", "color_bg", "z.B. #1e1e1e")}
          ${createField("Ecken-Radius", "border_radius", "z.B. 16px")}
        </div>

        <div class="section-title">Balken-Farben</div>
        <div class="row">
          ${createField("CPU Balken", "color_cpu")}
          ${createField("RAM Balken", "color_ram")}
        </div>

        <div class="section-title">Status-Icons</div>
        <div class="row">
          ${createField("Icon Online", "color_online", "z.B. #4caf50")}
          ${createField("Icon Offline", "color_offline", "z.B. #f44336")}
        </div>
        
      </div>
    `;

    // Event-Listener an alle Felder binden
    const textfields = this.querySelectorAll('ha-textfield');
    textfields.forEach(field => {
      field.addEventListener('input', this._valueChanged.bind(this));
    });

    const toggle = this.querySelector('ha-switch');
    if (toggle) {
      toggle.addEventListener('change', this._valueChanged.bind(this));
    }
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;
    
    const target = ev.target;
    const configValue = target.getAttribute('configValue');
    
    let newValue = target.value;
    if (target.tagName === 'HA-SWITCH') {
      newValue = target.checked;
    }

    if (this._config[configValue] === newValue) return;

    // Neues Konfig-Objekt bauen und leere Strings entfernen, damit Fallbacks greifen
    const newConfig = { ...this._config };
    if (newValue === "" || newValue === undefined) {
      delete newConfig[configValue];
    } else {
      newConfig[configValue] = newValue;
    }
    
    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }
}

customElements.define('unifi-monitor-card', UnifiMonitorCard);
customElements.define('unifi-monitor-card-editor', UnifiMonitorCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "unifi-monitor-card",
  name: "UniFi Monitor",
  preview: true,
  description: "Eine stark anpassbare Dashboard-Karte für UniFi Geräte."
});
