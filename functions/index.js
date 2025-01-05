/**
 * Import niezbędnych modułów i konfiguracja Firebase
 */
const {onRequest} = require("firebase-functions/v2/https");
const {onObjectFinalized} = require("firebase-functions/v2/storage");
const logger = require("firebase-functions/logger");
const sharp = require("sharp");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});
const fetch = (...args) =>
  import("node-fetch").then(({default: fetch}) => fetch(...args));
const path = require("path");
const os = require("os");
const fs = require("fs");
const tf = require("@tensorflow/tfjs-node");
const cocoSsd = require("@tensorflow-models/coco-ssd");

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
      // Sprawdzenie metody HTTP
      if (request.method !== "POST") {
        return response.status(405).send("Method Not Allowed");
      }

      const {imageUrl, scaleFactor = 4} = request.body;
      if (!imageUrl) {
        return response.status(400).send("No image URL provided");
      }

      logger.info("Processing image:", imageUrl);

      try {
        // Pobranie obrazu z URL
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }

        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);

        logger.info("Image fetched successfully, size:", imageBuffer.length);

        // Przetwarzanie obrazu za pomocą sharp
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

        // Wysłanie przetworzonego obrazu
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
 * @param {number} fontSize - Rozmiar czcionki (domyślnie 30)
 * @returns {cv.Mat} - Obraz z tekstowym znakiem wodnym
 */
const generateTextWatermark = (text, width, height, fontSize = 30) => {
  // Utworzenie przezroczystego obrazu
  const img = new cv.Mat(height, width, cv.CV_8UC4, [0, 0, 0, 0]);
  const font = cv.FONT_HERSHEY_SIMPLEX;
  const fontScale = fontSize / 30;
  const thickness = Math.max(1, Math.floor(fontScale * 2));
  const color = new cv.Vec4(255, 255, 255, 128); // Biały kolor z 50% przezroczystością
    
  // Obliczenie rozmiaru tekstu dla odpowiedniego rozmieszczenia
  const textSize = cv.getTextSize(text, font, fontScale, thickness);
  const textWidth = textSize.width;
  const textHeight = textSize.height;
    
  // Konfiguracja obrotu o 45 stopni
  const angle = -45;
  const center = new cv.Point2(width/2, height/2);
  const M = cv.getRotationMatrix2D(center, angle, 1.0);
    
  // Narysowanie tekstu w siatce
  for (let y = -height; y < height*2; y += textHeight * 4) {
    for (let x = -width; x < width*2; x += textWidth * 4) {
      const point = new cv.Point2(x, y);
      img.putText(text, point, font, fontScale, color, thickness, cv.LINE_AA);
    }
  }
    
  // Obrót całego obrazu
  return img.warpAffine(M, new cv.Size(width, height));
};

