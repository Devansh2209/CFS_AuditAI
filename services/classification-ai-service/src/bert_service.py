"""
BERT Classification Service
Flask API that serves the trained FinBERT V31 transformer model for cashflow statement classification
"""
import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Model configuration - FinBERT V31 Transformer
MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../trained_models/finbert_v31_transformer'))

# Category mapping
ID2LABEL = {
    0: "Operating",
    1: "Investing",
    2: "Financing"
}

LABEL2ID = {
    "operating": 0,
    "investing": 1,
    "financing": 2
}

# Global model and tokenizer (transformer)
model = None
tokenizer = None
device = None

def load_model():
    """Load FinBERT transformer model and tokenizer"""
    global model, tokenizer, device
    
    try:
        logger.info(f"Loading FinBERT V31 transformer from {MODEL_DIR}")
        
        # Verify directory exists
        if not os.path.exists(MODEL_DIR):
            logger.error(f"❌ Model directory does not exist: {MODEL_DIR}")
            return False
        
        # Determine device
        if torch.cuda.is_available():
            device = torch.device('cuda')
        elif torch.backends.mps.is_available():
            device = torch.device('mps')
        else:
            device = torch.device('cpu')
        
        logger.info(f"Using device: {device}")
        
        # Load tokenizer and model
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)
        model.to(device)
        model.eval()  # Set to evaluation mode
        
        logger.info("✅ FinBERT V31 transformer model loaded successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to load model: {str(e)}")
        logger.exception("Model loading exception details:") 
        return False

def clean_description(description: str) -> str:
    """Clean transaction description (same as training preprocessing)"""
    import re
    desc = re.sub(r'Net Cash (Provided by|Used in) ', '', description, flags=re.IGNORECASE)
    desc = re.sub(r'Payments to Acquire ', '', desc, flags=re.IGNORECASE)
    desc = re.sub(r'Proceeds from ', '', desc, flags=re.IGNORECASE)
    desc = re.sub(r'Payments for ', '', desc, flags=re.IGNORECASE)
    desc = re.sub(r'Purchase of ', '', desc, flags=re.IGNORECASE)
    desc = re.sub(r'Payment of ', '', desc, flags=re.IGNORECASE)
    return desc.strip()

def predict_single(description: str):
    """Predict category for a single transaction using FinBERT transformer"""
    if model is None or tokenizer is None:
        # Check if model failed to load at startup
        if not load_model():
            raise RuntimeError("Model failed to load at startup and is still missing.")
    
    # Clean and preprocess
    cleaned_desc = clean_description(description)
    
    # Tokenize
    inputs = tokenizer(
        cleaned_desc,
        return_tensors="pt",
        truncation=True,
        max_length=128,
        padding=True
    )
    
    # Move to device
    inputs = {k: v.to(device) for k, v in inputs.items()}
    
    # Predict
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.nn.functional.softmax(logits, dim=-1)[0]
    
    # Get prediction
    predicted_idx = torch.argmax(probs).item()
    predicted_category = ID2LABEL[predicted_idx]
    confidence = float(probs[predicted_idx])
    
    # Get probabilities for all categories
    category_probs = {
        ID2LABEL[i]: float(probs[i])
        for i in range(len(ID2LABEL))
    }
    
    return {
        'category': predicted_category,
        'confidence': confidence,
        'probabilities': category_probs,
        'model_version': 'v31_finbert_transformer',
        'source': 'finbert_transformer'
    }

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'device': str(device) if device else 'not_set',
        'model_path': MODEL_DIR
    })

@app.route('/v1/classify/transactions', methods=['POST'])
def classify_transaction():
    """
    Classify a single transaction
    Request body: {
        "description": "Payment for AWS cloud services",
        "amount": 5400.00,
        "vendor": "Amazon Web Services"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'description' not in data:
            return jsonify({
                'error': 'Missing required field: description'
            }), 400
        
        description = data['description']
        amount = data.get('amount', 0)
        vendor = data.get('vendor', '')
        
        # Enhance description with vendor if available
        full_description = f"{description} {vendor}".strip()
        
        # Get prediction
        result = predict_single(full_description)
        
        # Add transaction context
        result['transaction'] = {
            'description': description,
            'amount': amount,
            'vendor': vendor
        }
        
        logger.info(f"Classified: '{description}' -> {result['category']} ({result['confidence']:.2%})")
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Classification error: {str(e)}")
        return jsonify({
            'error': 'Classification failed',
            'message': str(e)
        }), 500

@app.route('/v1/classify/batch', methods=['POST'])
def classify_batch():
    """
    Classify multiple transactions
    Request body: {
        "transactions": [
            {"description": "...", "amount": 100},
            {"description": "...", "amount": 200}
        ]
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'transactions' not in data:
            return jsonify({
                'error': 'Missing required field: transactions'
            }), 400
        
        transactions = data['transactions']
        results = []
        
        for txn in transactions:
            if 'description' not in txn:
                results.append({
                    'error': 'Missing description',
                    'transaction': txn
                })
                continue
            
            description = txn['description']
            vendor = txn.get('vendor', '')
            full_description = f"{description} {vendor}".strip()
            
            try:
                result = predict_single(full_description)
                result['transaction'] = txn
                results.append(result)
            except Exception as e:
                results.append({
                    'error': str(e),
                    'transaction': txn
                })
        
        return jsonify({
            'total': len(transactions),
            'results': results
        })
        
    except Exception as e:
        logger.error(f"Batch classification error: {str(e)}")
        return jsonify({
            'error': 'Batch classification failed',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Load model on startup
    if not load_model():
        logger.error("Failed to load model. Exiting.")
        sys.exit(1)
    
    # Start Flask server
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"🚀 Starting BERT Classification Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)