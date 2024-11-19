import { storage } from './firebaseConfig'; // Upewnij się, że importujesz poprawnie
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from './firebaseConfig'; // Importuj auth, aby uzyskać userId

// Funkcja do przesyłania plików
const uploadFile = (file) => {
    const userId = auth.currentUser.uid; // Pobierz userId z Firebase Authentication
    const storageRef = ref(storage, `images/${userId}/${file.name}`);

    uploadBytes(storageRef, file).then((snapshot) => {
        console.log('Uploaded a blob or file!', snapshot);
        // Po przesłaniu pliku, możesz od razu pobrać URL
        getFileUrl(file.name); // Wywołaj funkcję do pobierania URL
    }).catch((error) => {
        console.error('Error uploading file:', error);
    });
};

// Funkcja do pobierania URL pliku
const getFileUrl = (fileName) => {
    const userId = auth.currentUser.uid; // Pobierz userId
    const fileRef = ref(storage, `images/${userId}/${fileName}`);

    getDownloadURL(fileRef)
        .then((url) => {
            console.log('File available at', url);
            // Możesz użyć tego URL do wyświetlenia obrazu w aplikacji
            const img = document.createElement('img');
            img.src = url;
            document.body.appendChild(img); // Dodaj obraz do dokumentu
        })
        .catch((error) => {
            console.error('Error getting file URL:', error);
        });
};

// Przykład użycia
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        uploadFile(file);
    }
});