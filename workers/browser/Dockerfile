FROM mcr.microsoft.com/playwright/python:v1.56.0-noble
WORKDIR /worker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY worker.py .
USER pwuser
EXPOSE 9000
CMD ["python", "worker.py"]