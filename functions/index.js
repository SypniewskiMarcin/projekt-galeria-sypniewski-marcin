/**
 * Import niezbędnych modułów i konfiguracja Firebase
 */
const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const functions = require("firebase-functions");
const logger = functions.logger;
const sharp = require("sharp");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const nodeFetch = require("node-fetch");
const path = require("path");
const os = require("os");
const fs = require("fs");
const tf = require("@tensorflow/tfjs-node");
const cocoSsd = require("@tensorflow-models/coco-ssd");

// Inicjalizacja aplikacji Firebase Admin
admin.initializeApp();

// Konfiguracja globalna dla funkcji v2
setGlobalOptions({
  region: "europe-central2",
  memory: "2GB",
  timeoutSeconds: 540,
});

/**
 * Generuje tekstowy znak wodny
 * @param {string} text - Tekst znaku wodnego
 * @param {Object} options - Opcje znaku wodnego
 * @return {Promise<Buffer>} Bufor z tekstowym znakiem wodnym
 */
async function generateTextWatermark(text, options) {
  const {
    width,
    height,
    fontSize = Math.floor(height * 0.05), // 5% wysokości zdjęcia
    opacity = 0.3,
    color = "rgba(255,255,255,0.5)",
    isHidden = false,
  } = options;

  // Jeśli znak wodny ma być ukryty, używamy bardzo małej nieprzezroczystości
  const finalOpacity = isHidden ? 0.05 : opacity;

  const svg = `
    <svg width="${width}" height="${height}">
      <style>
        .text {
          fill: ${color};
          font-size: ${fontSize}px;
          font-family: Arial, sans-serif;
          transform: rotate(-45deg);
          transform-origin: center;
        }
      </style>
      <text
        x="50%"
        y="50%"
        text-anchor="middle"
        alignment-baseline="middle"
        class="text"
        opacity="${finalOpacity}"
      >
        ${text}
      </text>
    </svg>
  `;

  return Buffer.from(svg);
}

/**
 * Funkcja do przetwarzania watermarku
 */
