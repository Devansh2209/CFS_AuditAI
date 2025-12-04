FROM public.ecr.aws/lambda/python:3.9

# Copy requirements and install
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy single-file handler
COPY lambda_handler.py ${LAMBDA_TASK_ROOT}/

# Set handler
CMD ["lambda_handler.lambda_handler"]
