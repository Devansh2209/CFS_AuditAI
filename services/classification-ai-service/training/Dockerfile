FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /opt/ml/code

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download NLTK data during build to avoid runtime download
RUN python -m nltk.downloader stopwords

# Copy source code
COPY src/ .

# Define entrypoint
ENV SAGEMAKER_PROGRAM train.py
ENTRYPOINT ["python", "train.py"]
