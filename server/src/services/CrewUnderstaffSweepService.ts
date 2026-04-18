import mongoose from 'mongoose';
import { Crew } from '../models/Crew';
import { getCrewRosterCount, MIN_CREW_ROSTER } from './CrewRosterUnderstaff';
import { disbandCrewById } from './CrewDisbandService';
import { sendSystemNotificationDm } from './CrewSystemNotificationService';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let sweepInterval: ReturnType<typeof setInterval> | null = null;

export async function runCrewUnderstaffSweepOnce(): Promise<void> {
  const cursor = Crew.find({}).lean().cursor();
  for await (const raw of cursor) {
    const crew = raw as unknown as {
      _id: mongoose.Types.ObjectId;
      presidentId: mongoose.Types.ObjectId;
      crewName?: string;
      executives?: mongoose.Types.ObjectId[];
      members?: mongoose.Types.ObjectId[];
      understaffNotifiedAt?: Date | null;
      understaffLastReminderAt?: Date | null;
    };

    const id = crew._id;
    const count = getCrewRosterCount(crew);

    if (count >= MIN_CREW_ROSTER) {
      if (crew.understaffNotifiedAt != null || crew.understaffLastReminderAt != null) {
        await Crew.updateOne({ _id: id }, { $set: { understaffNotifiedAt: null, understaffLastReminderAt: null } });
      }
      continue;
    }

    let start: Date;
    if (crew.understaffNotifiedAt) {
      start = new Date(crew.understaffNotifiedAt);
    } else {
      // Bugbot: do not use createdAt — understaffed crews predating this field would else get a deadline in the past and disband on first sweep.
      start = new Date();
      await Crew.updateOne({ _id: id }, { $set: { understaffNotifiedAt: start } });
    }

    const deadlineMs = start.getTime() + SEVEN_DAYS_MS;
    if (Date.now() >= deadlineMs) {
      try {
        await disbandCrewById(id);
      } catch (e) {
        console.error('[CrewUnderstaffSweep] disband failed', String(id), e);
      }
      continue;
    }

    if (Date.now() - start.getTime() < ONE_DAY_MS) {
      continue;
    }

    // Bugbot: dedupe — sweep interval can be <24h (CREW_UNDERSTAFF_SWEEP_INTERVAL_MS); only one reminder per 24h.
    const lastReminder = crew.understaffLastReminderAt ? new Date(crew.understaffLastReminderAt).getTime() : null;
    if (lastReminder != null && Date.now() - lastReminder < ONE_DAY_MS) {
      continue;
    }

    const presidentId = String(crew.presidentId);
    const crewName = crew.crewName ?? 'Your crew';
    const deadlineIso = new Date(deadlineMs).toISOString();
    const msg = `Reminder: "${crewName}" has fewer than ${MIN_CREW_ROSTER} members. Recruit more or this crew will disband after ${deadlineIso} (UTC).`;
    try {
      await sendSystemNotificationDm(presidentId, msg);
      await Crew.updateOne({ _id: id }, { $set: { understaffLastReminderAt: new Date() } });
    } catch (e) {
      console.error('[CrewUnderstaffSweep] reminder DM failed', String(id), e);
    }
  }
}

export function startCrewUnderstaffSweepWatchdog(): void {
  if (sweepInterval) {
    return;
  }
  const ms = Number(process.env.CREW_UNDERSTAFF_SWEEP_INTERVAL_MS);
  const every = Number.isFinite(ms) && ms >= 60_000 ? ms : 24 * 60 * 60 * 1000;

  void runCrewUnderstaffSweepOnce().catch((err) => console.error('[CrewUnderstaffSweep] initial run failed', err));

  sweepInterval = setInterval(() => {
    void runCrewUnderstaffSweepOnce().catch((err) => console.error('[CrewUnderstaffSweep] tick failed', err));
  }, every);
}
