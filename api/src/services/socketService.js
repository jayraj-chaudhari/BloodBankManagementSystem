let ioInstance = null;

/**
 * Initializes the Socket.IO instance for application-wide event broadcasting.
 * @param {import('socket.io').Server} io 
 */
function initSocket(io) {
  ioInstance = io;
}

/**
 * Returns the active Socket.IO server instance
 */
function getIO() {
  return ioInstance;
}

/**
 * Broadcasts an emergency blood alert
 * @param {Object} alertPayload 
 */
function emitEmergencyAlert(alertPayload) {
  if (!ioInstance) return;
  // Broadcast to all staff/officers
  ioInstance.to('role_bb_officer').to('role_admin').emit('emergency_alert', {
    ...alertPayload,
    emitted_at: new Date().toISOString()
  });

  // If specific donor IDs are targeted, dispatch directly to donor rooms
  if (Array.isArray(alertPayload.donor_ids)) {
    for (const donorId of alertPayload.donor_ids) {
      ioInstance.to(`donor_${donorId}`).emit('emergency_alert', {
        ...alertPayload,
        emitted_at: new Date().toISOString()
      });
    }
  }

  // Also emit globally for dashboards
  ioInstance.emit('emergency_alert_broadcast', {
    request_id: alertPayload.request_id,
    blood_group: alertPayload.blood_group,
    component: alertPayload.component,
    urgency: alertPayload.urgency,
    hospital_name: alertPayload.hospital_name,
    timestamp: new Date().toISOString()
  });
}

/**
 * Broadcasts donor alert response (ACCEPTED / DECLINED)
 * @param {Object} responsePayload 
 */
function emitAlertResponse(responsePayload) {
  if (!ioInstance) return;
  ioInstance.to('role_bb_officer').to('role_admin').emit('donor_alert_response', {
    ...responsePayload,
    emitted_at: new Date().toISOString()
  });
}

/**
 * Broadcasts live inventory change
 * @param {Object} updatePayload 
 */
function emitInventoryUpdate(updatePayload) {
  if (!ioInstance) return;
  ioInstance.emit('inventory_update', {
    ...updatePayload,
    emitted_at: new Date().toISOString()
  });
}

/**
 * Broadcasts newly created blood request
 * @param {Object} requestPayload 
 */
function emitRequestCreated(requestPayload) {
  if (!ioInstance) return;
  ioInstance.emit('new_blood_request', {
    ...requestPayload,
    emitted_at: new Date().toISOString()
  });
}

/**
 * Broadcasts request status updates (PENDING -> PARTIAL -> FULFILLED, CANCELLED)
 * @param {Object} updatePayload 
 */
function emitRequestUpdated(updatePayload) {
  if (!ioInstance) return;
  ioInstance.emit('request_update', {
    ...updatePayload,
    emitted_at: new Date().toISOString()
  });
}

module.exports = {
  initSocket,
  getIO,
  emitEmergencyAlert,
  emitAlertResponse,
  emitInventoryUpdate,
  emitRequestCreated,
  emitRequestUpdated
};
