export function callerDispatchSms(opts: {
  driverName: string;
  driverPhone: string | null;
  vehicleLabel: string | null;
  status: string;
}): string {
  const unit = [opts.driverName, opts.vehicleLabel].filter(Boolean).join(" · ");
  const phone = opts.driverPhone ? ` Call/WhatsApp: ${opts.driverPhone}.` : "";
  return (
    `Emergency dispatch: ${unit || "an ambulance unit"} is ${opts.status.toLowerCase()}.` +
    phone +
    ` Stay calm and keep your phone on. Do not reply to this automated message.`
  );
}

export function hospitalIntakeSms(opts: {
  emergencyType: string | null;
  priority: number | null;
  driverName: string | null;
  vehicleLabel: string | null;
  patientAgeBand: string | null;
  address: string | null;
}): string {
  const prio =
    opts.priority != null ? `Priority ${opts.priority}` : "Priority n/a";
  const unit = [opts.driverName, opts.vehicleLabel].filter(Boolean).join(" · ");
  const age = opts.patientAgeBand ? ` Age: ${opts.patientAgeBand}.` : "";
  const addr = opts.address ? ` From: ${opts.address.slice(0, 80)}.` : "";
  return (
    `ER INTAKE: ${opts.emergencyType || "Emergency"} (${prio}).` +
    ` Incoming unit: ${unit || "assigned ambulance"}.${age}${addr}` +
    ` Prepare bay. Automated alert — do not reply.`
  );
}
