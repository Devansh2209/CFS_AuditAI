FROM python:3.9-slim

WORKDIR /opt/processor

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libxslt-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Python modules
COPY financial_parser.py .
COPY data_processor.py .
COPY processor_entrypoint.py .
COPY xbrl_parser.py .
COPY enrichment.py .
COPY categorization.py .
COPY metadata_extractor.py .
COPY validators.py .

# Set environment variable
ENV PYTHONUNBUFFERED=1

# Run processor
CMD ["python", "processor_entrypoint.py"]
