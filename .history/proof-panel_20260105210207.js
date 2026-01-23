/**
 * Proof Panel - Injectable script for jobspeakpro.com
 * Displays rate limiting debug information on-page
 * 
 * Usage: Paste this into browser console on jobspeakpro.com/practice
 * It will intercept /api/practice/answer requests and display debug info
 */

(function () {
    // Create proof panel container
    const panel = document.createElement('div');
    panel.id = 'rate-limit-proof-panel';
    panel.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    width: 400px;
    max-height: 600px;
    overflow-y: auto;
    background: #0f172a;
    color: white;
    padding: 16px;
    border-radius: 8px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    border: 2px solid #10b981;
    z-index: 999999;
    font-family: 'Courier New', monospace;
    font-size: 11px;
  `;

    panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #334155;">
      <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: #10b981;">Rate Limiting Proof Panel</h3>
      <span style="color: #64748b; font-size: 10px;" id="request-count">0 requests</span>
    </div>
    <div id="proof-panel-content" style="display: flex; flex-direction: column; gap: 12px;">
      <div style="color: #64748b; text-align: center; padding: 20px;">
        Waiting for requests...
      </div>
    </div>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #334155; text-align: center; color: #64748b; font-size: 10px;">
      Production Proof - jobspeakpro.com
    </div>
  `;

    document.body.appendChild(panel);

    // Store responses
    window._proofPanelResponses = [];

    // Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const url = args[0];

        if (typeof url === 'string' && url.includes('/api/practice/answer')) {
            const response = await originalFetch.apply(this, args);
            const clone = response.clone();

            try {
                const data = await clone.json();
                const timestamp = new Date().toISOString();

                // Store response
                window._proofPanelResponses.push({
                    ...data,
                    timestamp,
                    statusCode: response.status
                });

                // Update panel
                updateProofPanel();
            } catch (err) {
                console.error('[Proof Panel] Failed to parse response:', err);
            }

            return response;
        }

        return originalFetch.apply(this, args);
    };

    function updateProofPanel() {
        const content = document.getElementById('proof-panel-content');
        const count = document.getElementById('request-count');
        const responses = window._proofPanelResponses;

        count.textContent = `${responses.length} request${responses.length !== 1 ? 's' : ''}`;

        content.innerHTML = responses.map((response, index) => {
            const isBlocked = response.blocked === true;
            const statusCode = response.statusCode || (isBlocked ? 429 : 200);
            const statusColor = isBlocked ? '#ef4444' : '#10b981';
            const bgColor = isBlocked ? 'rgba(239, 68, 68, 0.1)' : '#1e293b';
            const borderColor = isBlocked ? '#ef4444' : '#475569';

            return `
        <div style="padding: 12px; border-radius: 6px; background: ${bgColor}; border: 1px solid ${borderColor};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: bold; color: white;">Request #${index + 1}</span>
            <span style="font-weight: bold; color: ${statusColor};">HTTP ${statusCode}</span>
          </div>
          
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 10px;">
            ${response.debug ? `
              <div style="display: flex; justify-between;">
                <span style="color: #94a3b8;">Identity Key:</span>
                <span style="color: #22d3ee; max-width: 200px; overflow: hidden; text-overflow: ellipsis;" title="${response.debug.identityKey}">${response.debug.identityKey}</span>
              </div>
              <div style="display: flex; justify-between;">
                <span style="color: #94a3b8;">Source:</span>
                <span style="color: #22d3ee;">${response.debug.identitySource}</span>
              </div>
            ` : ''}
            
            ${response.usage ? `
              <div style="display: flex; justify-between;">
                <span style="color: #94a3b8;">Used:</span>
                <span style="color: #fbbf24;">${response.usage.used}</span>
              </div>
              <div style="display: flex; justify-between;">
                <span style="color: #94a3b8;">Limit:</span>
                <span style="color: #fbbf24;">${response.usage.limit}</span>
              </div>
              <div style="display: flex; justify-between;">
                <span style="color: #94a3b8;">Remaining:</span>
                <span style="color: #fbbf24;">${response.usage.remaining}</span>
              </div>
            ` : ''}
            
            <div style="display: flex; justify-between;">
              <span style="color: #94a3b8;">Blocked:</span>
              <span style="color: ${isBlocked ? '#ef4444' : '#10b981'}; font-weight: ${isBlocked ? 'bold' : 'normal'};">
                ${isBlocked ? 'TRUE' : 'false'}
              </span>
            </div>
            
            ${response.reason ? `
              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #334155;">
                <div style="color: #94a3b8; margin-bottom: 4px;">Reason:</div>
                <div style="color: #ef4444; font-weight: bold;">${response.reason}</div>
              </div>
            ` : ''}
            
            <div style="display: flex; justify-between; margin-top: 8px; padding-top: 8px; border-top: 1px solid #334155; font-size: 9px; color: #64748b;">
              <span>Timestamp:</span>
              <span>${new Date(response.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      `;
        }).join('');
    }

    console.log('[Proof Panel] Installed successfully. Make 4 "Fix My Answer" attempts to see rate limiting in action.');
})();
