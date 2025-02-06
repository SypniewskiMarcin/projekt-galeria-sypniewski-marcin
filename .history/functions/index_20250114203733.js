/**
 * Import niezbędnych modułów i konfiguracja Firebase
 */
const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const sharp = require("sharp");
const tf = require("@tensorflow/tfjs-node");
const cors = require("cors")({
  origin: [
    "http://localhost:3000",
    "https://sypniewskimarcin.github.io",
    "https://projekt-galeria-sypniewski-m.web.app",
    "https://projekt-galeria-sypniewski-m.firebaseapp.com"
  ],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

// Import node-fetch
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

// Cache dla modelu ESRGAN
let esrganModel = null;

// Funkcja do wczytania modelu ESRGAN
const loadEsrganModel = async () => {
  if (!esrganModel) {
    try {
      const modelPath = "https://tfhub.dev/captain-pool/esrgan-tf2/1";
      logger.info("Ładowanie modelu ESRGAN");
      esrganModel = await tf.loadGraphModel(modelPath, { fromTFHub: true });
      logger.info("Model ESRGAN załadowany pomyślnie");
    } catch (error) {
      logger.error("Błąd ładowania modelu ESRGAN:", error);
      throw error;
    }
  }
  return esrganModel;
};

/**
 * Funkcja do przetwarzania obrazu z wykorzystaniem AI
 * Wykonuje detekcję obiektów i optymalizację jakości
 */
exports.processImage = onRequest((request, response) => {
  return corsMiddleware(request, response, async () => {
    try {
      if (request.method !== "POST") {
        return response.status(405).send("Method Not Allowed");
      }

      const { imageUrl, albumId } = request.body;
      if (!imageUrl || !albumId) {
        return response.status(400).send("Missing required parameters");
      }

      logger.info("Rozpoczynam przetwarzanie obrazu:", imageUrl);

      // Pobierz obraz
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Konwertuj obraz do tensora dla TensorFlow
      const imageTensor = tf.node.decodeImage(imageBuffer);

      // Załaduj model COCO-SSD do detekcji obiektów
      const cocoModel = await cocoSsd.load();
      const predictions = await cocoModel.detect(imageTensor);

      // Przygotuj listę wykrytych obiektów
      const detectedObjects = predictions.map((pred) => ({
        class: pred.class,
        score: pred.score,
      }));

      // Wczytaj i zastosuj model ESRGAN
      logger.info("Rozpoczynam ulepszanie obrazu przez ESRGAN");
      const esrganModel = await loadEsrganModel();

      // Przygotuj tensor do ESRGAN
      let inputTensor = tf.node.decodeImage(imageBuffer);
      inputTensor = inputTensor.toFloat().div(tf.scalar(255));

      // Przetwórz przez ESRGAN
      const outputTensor = esrganModel.predict(inputTensor.expandDims(0));

      // Konwertuj wynik ESRGAN
      const enhancedImage = await tf.node.encodeJpeg(
        outputTensor.squeeze()
          .mul(tf.scalar(255))
          .clipByValue(0, 255)
          .cast("int32")
      );

      // Zwolnij pamięć tensorów
      tf.dispose([imageTensor, inputTensor, outputTensor]);

      // Przygotuj ścieżkę dla przetworzonego obrazu
      const originalPath = decodeURIComponent(imageUrl.split("/o/")[1].split("?")[0]);
      const fileName = path.basename(originalPath);
      const processedPath = `albums/${albumId}/photo-processed/${fileName}`;

      // Przetwórz obraz używając sharp do finalnych poprawek
      const processedBuffer = await sharp(enhancedImage)
        .jpeg({
          quality: 100,
          chromaSubsampling: "4:4:4",
          force: false,
        })
        .sharpen({
          sigma: 1.2,
          m1: 1.5,
          m2: 0.7,
          x1: 2.0,
          y2: 10.0,
          y3: 20.0,
        })
        .toBuffer();

      // Zapisz przetworzony obraz
      const bucket = admin.storage().bucket();
      await bucket.file(processedPath).save(processedBuffer, {
        metadata: {
          contentType: "image/jpeg",
          metadata: {
            processedAt: new Date().toISOString(),
            aiProcessed: true,
            detectedObjects: JSON.stringify(detectedObjects),
            esrganEnhanced: true,
          },
        },
      });

      // Generuj URL dla przetworzonego obrazu
      const [processedUrl] = await bucket.file(processedPath).getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });

      // Aktualizuj metadane w Firestore
      const imageDoc = await admin.firestore()
        .collection("albums")
        .doc(albumId)
        .collection("photos")
        .where("originalUrl", "==", imageUrl)
        .get();

      if (!imageDoc.empty) {
        const photoDoc = imageDoc.docs[0];
        await photoDoc.ref.update({
          aiProcessed: true,
          detectedObjects: detectedObjects,
          processedUrl: processedUrl,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          esrganEnhanced: true,
        });
      }

      logger.info("Zakończono przetwarzanie AI dla obrazu:", imageUrl);

      response.json({
        success: true,
        detectedObjects: detectedObjects,
        processedUrl: processedUrl,
      });

    } catch (error) {
      logger.error("Błąd podczas przetwarzania AI:", error);
      response.status(500).send(`Error processing image: ${error.message}`);
    }
  });
});
