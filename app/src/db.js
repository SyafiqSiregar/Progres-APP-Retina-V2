import Dexie from 'dexie';

export const db = new Dexie('ProgresAppDB');

db.version(1).stores({
  projects: '++id, name, createdAt',
  reports: '++id, projectId, status, docNumber, updatedAt'
});
