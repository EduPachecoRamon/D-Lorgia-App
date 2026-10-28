import test from 'node:test';
import assert from 'node:assert/strict';
import { getSchedule, reserveSlot } from '../src/services/scheduling.js';
function futureWeekday(days = 3) { const d = new Date(); d.setDate(d.getDate()+days); while(d.getDay()===0)d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); }
test('agenda genera horarios para una sede y fecha futura',()=>{ const date=futureWeekday(); const result=getSchedule('huancayo',date); assert.equal(result.closed,false); assert.ok(result.slots.length>0); });
test('reservar un horario lo bloquea',()=>{ const date=futureWeekday(5); const schedule=getSchedule('piura',date); const slot=schedule.slots.find(x=>x.available); assert.ok(slot); reserveSlot({branch:'piura',date,time:slot.time,name:'Demo',contact:'999'}); const after=getSchedule('piura',date); assert.equal(after.slots.find(x=>x.time===slot.time).available,false); });
