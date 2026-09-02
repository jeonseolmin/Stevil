FROM python:3.12-slim
WORKDIR /app/wegovy/rag
COPY rag/requirements-server.txt ./
RUN pip install --no-cache-dir -r requirements-server.txt
COPY . /app/wegovy
RUN useradd --uid 10001 --no-create-home rag
USER 10001
EXPOSE 8091
CMD ["python", "app.py", "--preview", "--host", "0.0.0.0"]
