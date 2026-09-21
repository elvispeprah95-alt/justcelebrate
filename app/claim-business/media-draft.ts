"use client";

export type PendingListingMedia = {
  logo: File | null;
  workImages: File[];
};

const DATABASE_NAME = "just-celebrate-listing-media";
const STORE_NAME = "drafts";
const VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not save your images."));
  });
}

export async function savePendingListingMedia(draftId: string, media: PendingListingMedia) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(media, draftId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Could not save your images."));
  });
  database.close();
}

export async function readPendingListingMedia(draftId: string): Promise<PendingListingMedia> {
  const database = await openDatabase();
  const media = await new Promise<PendingListingMedia | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(draftId);
    request.onsuccess = () => resolve(request.result as PendingListingMedia | undefined);
    request.onerror = () => reject(request.error || new Error("Could not read your images."));
  });
  database.close();
  return media || { logo: null, workImages: [] };
}

export async function deletePendingListingMedia(draftId: string) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(draftId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Could not remove saved images."));
  });
  database.close();
}
