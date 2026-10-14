import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

import { firebaseConfig, isFirebaseConfigured } from "@/lib/firebase/config";

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
}

let services: FirebaseServices | null = null;

// Só chame no navegador (efeitos e handlers). Cria os serviços uma única vez.
export function getFirebase(): FirebaseServices {
  if (services) return services;
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não está configurado. Veja o README.");
  }

  const alreadyInitialized = getApps().length > 0;
  const app = alreadyInitialized ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);

  // `ignoreUndefinedProperties`: campos opcionais ausentes (undefined) são simplesmente omitidos.
  // O cache local (IndexedDB) deixa o app mais rápido e usável com internet instável.
  const db = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  // Usado apenas nos testes locais com os emuladores do Firebase.
  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST;
  if (emulatorHost && !alreadyInitialized) {
    connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, emulatorHost, 8080);
  }

  const storage = getStorage(app);
  if (emulatorHost && !alreadyInitialized) connectStorageEmulator(storage, emulatorHost, 9199);

  services = { app, auth, db, storage };
  return services;
}
