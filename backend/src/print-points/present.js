function toOwnerPoint(point) {
  return {
    id: point.id,
    name: point.name,
    city: point.city,
    address: point.address,
    workingHours: point.workingHours,
    pricePerPageBw: point.pricePerPageBw,
    pricePerPageColor: point.pricePerPageColor,
    status: point.status,
    isActive: point.isActive,
    rejectionReason: point.rejectionReason ?? null,
    commissionBps: point.commissionBps,
  };
}

function toAdminPoint(point) {
  return {
    ...toOwnerPoint(point),
    owner: {
      id: point.owner.id,
      email: point.owner.email,
    },
  };
}

module.exports = { toOwnerPoint, toAdminPoint };
