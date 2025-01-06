FROM --platform=linux/arm64 ubuntu:22.04

# Ustawienie zmiennych środowiskowych
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Warsaw

# Instalacja podstawowych narzędzi
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    curl \
    pkg-config \
    python3-dev \
    python3-numpy \
    libopencv-dev \
    python3-opencv \
    && rm -rf /var/lib/apt/lists/*

# Instalacja Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g firebase-tools

# Sprawdzenie lokalizacji bibliotek OpenCV
RUN ls -la /usr/lib/aarch64-linux-gnu/libopencv* || true

# Ustawienie zmiennych środowiskowych dla OpenCV
ENV OPENCV4NODEJS_DISABLE_AUTOBUILD=1
ENV OPENCV_LIB_DIR=/usr/lib/aarch64-linux-gnu
ENV OPENCV_INCLUDE_DIR=/usr/include/opencv4
ENV OPENCV_BIN_DIR=/usr/bin

# Ustawienie katalogu roboczego
WORKDIR /usr/src/app

# Kopiowanie plików package.json i package-lock.json
COPY package*.json ./

# Instalacja zależności npm z wyświetlaniem pełnych logów
RUN npm install --verbose

# Kopiowanie reszty kodu
COPY . .

# Expose port dla Firebase Functions
EXPOSE 8080

# Komenda startowa
CMD [ "npm", "run", "serve" ] 