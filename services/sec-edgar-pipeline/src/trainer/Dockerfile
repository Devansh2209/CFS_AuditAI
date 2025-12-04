FROM pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime

WORKDIR /opt/ml/code

# Install dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy training code
COPY model.py .
COPY train_entrypoint.py .

# SageMaker expects the entrypoint to be executable
ENV SAGEMAKER_PROGRAM train_entrypoint.py

# Add CMD for ECS execution
CMD ["python", "train_entrypoint.py"]