/**
 * Funkcja do dodawania niewidocznego znaku wodnego
 * Wykorzystuje transformatę DCT do ukrycia danych w obrazie
 * @param {cv.Mat} img - Obraz wejściowy
 * @param {string} watermarkData - Dane do ukrycia w obrazie
 * @returns {cv.Mat} - Obraz z ukrytym znakiem wodnym
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
    
  // Sprawdzenie czy plik jest w odpowiednim folderze
  if (!filePath.includes("/originals/")) {
    logger.info("Plik nie jest w folderze originals, pomijam:", filePath);
    return;
  }

  const pathParts = filePath.split("/");
  const albumId = pathParts[1];
  const fileName = pathParts[pathParts.length - 1];

  try {
    logger.info(`Rozpoczynam przetwarzanie watermarku dla zdjęcia: ${fileName} w albumie: ${albumId}`);

    // Pobranie ustawień znaku wodnego z Firestore
    const albumDoc = await admin.firestore()
        .collection("albums")
        .doc(albumId)
        .get();

    if (!albumDoc.exists) {
      logger.error(`Album ${albumId} nie istnieje`);
      return;
    }

    const watermarkSettings = albumDoc.data().watermarkSettings;
    if (!watermarkSettings?.enabled) {
      logger.info("Watermark nie jest włączony dla tego albumu");
      return;
    }

    // Pobranie oryginalnego zdjęcia do przetworzenia
    const bucket = admin.storage().bucket();
    const tempFilePath = path.join(os.tmpdir(), fileName);
    await bucket.file(filePath).download({destination: tempFilePath});

    // Wczytanie obrazu do OpenCV
    let img = await cv.imread(tempFilePath);
    let processedImg;

    // Przetwarzanie w zależności od typu znaku wodnego
    if (watermarkSettings.visibility === "visible") {
      if (watermarkSettings.type === "text") {
        // Dodanie tekstowego znaku wodnego
        const watermark = generateTextWatermark(
            watermarkSettings.text || "Copyright",
            img.cols,
            img.rows,
        );
        processedImg = img.addWeighted(watermark, 0.3, img, 1.0, 0);
                
      } else if (watermarkSettings.type === "image" && watermarkSettings.imageUrl) {
        // Dodanie obrazkowego znaku wodnego
        const watermarkTempPath = path.join(os.tmpdir(), "watermark_" + fileName);
        await bucket.file(watermarkSettings.imageUrl)
            .download({destination: watermarkTempPath});
                
        const watermarkImg = await cv.imread(watermarkTempPath);
        const resized = watermarkImg.resize(
            Math.floor(img.rows / 4),
            Math.floor(img.cols / 4),
        );
                
        // Dodanie znaku wodnego w rogach obrazu
        const positions = [
          {x: 20, y: 20},
          {x: img.cols - resized.cols - 20, y: 20},
          {x: 20, y: img.rows - resized.rows - 20},
          {x: img.cols - resized.cols - 20, y: img.rows - resized.rows - 20},
        ];
                
        processedImg = img.copy();
        positions.forEach((pos) => {
          const roi = processedImg.getRegion(
              new cv.Rect(pos.x, pos.y, resized.cols, resized.rows),
          );
          resized.copyTo(roi);
        });
                
        // Czyszczenie pliku tymczasowego
        fs.unlinkSync(watermarkTempPath);
      }
    } else {
      // Dodanie niewidocznego znaku wodnego
      const watermarkData = `${albumId}_${Date.now()}_${fileName}`;
      processedImg = addInvisibleWatermark(img, watermarkData);
    }

    // Zapisanie przetworzonego obrazu
    const processedPath = path.join(os.tmpdir(), "processed_" + fileName);
    await cv.imwrite(processedPath, processedImg);

    // Upload przetworzonego obrazu do Storage
    const watermarkedPath = filePath.replace("/originals/", "/watermarked/");
    await bucket.upload(processedPath, {
      destination: watermarkedPath,
      metadata: {
        contentType: event.data.contentType,
        metadata: {
          watermarked: "true",
          watermarkType: watermarkSettings.visibility,
          processedAt: Date.now(),
        },
      },
    });

    // Generowanie URL-i dla obu wersji obrazu
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
      },
    });

    logger.info(`Pomyślnie przetworzono watermark dla ${fileName}`);

  } catch (error) {
    logger.error("Błąd podczas przetwarzania watermarku:", error);
        
    // Zapisanie informacji o błędzie w Firestore
    await admin.firestore().collection("errors").add({
      type: "watermark_processing",
      albumId,
      fileName,
      error: error.message,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
  } finally {
    // Czyszczenie plików tymczasowych
    try {
      fs.unlinkSync(path.join(os.tmpdir(), fileName));
      fs.unlinkSync(path.join(os.tmpdir(), "processed_" + fileName));
    } catch (error) {
      logger.warn("Błąd podczas czyszczenia plików tymczasowych:", error);
    }
  }
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

      // Pobranie obrazu
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }

      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Konwersja obrazu do formatu tensora
      const imageTensor = tf.node.decodeImage(imageBuffer);

      // Załadowanie modelu COCO-SSD
      const model = await cocoSsd.load();

      // Detekcja obiektów na obrazie
      const predictions = await model.detect(imageTensor);

      // Generowanie metadanych na podstawie wykrytych obiektów
      const detectedObjects = predictions.map((pred) => ({
        class: pred.class,
        score: pred.score,
      }));

      // Pobranie oryginalnej ścieżki pliku z URL
      const originalPath = decodeURIComponent(imageUrl.split("/o/")[1].split("?")[0]);
      const fileName = path.basename(originalPath);
      const processedPath = `albums/${albumId}/photo-processed/${fileName}`;
            
      // Przetwarzanie obrazu za pomocą sharp
      const processedBuffer = await sharp(imageBuffer)
          .jpeg({
            quality: 100, // Maksymalna jakość
            chromaSubsampling: "4:4:4", // Najlepsza jakość kolorów
            force: false, // Nie wymuszamy konwersji jeśli to nie potrzebne
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

      // Upload przetworzonego obrazu do Firebase Storage
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

      // Generowanie URL dla przetworzonego obrazu
      const [processedUrl] = await bucket.file(processedPath).getSignedUrl({
        action: "read",
        expires: "03-01-2500",
      });

      // Aktualizacja metadanych w Firestore
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

      // Czyszczenie pamięci
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
