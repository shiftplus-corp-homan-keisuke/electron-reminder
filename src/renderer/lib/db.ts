import Dexie, { type Table } from 'dexie';
import type { Reminder } from '../types/reminder';

interface SettingsRecord {
  key: string;
  value: unknown;
}

class ElectronReminderDB extends Dexie {
  reminders!: Table<Reminder, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super('ElectronReminderDB');
    this.version(1).stores({
      reminders: 'id, nextFireTime, enabled, recurrenceType',
      settings: 'key',
    });
  }
}

export const db = new ElectronReminderDB();
