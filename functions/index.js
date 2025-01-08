/**
 * Import niezbędnych modułów i konfiguracja Firebase
 */
const {onRequest} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const functions = require("firebase-functions");
const logger = functions.logger;
const sharp = require("sharp");
const admin = require("firebase-admin");
const cors = require("cors")({
  origin: [
    "http://localhost:3000",
    "https://sypniewskimarcin.github.io",
    "https://projekt-galeria-sypniewski-m.web.app",
    "https://projekt-galeria-sypniewski-m.firebaseapp.com",
  ],
  methods: ["POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});
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
  memory: "512MB",
  timeoutSeconds: 540,
});

// Funkcja do monitorowania zużycia pamięci
const logMemoryUsage = (label) => {
  const used = process.memoryUsage();
  logger.info(`Zużycie pamięci (${label}):`, {
    rss: `${Math.round(used.rss / 1024 / 1024)}MB`, // Resident Set Size
    heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)}MB`, // Całkowity rozmiar sterty
    heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)}MB`, // Używana część sterty
    external: `${Math.round(used.external / 1024 / 1024)}MB`, // Pamięć zewnętrzna (np. bufory)
    arrayBuffers: `${Math.round(used.arrayBuffers / 1024 / 1024)}MB`, // Bufory tablic
  });
};

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
exports.processWatermarkHttp = onRequest({
  enforceAppCheck: false,
  timeoutSeconds: 540,
  memory: "512MB",
  minInstances: 0,
  maxInstances: 100,
}, async (request, response) => {
  return cors(request, response, async () => {
    try {
      logMemoryUsage("Start przetwarzania");
      logger.info("1. Rozpoczęcie przetwarzania watermark - szczegóły requestu:", {
        headers: request.headers,
        body: request.body,
        method: request.method,
      });

      if (request.method !== "POST") {
        logger.warn("Nieprawidłowa metoda HTTP:", request.method);
        return response.status(405).json({
          error: "Method Not Allowed",
          details: "Only POST method is allowed",
        });
      }

      // Weryfikacja tokenu uwierzytelniającego
      const authHeader = request.headers.authorization;
      logger.info("2. Weryfikacja autoryzacji:", {
        hasAuthHeader: !!authHeader,
        startsWithBearer: authHeader?.startsWith("Bearer "),
      });

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return response.status(401).json({
          error: "Unauthorized",
          details: "Missing or invalid token",
        });
      }

      const idToken = authHeader.split("Bearer ")[1];
      let decodedToken;
      try {
        logger.info("3. Próba weryfikacji tokenu");
        decodedToken = await admin.auth().verifyIdToken(idToken);
        logger.info("4. Token zweryfikowany pomyślnie:", {
          uid: decodedToken.uid,
          email: decodedToken.email,
        });
      } catch (error) {
        logger.error("4. Błąd weryfikacji tokenu:", error);
        return response.status(401).json({
          error: "Unauthorized",
          details: "Invalid token",
          message: error.message,
        });
      }

      const {filePath, albumId, watermarkSettings, metadata} = request.body;
      logger.info("5. Dane wejściowe po walidacji:", {
        filePath,
        albumId,
        watermarkSettings,
        metadata,
        uid: decodedToken.uid,
      });

      if (!filePath || !albumId) {
        logger.error("6. Brak wymaganych parametrów:", {
          filePath,
          albumId,
          body: request.body,
        });
        return response.status(400).json({
          error: "Bad Request",
          details: "Missing required parameters",
          missing: {
            filePath: !filePath,
            albumId: !albumId,
          },
        });
      }

      const bucket = admin.storage().bucket();
      const maxRetries = 3;

      if (!filePath.includes("/photo-original/")) {
        logger.error("7. Nieprawidłowa ścieżka pliku:", filePath);
        return response.status(400).json({
          error: "Bad Request",
          details: "Invalid file path: File is not in photo-original folder",
          filePath,
        });
      }

      const pathParts = filePath.split("/");
      const fileName = pathParts[pathParts.length - 1];
      logger.info("8. Rozpoczynam przetwarzanie pliku:", {
        fileName,
        pathParts,
        fullPath: filePath,
      });

      const processWithRetry = async (retryCount = 0) => {
        try {
          logMemoryUsage(`Początek próby ${retryCount + 1}`);
          logger.info("9. Rozpoczęcie próby przetwarzania watermarku:", {
            fileName,
            albumId,
            retryCount,
            maxRetries,
            watermarkSettings,
          });

          // Sprawdź czy plik istnieje w Storage
          const [fileExists] = await bucket.file(filePath).exists();
          logger.info("10. Sprawdzenie istnienia pliku:", {
            exists: fileExists,
            filePath,
          });

          if (!fileExists) {
            throw new Error(`File not found in Storage: ${filePath}`);
          }

          // Aktualizacja statusu w Firestore
          await admin.firestore().collection("albums").doc(albumId).update({
            [`processingStatus.${fileName}`]: {
              status: "processing",
              attempt: retryCount + 1,
              startedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          });
          logger.info("11. Status w Firestore zaktualizowany pomyślnie");

          // Pobieranie danych albumu
          const albumDoc = await admin.firestore().collection("albums").doc(albumId).get();
          if (!albumDoc.exists) {
            const error = new Error(`Album ${albumId} nie istnieje`);
            logger.error("Błąd pobierania albumu:", {
              albumId,
              error: error.message,
            });
            throw error;
          }

          const albumData = albumDoc.data();
          logger.info("Szczegóły albumu:", {
            albumId,
            watermarkSettings: albumData.watermarkSettings,
            folders: albumData.folders,
            hasWatermarkImage: !!albumData.folders?.watermarkImage,
            folderPaths: {
              original: albumData.folders?.original,
              watermarked: albumData.folders?.watermarked,
              watermarkImage: albumData.folders?.watermarkImage,
            },
            fullData: JSON.stringify(albumData),
          });

          if (!albumData.folders?.watermarkImage) {
            logger.error("Brak ścieżki do folderu watermarkImage:", {
              albumId,
              folders: albumData.folders,
            });
            throw new Error("Watermark image folder path is missing");
          }

          if (!albumData.watermarkSettings?.enabled) {
            logger.info("Watermark nie jest włączony dla tego albumu:", {
              albumId,
              watermarkSettings: albumData.watermarkSettings,
            });
            return {
              success: true,
              message: "Watermark is not enabled for this album",
              status: "skipped",
              albumId,
            };
          }

          const tempFilePath = path.join(os.tmpdir(), fileName);
          logger.info("Rozpoczęcie pobierania pliku:", {
            filePath,
            tempFilePath,
            fileName,
          });

          try {
            await bucket.file(filePath).download({destination: tempFilePath});
            logger.info("Plik pobrany pomyślnie");

            // Sprawdź czy plik istnieje i czy można go otworzyć
            const stats = fs.statSync(tempFilePath);
            logger.info("Informacje o pobranym pliku:", {
              size: stats.size,
              path: tempFilePath,
              exists: fs.existsSync(tempFilePath),
            });

            let processedImage = sharp(tempFilePath);
            const metadata = await processedImage.metadata();
            logger.info("Metadane obrazu:", {
              width: metadata.width,
              height: metadata.height,
              format: metadata.format,
              size: metadata.size,
            });

            if (watermarkSettings.type === "text") {
              logger.info("Rozpoczęcie przetwarzania tekstowego znaku wodnego:", {
                text: watermarkSettings.text,
                fontSize: Math.floor(metadata.height * 0.8),
                opacity: watermarkSettings.opacity || 0.8,
                isHidden: watermarkSettings.isHidden,
              });

              const watermarkSvg = await generateTextWatermark(
                watermarkSettings.text || "Copyright",
                {
                  width: metadata.width,
                  height: metadata.height,
                  fontSize: Math.floor(metadata.height * 0.8),
                  opacity: watermarkSettings.opacity || 0.8,
                  color: watermarkSettings.fontColor || "rgba(255,255,255,0.8)",
                  isHidden: watermarkSettings.isHidden || false,
                },
              );

              processedImage = processedImage.composite([
                {
                  input: watermarkSvg,
                  gravity: "center",
                },
              ]);

              logger.info("Tekstowy znak wodny dodany pomyślnie");
            } else if (watermarkSettings.type === "image") {
              logger.info("Rozpoczęcie przetwarzania obrazkowego znaku wodnego");

              const [files] = await bucket.getFiles({
                prefix: `${albumData.folders.watermarkImage}/`,
              });
              logger.info("Znalezione pliki w folderze watermark:", {
                filesCount: files.length,
                filesNames: files.map((f) => f.name),
              });

              const watermarkFile = files.find((file) =>
                file.name.toLowerCase().endsWith(".png") &&
                !file.name.endsWith("/.keep"),
              );

              if (!watermarkFile) {
                const error = new Error("Watermark image not found in folder");
                logger.error("Brak pliku watermarku:", {
                  searchPath: albumData.folders.watermarkImage,
                  foundFiles: files.map((f) => f.name),
                });
                throw error;
              }

              logger.info("Znaleziono plik watermarku:", {
                fileName: watermarkFile.name,
                size: watermarkFile.size,
              });

              const watermarkTempPath = path.join(os.tmpdir(), "watermark.png");
              await watermarkFile.download({destination: watermarkTempPath});
              logger.info("Plik watermarku pobrany pomyślnie");

              // Dostosuj rozmiar i przezroczystość watermarku
              const watermarkBuffer = await sharp(watermarkTempPath)
                .resize(Math.floor(metadata.width * 0.8), null, {
                  fit: "inside",
                  withoutEnlargement: true,
                })
                .composite([{
                  input: Buffer.from([255, 255, 255, watermarkSettings.isHidden ? 13 : 204]),
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
            logger.info("Obraz przetworzony pomyślnie");

            const watermarkedPath = `${albumData.folders.watermarked}/${fileName}`;
            logger.info("Rozpoczęcie zapisywania przetworzonego obrazu:", {
              watermarkedPath,
              originalPath: filePath,
            });

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
            logger.info("Przetworzony obraz zapisany pomyślnie");

            logger.info("Generowanie URL-i dla obrazów");

            // Konstruujemy URL-e bezpośrednio
            const originalUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media`;
            const watermarkedUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(watermarkedPath)}?alt=media`;

            logger.info("URL-e wygenerowane pomyślnie");

            logger.info("Zapisywanie informacji o zdjęciu w Firestore");
            // Przygotuj obiekt watermarkSettings bez undefined
            const watermarkSettingsToSave = {
                type: watermarkSettings.type,
                visibility: watermarkSettings.isHidden ? "hidden" : "visible",
            };
            // Dodaj position tylko jeśli jest zdefiniowane
            if (watermarkSettings.position) {
                watermarkSettingsToSave.position = watermarkSettings.position;
            }
            await admin.firestore().collection("photos").add({
                originalUrl,
                watermarkedUrl,
                albumId,
                fileName,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                watermarkSettings: watermarkSettingsToSave,
            });
            logger.info("Informacje o zdjęciu zapisane pomyślnie w Firestore");

            logger.info("Przetwarzanie watermarku zakończone pomyślnie:", {
              fileName,
              albumId,
              watermarkType: watermarkSettings.type,
            });

            return {
              success: true,
              message: "Watermark processing completed",
              fileName,
              albumId,
              status: "completed",
              urls: {
                original: originalUrl,
                watermarked: watermarkedUrl,
              },
            };
          } catch (error) {
            logger.error("Błąd podczas przetwarzania:", {
              error: error.message,
              stack: error.stack,
              tempFilePath,
              filePath,
            });
            throw error;
          }
        } catch (error) {
          logger.error("Błąd w processWithRetry:", {
            retryCount,
            maxRetries,
            errorMessage: error.message,
            errorStack: error.stack,
            errorCode: error.code,
            fileName,
            albumId,
          });
          throw error;
        }
      };

      const result = await processWithRetry();
      logger.info("12. Zwracam wynik przetwarzania watermarku:", result);
      return response.json({
        success: true,
        data: result,
        message: "Watermark processing completed successfully",
      });
    } catch (error) {
      logger.error("13. Krytyczny błąd w processWatermarkHttp:", {
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code,
        errorDetails: error.details,
        requestBody: request.body,
      });
      return response.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Unknown error occurred",
        code: error.code || "unknown_error",
        details: error.details || undefined,
        path: request.body?.filePath,
      });
    } finally {
      logMemoryUsage("Koniec przetwarzania");
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
            watermarkSettings: {
              ...defaultWatermarkSettings,
              ...watermarkSettings,
            },
          });

      response.json({
        success: true,
        message: "Album structure created successfully",
        folders: {
          original: `${basePath}/photo-original`,
          watermarked: `${basePath}/photo-watermarked`,
          watermarkImage: `${basePath}/watermark-png`,
        },
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
      await exports.processWatermarkHttp(request, response);

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

/**
 * Funkcja do aktualizacji ścieżek folderów w istniejących albumach
 */
exports.updateAlbumFolders = onRequest((request, response) => {
  return cors(request, response, async () => {
    try {
      if (request.method !== "POST") {
        return response.status(405).send("Method Not Allowed");
      }

      const {albumId} = request.body;
      if (!albumId) {
        return response.status(400).send("Missing albumId");
      }

      const basePath = `albums/${albumId}`;
      const folders = {
        original: `${basePath}/photo-original`,
        watermarked: `${basePath}/photo-watermarked`,
        watermarkImage: `${basePath}/watermark-png`,
      };

      // Aktualizacja dokumentu albumu w Firestore
      await admin.firestore()
          .collection("albums")
          .doc(albumId)
          .update({
            folders,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

      response.json({
        success: true,
        message: "Album folders updated successfully",
        folders,
      });
    } catch (error) {
      logger.error("Error updating album folders:", error);
      response.status(500).send(error.message);
    }
  });
});
