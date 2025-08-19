import {initializeApp} from 'firebase/app'
import {getFirestore, collection, addDoc, doc, setDoc} from 'firebase/firestore'

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const database = getFirestore(app);

const subjectsCollection = collection(database, 'globalInvigorationSubjects');
const trialsCollection = collection(database, 'globalInvigorationTrials');
const gamesCollection = collection(database, 'globalInvigorationGames');

export const saveSubjectData = async (subjectData) => {
    try {
        // Use the provided participant ID (e.g., gb_1, gb_2) as the document ID
        const subjectId = subjectData.id;
        if (!subjectId) {
            throw new Error('Subject ID is required');
        }
        
        const documentReference = doc(subjectsCollection, subjectId);
        const savedDocument = await setDoc(documentReference, {
            ...subjectData,
            id: subjectId,
            timestamp: new Date().toISOString()
        });
        return savedDocument;
    } catch (error) {
        console.error("Error saving subject data: ", error);
        throw error;
    }
};

export const saveTrialData = async (trialData) => {
    try {
        const documentReference = await addDoc(trialsCollection, trialData);
        return documentReference;
    } catch (error) {
        console.error("Error saving trial data: ", error);
        throw error;
    }
};

export const saveClickData = async (clickData) => {
    try {
        const documentReference = await addDoc(collection(database, 'clicks'), clickData);
        return documentReference;
    } catch (error) {
        console.error("Error saving click data: ", error);
        throw error;
    } 
};

export const saveGameData = async (gameData) => {
    try {
        // Add timestamp and unique ID
        const gameDataWithId = {
            ...gameData,
            id: `game_${Date.now()}`,
            timestamp: new Date().toISOString(),
            gameDuration: gameData.endTime - gameData.startTime
        };
        
        const documentReference = await addDoc(gamesCollection, gameDataWithId);
        console.log('Game data saved with ID:', documentReference.id);
        return documentReference;
    } catch (error) {
        console.error("Error saving game data: ", error);
        throw error;
    }
};

export {database};

