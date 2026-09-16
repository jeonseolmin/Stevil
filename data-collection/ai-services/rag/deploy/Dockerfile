FROM python:3.12-slim

WORKDIR /app/ai-services/rag

COPY ai-services/rag/requirements-server.txt ./

RUN pip install --no-cache-dir -r requirements-server.txt

COPY ai-services/rag /app/ai-services/rag
COPY wegovy /app/wegovy
COPY DB/exercises.csv /app/DB/exercises.csv

RUN useradd --uid 10001 --no-create-home rag

RUN mkdir -p /app/ai-services/rag/cache \
    && chown -R rag:rag /app/ai-services/rag/cache

USER 10001

EXPOSE 8091

CMD ["python", "app.py", "--preview", "--host", "0.0.0.0"]