exports.processWatermark = onRequest((request, response) => {
  return cors(request, response, async () => {
    try {
      if (request.method !== "POST") {
        return response.status(405).send("Method Not Allowed");
      }

      const {filePath} = request.body;
      if (!filePath) {
        return response.status(400).send("No file path provided");
      }

      const bucket = admin.storage().bucket();
      const maxRetries = 3;

      if (!filePath.includes("/photo-original/")) {
        return response.status(400).send("File is not in photo-original folder");
      }

      const pathParts = filePath.split("/");
      const albumId = pathParts[1];
      const fileName = pathParts[pathParts.length - 1];

      const processWithRetry = async (retryCount = 0) => {
        try {
          const logMessage = `Rozpoczynam przetwarzanie watermarku dla zdjęcia: ${fileName} ` +
            `w albumie: ${albumId} (próba ${retryCount + 1}/${maxRetries})`;
          logger.info(logMessage);

          await admin.firestore().collection("albums").doc(albumId).update({
            [`processingStatus.${fileName}`]: {
              status: "processing",
              attempt: retryCount + 1,
              startedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          });

          const albumDoc = await admin.firestore().collection("albums").doc(albumId).get();
          if (!albumDoc.exists) {
            throw new Error(`Album ${albumId} nie istnieje`);
          }

          const {watermarkSettings, folders} = albumDoc.data();
          if (!watermarkSettings?.enabled) {
            logger.info("Watermark nie jest włączony dla tego albumu");
            return;
          }

          const tempFilePath = path.join(os.tmpdir(), fileName);
          await bucket.file(filePath).download({destination: tempFilePath});

          let processedImage = sharp(tempFilePath);
          const metadata = await processedImage.metadata();

          if (watermarkSettings.type === "text") {
            const watermarkSvg = await generateTextWatermark(
              watermarkSettings.text || "Copyright",
              {
                width: metadata.width,
                height: metadata.height,
                fontSize: Math.floor(metadata.height * 0.05),
                opacity: watermarkSettings.opacity || 0.3,
                color: watermarkSettings.fontColor || "rgba(255,255,255,0.5)",
                isHidden: watermarkSettings.isHidden || false,
              },
            );

            processedImage = processedImage.composite([
              {
                input: watermarkSvg,
                gravity: "center",
              },
            ]);
          } else if (watermarkSettings.type === "image") {
            // Pobierz listę plików z folderu watermark-png
            const [files] = await bucket.getFiles({
              prefix: `${folders.watermarkImage}/`,
            });

            // Znajdź pierwszy plik PNG (pomijając .keep)
            const watermarkFile = files.find((file) =>
              file.name.toLowerCase().endsWith(".png") &&
              !file.name.endsWith("/.keep"),
            );

            if (!watermarkFile) {
              logger.error("Brak pliku watermarku w folderze");
              throw new Error("Watermark image not found in folder");
            }

            const watermarkTempPath = path.join(os.tmpdir(), "watermark.png");
            await watermarkFile.download({destination: watermarkTempPath});

            // Dostosuj rozmiar i przezroczystość watermarku
            const watermarkBuffer = await sharp(watermarkTempPath)
              .resize(Math.floor(metadata.width * 0.15), null, {
                fit: "inside",
                withoutEnlargement: true,
              })
              .composite([{
                input: Buffer.from([255, 255, 255, watermarkSettings.isHidden ? 13 : 77]),
                raw: {
                  width: 1,
                  height: 1,
                  channels: 4,
                },
                tile: true,
                blend: "dest-in",
              }])
              .toBuffer();

            processedImage = processedImage.composite([
              {
                input: watermarkBuffer,
                gravity: "center",
              },
            ]);

            fs.unlinkSync(watermarkTempPath);
          }

          const processedBuffer = await processedImage.jpeg({quality: 100}).toBuffer();
          const watermarkedPath = `${folders.watermarked}/${fileName}`;

          await bucket.file(watermarkedPath).save(processedBuffer, {
            metadata: {
              contentType: "image/jpeg",
              metadata: {
                watermarked: "true",
                watermarkType: watermarkSettings.type,
                watermarkVisibility: watermarkSettings.isHidden ? "hidden" : "visible",
                watermarkPosition: "center",
                processedAt: Date.now(),
              },
            },
          });

          const [originalUrl] = await bucket.file(filePath).getSignedUrl({
            action: "read",
            expires: "03-01-2500",
          });

          const [watermarkedUrl] = await bucket.file(watermarkedPath).getSignedUrl({
            action: "read",
            expires: "03-01-2500",
          });

          await admin.firestore().collection("photos").add({
            originalUrl,
            watermarkedUrl,
            albumId,
            fileName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            watermarkSettings: {
              type: watermarkSettings.type,
              visibility: watermarkSettings.isHidden ? "hidden" : "visible",
              position: watermarkSettings.position,
            },
          });

          logger.info(`Pomyślnie przetworzono watermark dla ${fileName}`);

          await admin.firestore().collection("albums").doc(albumId).update({
            [`processingStatus.${fileName}`]: {
              status: "completed",
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          });

          fs.unlinkSync(tempFilePath);
        } catch (error) {
          logger.error(`Błąd podczas przetwarzania watermarku (próba ${retryCount + 1}/${maxRetries}):`, error);

          await admin.firestore().collection("albums").doc(albumId).update({
            [`processingStatus.${fileName}`]: {
              status: "error",
              error: error.message,
              attempt: retryCount + 1,
              failedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          });

          if (retryCount < maxRetries - 1) {
            logger.info(`Ponawiam próbę za 5 sekund... (${retryCount + 2}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, 5000));
            return processWithRetry(retryCount + 1);
          } else {
            throw error;
          }
        }
      };

      await processWithRetry();
      response.json({success: true, message: "Watermark processing completed"});
    } catch (error) {
      logger.error("Error in watermark processing:", error);
      response.status(500).send(error.message);
    }
  });
});

/**
 * Funkcja do tworzenia struktury albumów
 */
exports.createAlbumStructure = onRequest((request, response) => {
  return cors(request, response, async () => {
    try {
      if (request.method !== "POST") {
        return response.status(405).send("Method Not Allowed");
      }

      const {albumId, watermarkSettings} = request.body;

      if (!albumId) {
        return response.status(400).send("Missing albumId");
      }

      const bucket = admin.storage().bucket();
      const basePath = `albums/${albumId}`;

      // Zawsze tworzymy wszystkie podfoldery dla spójności
      const folders = [
        `${basePath}/photo-original`,
        `${basePath}/photo-watermarked`,
        `${basePath}/watermark-png`,
      ];

      // Tworzenie folderów w Storage
      await Promise.all(folders.map(async (folder) => {
        try {
          await bucket.file(`${folder}/.keep`).save("");
          logger.info(`Created folder: ${folder}`);
        } catch (error) {
          logger.error(`Error creating folder ${folder}:`, error);
          throw error;
        }
      }));

      // Przygotuj domyślne ustawienia watermarku
      const defaultWatermarkSettings = {
        enabled: false,
        type: "text",
        text: "",
        visibility: "visible",
        isHidden: false,
        opacity: 0.3,
        position: "center",
        fontColor: "rgba(255,255,255,0.5)",
      };

      // Aktualizacja dokumentu albumu w Firestore
      await admin.firestore()
          .collection("albums")
          .doc(albumId)
          .update({
            folders: {
              original: `${basePath}/photo-original`,
              watermarked: `${basePath}/photo-watermarked`,
              watermarkImage: `${basePath}/watermark-png`,
            },
            watermarkSettings: watermarkSettings || defaultWatermarkSettings,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

      response.json({
        success: true,
        folders,
        watermarkSettings: watermarkSettings || defaultWatermarkSettings,
      });
    } catch (error) {
      logger.error("Error creating album structure:", error);
      response.status(500).send(`Error creating album structure: ${error.message}`);
    }
  });
});

/**
 * Funkcja do ponownego przetwarzania watermarku
 */
exports.retryWatermarkProcessing = onRequest((request, response) => {
  return cors(request, response, async () => {
    try {
      if (request.method !== "POST") {
        return response.status(405).send("Method Not Allowed");
      }

      const {albumId, fileName} = request.body;
      if (!albumId || !fileName) {
        return response.status(400).send("Missing required parameters");
      }

      // Sprawdzenie czy plik istnieje
      const filePath = `albums/${albumId}/photo-original/${fileName}`;
      const [exists] = await admin.storage().bucket().file(filePath).exists();

      if (!exists) {
        return response.status(404).send("Original file not found");
      }

      // Resetowanie statusu przetwarzania
      await admin.firestore().collection("albums").doc(albumId).update({
        [`processingStatus.${fileName}`]: {
          status: "pending",
          queuedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      // Emulacja eventu Storage
      await exports.processWatermark(request, response);

      response.json({success: true, message: "Watermark processing queued"});
    } catch (error) {
      logger.error("Error in retryWatermarkProcessing:", error);
      response.status(500).send(error.message);
    }
  });
});

/**
 * Funkcja do przetwarzania obrazu z wykorzystaniem AI
 * Wykonuje detekcję obiektów i optymalizację jakości
 */
exports.processImage = onRequest((request, response) => {
  return cors(request, response, async () => {
    try {
      if (request.method !== "POST") {
        return response.status(405).send("Method Not Allowed");
      }

      const {imageUrl, albumId} = request.body;
      if (!imageUrl || !albumId) {
        return response.status(400).send("Missing required parameters");
      }

      logger.info("Rozpoczynam przetwarzanie obrazu:", imageUrl);

      // Pobierz obraz
      const imageResponse = await nodeFetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Konwertuj obraz do tensora dla TensorFlow
      const imageTensor = tf.node.decodeImage(imageBuffer);

      // Załaduj model COCO-SSD do detekcji obiektów
      const model = await cocoSsd.load();
      const predictions = await model.detect(imageTensor);

      // Przygotuj listę wykrytych obiektów
      const detectedObjects = predictions.map((pred) => ({
        class: pred.class,
        score: pred.score,
      }));

      // Przygotuj ścieżkę dla przetworzonego obrazu
      const originalPath = decodeURIComponent(imageUrl.split("/o/")[1].split("?")[0]);
      const fileName = path.basename(originalPath);
      const processedPath = `albums/${albumId}/photo-processed/${fileName}`;

      // Przetwórz obraz używając sharp do poprawy jakości
      const processedBuffer = await sharp(imageBuffer)
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
        });
      }

      // Zwolnij pamięć tensora
      tf.dispose(imageTensor);

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
