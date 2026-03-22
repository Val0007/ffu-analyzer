# Stage 1 — build frontend
FROM node:20-slim AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2 — run backend
FROM python:3.12-slim
WORKDIR /app

# libstdc++6 for pymupdf
RUN apt-get update && apt-get install -y \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# install python deps
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt

# copy backend code and data
COPY backend/ ./backend/

# copy built frontend into dist
COPY --from=frontend /app/dist ./dist

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]