/**
 * Import niezbędnych modułów i konfiguracja Firebase
 */
const {onRequest} = require("firebase-functions/v2/https");
const {onObjectFinalized} = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");
const sharp = require("sharp");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const nodeFetch = require("node-fetch");
const path = require("path");
const os = require("os");
const fs = require("fs");
const tf = require("@tensorflow/tfjs-node");
const cocoSsd = require("@tensorflow-models/coco-ssd");
const cv = require("@u4/opencv4nodejs");

// Inicjalizacja aplikacji Firebase Admin
admin.initializeApp();

/**
 * Funkcja Cloud Function do poprawy jakości obrazu
 * Obsługuje żądania POST z URL obrazu i opcjonalnym współczynnikiem skalowania
 * Używa biblioteki sharp do przetwarzania obrazu
 */
exports.enhanceImage = onRequest(async (request, response) => {
  return cors(request, response, async () => {
    try {
      if (request.method !== "POST") {
        return response.status(405).send("Method Not Allowed");
      }

      const {imageUrl, scaleFactor = 4} = request.body;
      if (!imageUrl) {
        return response.status(400).send("No image URL provided");
      }

      logger.info("Processing image:", imageUrl);

      try {
        const imageResponse = await nodeFetch(imageUrl);
        if (!imageResponse.ok) {
          const errorMsg = "Failed to fetch image: " +
              imageResponse.statusText;
          throw new Error(errorMsg);
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        logger.info("Image fetched successfully, size:", imageBuffer.length);

        const enhancedImage = await sharp(imageBuffer)
            .resize({
              width: null,
              height: null,
              factor: scaleFactor,
              kernel: sharp.kernel.lanczos3,
            })
            .sharpen({
              sigma: 1.5,
              m1: 1.5,
              m2: 0.7,
              x1: 2.0,
              y2: 10.0,
              y3: 20.0,
            })
            .png({
              quality: 100,
              compression: 9,
            })
            .toBuffer();

        logger.info(
            "Image processing completed, enhanced size:",
            enhancedImage.length,
        );

        response.set("Content-Type", "image/png");
        response.set("Access-Control-Allow-Origin", "*");
        response.send(enhancedImage);
      } catch (fetchError) {
        logger.error("Error processing image:", fetchError);
        response.status(500).send(`Error processing image: ${fetchError.message}`);
      }
    } catch (error) {
      logger.error("Error in request handling:", error);
      response.status(500).send(`Error in request handling: ${error.message}`);
    }
  });
});

/**
 * Funkcja pomocnicza do generowania tekstowego znaku wodnego
 * Tworzy przezroczysty obraz z powtarzającym się tekstem pod kątem 45 stopni
 * @param {string} text - Tekst znaku wodnego
 * @param {number} width - Szerokość obrazu
 * @param {number} height - Wysokość obrazu
 * @param {Object} options - Opcje konfiguracyjne
 * @param {number} options.fontSize - Rozmiar czcionki (domyślnie 30)
 * @param {number} options.opacity - Przezroczystość (0-1, domyślnie 0.3)
 * @param {string} options.fontColor - Kolor tekstu w formacie "R,G,B" (domyślnie "255,255,255")
 * @param {number} options.angle - Kąt obrotu tekstu w stopniach (domyślnie -45)
 * @param {number} options.fontStyle - Styl czcionki (cv.FONT_*)
 * @return {cv.Mat} Obraz z tekstowym znakiem wodnym
 */
const generateTextWatermark = (text, width, height, options = {}) => {
  const {
    fontSize = 30,
    opacity = 0.3,
    fontColor = "255,255,255",
    angle = -45,
    fontStyle = cv.FONT_HERSHEY_SIMPLEX,
  } = options;

  // Utworzenie przezroczystego obrazu
  const img = new cv.Mat(height, width, cv.CV_8UC4, [0, 0, 0, 0]);

  // Parsowanie koloru
  const [r, g, b] = fontColor.split(",").map(Number);
  const alpha = Math.round(opacity * 255);
  const color = new cv.Vec4(r, g, b, alpha);

  const fontScale = fontSize / 30;
  const thickness = Math.max(1, Math.floor(fontScale * 2));

  // Obliczenie rozmiaru tekstu dla odpowiedniego rozmieszczenia
  const textSize = cv.getTextSize(text, fontStyle, fontScale, thickness);
  const textWidth = textSize.width;
  const textHeight = textSize.height;

  // Obliczenie optymalnego odstępu między tekstami
  const spacing = Math.max(textWidth, textHeight) * 2;

  // Narysowanie tekstu w siatce z odpowiednim odstępem
  for (let y = -height; y < height*2; y += spacing) {
    for (let x = -width; x < width*2; x += spacing) {
      const point = new cv.Point2(x, y);
      img.putText(text, point, fontStyle, fontScale, color, thickness, cv.LINE_AA);
    }
  }

  // Obrót całego obrazu
  const center = new cv.Point2(width/2, height/2);
  const M = cv.getRotationMatrix2D(center, angle, 1.0);
  const rotated = img.warpAffine(M, new cv.Size(width, height));

  // Dodanie efektu rozmycia dla lepszego wyglądu
  const blurred = rotated.gaussianBlur(new cv.Size(3, 3), 0.5);

  return blurred;
};

/**
 * Funkcja do dodawania niewidocznego znaku wodnego
 * Wykorzystuje transformatę DCT do ukrycia danych w obrazie
 * @param {cv.Mat} img - Obraz wejściowy
 * @param {string} watermarkData - Dane do ukrycia w obrazie
 * @return {cv.Mat} Obraz z ukrytym znakiem wodnym
 */
const addInvisibleWatermark = (img, watermarkData) => {
  // Konwersja do skali szarości i formatu float32 dla DCT
  const gray = img.cvtColor(cv.COLOR_BGR2GRAY);
  const float32 = gray.convertTo(cv.CV_32F);

  // Transformata DCT
  const dct = float32.dct();

  // Zakodowanie watermarku w średnich częstotliwościach
  const middleFreq = Math.floor(dct.rows / 4);
  const watermarkBits = Buffer.from(watermarkData).toString("binary")
      .split("")
      .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");

  // Osadzenie bitów watermarku
  for (let i = 0; i < watermarkBits.length; i++) {
    const row = middleFreq + Math.floor(i / dct.cols);
    const col = middleFreq + (i % dct.cols);

    if (row < dct.rows - middleFreq && col < dct.cols - middleFreq) {
      const bit = parseInt(watermarkBits[i]);
      const value = dct.at(row, col);
      dct.set(row, col, value + (bit ? 0.1 : -0.1));
    }
  }

  // Odwrotna transformata DCT i konwersja do formatu 8-bitowego
  return dct.idct().convertTo(cv.CV_8U);
};

/**
 * Główna funkcja do przetwarzania znaków wodnych
 * Uruchamiana automatycznie po załadowaniu nowego pliku do Storage
 */
exports.processWatermark = onObjectFinalized(async (event) => {
  const filePath = event.data.name;
  const bucket = admin.storage().bucket();
  const maxRetries = 3;

  // Sprawdzenie czy plik jest w odpowiednim folderze
  if (!filePath.includes("/photo-original/")) {
    logger.info("Plik nie jest w folderze photo-original, pomijam:", filePath);
    return;
  }

  // Wyciągnięcie ID albumu z ścieżki
  const pathParts = filePath.split("/");
  const albumId = pathParts[1];
  const fileName = pathParts[pathParts.length - 1];

  const processWithRetry = async (retryCount = 0) => {
    try {
      logger.info(
          "Rozpoczynam przetwarzanie watermarku dla zdjęcia: " +
          `${fileName} w albumie: ${albumId} ` +
          `(próba ${retryCount + 1}/${maxRetries})`,
      );

      // Aktualizacja statusu w Firestore
      await admin.firestore().collection("albums").doc(albumId).update({
        [`processingStatus.${fileName}`]: {
          status: "processing",
          attempt: retryCount + 1,
          startedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      // Pobranie ustawień albumu z Firestore
      const albumDoc = await admin.firestore()
          .collection("albums")
          .doc(albumId)
          .get();

      if (!albumDoc.exists) {
        throw new Error(`Album ${albumId} nie istnieje`);
      }

      const {watermarkSettings, folders} = albumDoc.data();
      if (!watermarkSettings?.enabled) {
        logger.info("Watermark nie jest włączony dla tego albumu");
        return;
      }

      // Pobranie oryginalnego zdjęcia
      const tempFilePath = path.join(os.tmpdir(), fileName);
      await bucket.file(filePath).download({destination: tempFilePath});

      // Wczytanie obrazu do OpenCV
      const img = await cv.imread(tempFilePath);
      let processedImg;

      // Przetwarzanie w zależności od typu i widoczności watermarku
      if (watermarkSettings.visibility === "visible") {
        if (watermarkSettings.type === "text") {
          // Dodanie tekstowego znaku wodnego
          const watermarkOptions = {
            fontSize: watermarkSettings.fontSize || 30,
            opacity: watermarkSettings.opacity || 0.3,
            fontColor: watermarkSettings.fontColor || "255,255,255",
            angle: watermarkSettings.angle || -45,
            fontStyle: watermarkSettings.fontStyle ?
              cv[watermarkSettings.fontStyle] :
              cv.FONT_HERSHEY_SIMPLEX,
          };

          const watermark = generateTextWatermark(
              watermarkSettings.text || "Copyright",
              img.cols,
              img.rows,
              watermarkOptions,
          );
          processedImg = img.addWeighted(watermark, 1.0, img, 1.0, 0);
        } else if (watermarkSettings.type === "image") {
          // Ścieżka do pliku watermarku
          const watermarkPath = `${folders.watermarkImage}/${fileName}`;
          const watermarkExists = await bucket.file(watermarkPath).exists();

          if (!watermarkExists[0]) {
            logger.error("Brak pliku watermarku");
            throw new Error("Watermark image not found");
          }

          const watermarkTempPath = path.join(os.tmpdir(), "watermark_" + fileName);
          await bucket.file(watermarkPath).download({destination: watermarkTempPath});

          const watermarkImg = await cv.imread(watermarkTempPath);
          const resized = watermarkImg.resize(
              Math.floor(img.rows / 4),
              Math.floor(img.cols / 4)
          );

          // Pozycjonowanie watermarku według ustawień
          processedImg = img.copy();
          if (watermarkSettings.position === "center") {
            const x = Math.floor((img.cols - resized.cols) / 2);
            const y = Math.floor((img.rows - resized.rows) / 2);
            const roi = processedImg.getRegion(
                new cv.Rect(x, y, resized.cols, resized.rows)
            );
            resized.copyTo(roi);
          } else if (watermarkSettings.position === "corners") {
            const positions = [
              {x: 20, y: 20},
              {x: img.cols - resized.cols - 20, y: 20},
              {x: 20, y: img.rows - resized.rows - 20},
              {x: img.cols - resized.cols - 20, y: img.rows - resized.rows - 20},
            ];

            positions.forEach((pos) => {
              const roi = processedImg.getRegion(
                  new cv.Rect(pos.x, pos.y, resized.cols, resized.rows)
              );
              resized.copyTo(roi);
            });
          } else { // tiled
            for (let y = 0; y < img.rows; y += resized.rows * 2) {
              for (let x = 0; x < img.cols; x += resized.cols * 2) {
                const roi = processedImg.getRegion(
                    new cv.Rect(x, y, resized.cols, resized.rows)
                );
                resized.copyTo(roi);
              }
            }
          }

          fs.unlinkSync(watermarkTempPath);
        }
      } else if (watermarkSettings.visibility === "invisible") {
        // Dodanie niewidocznego znaku wodnego za pomocą DCT
        const watermarkData = `${albumId}_${Date.now()}_${fileName}`;
        processedImg = addInvisibleWatermark(img, watermarkData);
      }

      // Zapisanie przetworzonego obrazu
      const processedPath = path.join(os.tmpdir(), "processed_" + fileName);
      await cv.imwrite(processedPath, processedImg);

      // Upload przetworzonego obrazu do Storage
      const watermarkedPath = `${folders.watermarked}/${fileName}`;
      await bucket.upload(processedPath, {
        destination: watermarkedPath,
        metadata: {
          contentType: event.data.contentType,
          metadata: {
            watermarked: "true",
            watermarkType: watermarkSettings.type,
            watermarkVisibility: watermarkSettings.visibility,
            processedAt: Date.now(),
          },
        },
      });

      // Generowanie URL-i
      const [originalUrl] = await bucket.file(filePath).getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });

      const [watermarkedUrl] = await bucket.file(watermarkedPath).getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });

      // Aktualizacja informacji w Firestore
      await admin.firestore().collection("photos").add({
        originalUrl,
        watermarkedUrl,
        albumId,
        fileName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        watermarkSettings: {
          type: watermarkSettings.type,
          visibility: watermarkSettings.visibility,
          position: watermarkSettings.position,
        },
      });

      logger.info(`Pomyślnie przetworzono watermark dla ${fileName}`);

      // Aktualizacja statusu na sukces
      await admin.firestore().collection("albums").doc(albumId).update({
        [`processingStatus.${fileName}`]: {
          status: "completed",
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    } catch (error) {
      logger.error(`Błąd podczas przetwarzania watermarku (próba ${retryCount + 1}/${maxRetries}):`, error);

      // Aktualizacja statusu błędu
      await admin.firestore().collection("albums").doc(albumId).update({
        [`processingStatus.${fileName}`]: {
          status: "error",
          error: error.message,
          attempt: retryCount + 1,
          failedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });

      // Zapisanie informacji o błędzie
      await admin.firestore().collection("errors").add({
        type: "watermark_processing",
        albumId,
        fileName,
        error: error.message,
        attempt: retryCount + 1,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Ponów próbę jeśli nie przekroczono limitu
      if (retryCount < maxRetries - 1) {
        logger.info(`Ponawiam próbę za 5 sekund... (${retryCount + 2}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return processWithRetry(retryCount + 1);
      }
    }
  };

  await processWithRetry();
});

/**
 * Funkcja do przetwarzania obrazu z wykorzystaniem AI
 * Wykonuje detekcję obiektów i optymalizację jakości
 */
exports.processImage = onRequest(async (request, response) => {
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

      const imageResponse = await nodeFetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(
            `Failed to fetch image: ${imageResponse.statusText}`,
        );
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      const imageTensor = tf.node.decodeImage(imageBuffer);
      const model = await cocoSsd.load();
      const predictions = await model.detect(imageTensor);

      const detectedObjects = predictions.map((pred) => ({
        class: pred.class,
        score: pred.score,
      }));

      const originalPath = decodeURIComponent(
          imageUrl.split("/o/")[1].split("?")[0],
      );
      const fileName = path.basename(originalPath);
      const processedPath = `albums/${albumId}/photo-processed/${fileName}`;

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

      const [processedUrl] = await bucket.file(processedPath).getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });

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
 * Funkcja do tworzenia struktury folderów albumu
 */
exports.createAlbumStructure = onRequest(async (request, response) => {
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
            watermarkSettings: watermarkSettings || {
              enabled: false,
              type: "none",
              visibility: "none",
            },
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

      response.json({success: true, folders});
    } catch (error) {
      logger.error("Error creating album structure:", error);
      response.status(500).send(`Error creating album structure: ${error.message}`);
    }
  });
});

// Dodanie nowej funkcji do ręcznego ponowienia przetwarzania
exports.retryWatermarkProcessing = onRequest(async (request, response) => {
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
      await exports.processWatermark({
        data: {
          name: filePath,
          contentType: "image/jpeg",
        },
      });

      response.json({success: true, message: "Watermark processing queued"});
    } catch (error) {
      logger.error("Error in retryWatermarkProcessing:", error);
      response.status(500).send(error.message);
    }
  });
});
