const reservations = new Map();
const branchSchedules = {
  huancayo: { label: 'Huancayo', start: 9, end: 19, interval: 60, saturdayEnd: 14 },
  piura: { label: 'Piura', start: 9, end: 18, interval: 60, saturdayEnd: 14 },
  pucallpa: { label: 'Pucallpa', start: 9, end: 18, interval: 60, saturdayEnd: 13 }
};
function pad(n) { return String(n).padStart(2, '0'); }
function key(branch, date, time) { return `${branch}|${date}|${time}`; }
function parseDate(date) {
  const match = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}
function deterministicBlocked(branch, date, time) {
  const seed = [...`${branch}${date}${time}`].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  return seed % 11 === 0;
}
export function getSchedule(branch = 'huancayo', date) {
  const schedule = branchSchedules[branch] || branchSchedules.huancayo;
  const d = parseDate(date);
  if (!d) return { branch, date, slots: [], closed: true, reason: 'Fecha inválida' };
  const day = d.getDay();
  if (day === 0) return { branch, date, slots: [], closed: true, reason: 'Domingo sin atención' };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const requested = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (requested < today) return { branch, date, slots: [], closed: true, reason: 'La fecha ya pasó' };
  const horizon = new Date(today); horizon.setDate(horizon.getDate() + 45);
  if (requested > horizon) return { branch, date, slots: [], closed: true, reason: 'Agenda disponible hasta 45 días' };
  const end = day === 6 ? schedule.saturdayEnd : schedule.end;
  const slots = [];
  for (let hour = schedule.start; hour < end; hour++) {
    for (let minute = 0; minute < 60; minute += schedule.interval) {
      const time = `${pad(hour)}:${pad(minute)}`;
      const id = key(branch, date, time);
      const pastToday = requested.getTime() === today.getTime() && (hour < now.getHours() || (hour === now.getHours() && minute <= now.getMinutes()));
      const available = !pastToday && !reservations.has(id) && !deterministicBlocked(branch, date, time);
      slots.push({ time, available });
    }
  }
  return { branch, branchName: schedule.label, date, closed: false, slots };
}
export function reserveSlot({ branch = 'huancayo', date, time, name = '', contact = '', interest = '' }) {
  const schedule = getSchedule(branch, date);
  const slot = schedule.slots.find((x) => x.time === time);
  if (!slot) { const error = new Error('Ese horario no pertenece a la agenda de la sede.'); error.code='BAD_SLOT'; throw error; }
  if (!slot.available) { const error = new Error('Ese horario ya no está disponible. Elige otro.'); error.code='SLOT_TAKEN'; throw error; }
  const reservation = { id:`DL-${Date.now().toString(36).toUpperCase()}`, branch, branchName:branchSchedules[branch]?.label || branchSchedules.huancayo.label, date, time, name:String(name).trim().slice(0,80), contact:String(contact).trim().slice(0,120), interest:String(interest||'Orientación general').trim().slice(0,120), status:'pre-reserved', createdAt:new Date().toISOString() };
  reservations.set(key(branch,date,time), reservation); return reservation;
}
export function releaseReservation(id) { for (const [slotKey,reservation] of reservations.entries()) if (reservation.id===id) { reservations.delete(slotKey); return true; } return false; }
export function getSchedulingInfo() { return { branches:branchSchedules, reservationCount:reservations.size, persistence:'memory-prototype' }; }
