class UnifiMonitorCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._discoveredDevices = null;
  }

  setConfig(config) {
    // Standardmäßig Auto-Discovery aktivieren, falls "devices" nicht manuell gesetzt wurde
    this.config = {
      title: 'Netzwerk Infrastruktur',
      auto_discover: true,
      devices: [],
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.content) {
      this.render();
    }
    
    // Führe Auto-Discovery nur einmalig aus, um Leistung zu sparen
    if (this.config.auto_discover && !this._discoveredDevices) {
      this._discoveredDevices = this.discoverDevices();
    }

    this.updateData();
  }

  discoverDevices() {
    const devices = [];
    const prefixes = new Set();

    // 1. Alle Entitäten durchsuchen, die auf _cpu_utilization enden
    for (const entityId in this._hass.states) {
      if (entityId.startsWith('sensor.') && entityId.endsWith('_cpu_utilization')) {
        // Extrahiere den Präfix (z.B. aus 'sensor.udm_se_cpu_utilization' wird 'udm_se')
        const prefix = entityId.substring(7, entityId.length - 16);
        prefixes.add(prefix);
      }
    }

    // 2. Präfixe validieren und formatieren
    prefixes.forEach(prefix => {
      // Prüfen, ob es wirklich ein UniFi Netzwerkgerät ist (hat meistens auch Memory oder einen Restart-Button)
      const hasMem = this._hass.states[`sensor.${prefix}_memory_utilization`];
      const hasRestart = this._hass.states[`button.${prefix}_restart`];

      if (hasMem || hasRestart) {
        // Schönen Namen generieren (z.B. "udm_se" -> "Udm Se")
        let name = prefix.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        
        // Smartes Icon-Matching anhand des Namens
        let icon = 'mdi:router-network';
        if (prefix.includes('usw') || prefix.includes('switch')) icon = 'mdi:switch';
        if (prefix.includes('u6') || prefix.includes('ap') || prefix.includes('wifi') || prefix.includes('flex')) icon = 'mdi:access-point';

        devices.push({
          prefix: prefix,
          name: name,
          icon: icon
        });
      }
    });

    // Alphabetisch nach Namen sortieren
    return devices.sort((a, b) => a.name.localeCompare(b.name));
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --umc-bg: var(--ha-card-background, var(--card-background-color, white));
          --umc-border-radius: var(--ha-card-border-radius, 12px);
          --umc-shadow: var(--ha-card-box-shadow, 0px 2px 4px 0px rgba(0,0,0,0.16));
          --umc-text-color: var(--primary-text-color);
          --umc-subtext-color: var(--secondary-text-color);
          --umc-icon-color: var(--state-icon-color, #44739e);
          --umc-icon-online: #4caf50;
          --umc-icon-offline: #f44336;
          --umc-bar-bg: rgba(150, 150, 150, 0.2);
          --umc-bar-cpu: var(--primary-color, #03a9f4);
          --umc-bar-ram: var(--accent-color, #ff9800);
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
    
    // Nutze entweder die manuell definierten Geräte oder die automatisch gefundenen
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

customElements.define('unifi-monitor-card', UnifiMonitorCard);

// Dieser Block sorgt dafür, dass die Karte im visuellen Editor auftaucht:
window.customCards = window.customCards || [];
window.customCards.push({
  type: "unifi-monitor-card",
  name: "UniFi Monitor",
  preview: true,
  description: "Eine stark anpassbare Dashboard-Karte für UniFi Geräte."
});
