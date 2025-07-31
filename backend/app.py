from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import os

app = Flask(__name__)
CORS(app)

# Solution 1: Try loading with different methods
def load_model_safely():
    model_path = 'model/jajanan_manado_model_finetuned.h5'
    
    try:
        # Method 1: Standard loading
        print("Attempting to load model with standard method...")
        model = tf.keras.models.load_model(model_path)
        print("Model loaded successfully with standard method!")
        return model
    except Exception as e:
        print(f"Standard loading failed: {e}")
        
        try:
            # Method 2: Load with compile=False
            print("Attempting to load model without compilation...")
            model = tf.keras.models.load_model(model_path, compile=False)
            
            # Recompile the model
            model.compile(
                optimizer='adam',
                loss='categorical_crossentropy',
                metrics=['accuracy']
            )
            print("Model loaded and recompiled successfully!")
            return model
        except Exception as e2:
            print(f"Loading without compilation failed: {e2}")
            
            try:
                # Method 3: Load weights only (requires model architecture)
                print("Attempting to load weights only...")
                model = create_model_architecture()
                model.load_weights(model_path)
                print("Model weights loaded successfully!")
                return model
            except Exception as e3:
                print(f"Loading weights failed: {e3}")
                raise Exception(f"All loading methods failed. Last error: {e3}")

def create_model_architecture():
    """
    Recreate the model architecture based on your training code
    """
    # Create base model (MobileNetV2)
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(224, 224, 3),
        include_top=False,
        weights='imagenet'
    )
    
    # Initially freeze base model
    base_model.trainable = False
    
    # Create the complete model
    model = tf.keras.Sequential([
        base_model,
        tf.keras.layers.GlobalAveragePooling2D(),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Dropout(0.5),
        tf.keras.layers.Dense(128, activation='relu'),
        tf.keras.layers.BatchNormalization(),
        tf.keras.layers.Dropout(0.3),
        tf.keras.layers.Dense(3, activation='softmax')  # 3 classes
    ])
    
    # Enable fine-tuning (as in your training code)
    base_model.trainable = True
    fine_tune_at = 100
    for layer in base_model.layers[:fine_tune_at]:
        layer.trainable = False
    
    # Compile
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0001/10),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

# Load model
try:
    model = load_model_safely()
    print("Model loaded successfully!")
except Exception as e:
    print(f"Failed to load model: {e}")
    model = None

# Class names - make sure these match your training data
class_names = ['dadarGulung', 'kueLapis', 'risol']

def prepare_image(img):
    """Prepare image for prediction"""
    # Resize to model input size
    img = img.resize((224, 224))
    
    # Convert to array and normalize
    img_array = np.array(img) / 255.0
    
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model not loaded properly'}), 500
        
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Open and convert image
        img = Image.open(file.stream).convert('RGB')
        
        # Prepare image for prediction
        x = prepare_image(img)
        
        # Make prediction
        predictions = model.predict(x)[0]
        predicted_class_idx = np.argmax(predictions)
        confidence = float(predictions[predicted_class_idx])
        
        # Prepare result
        result = {
            'class': class_names[predicted_class_idx],
            'confidence': confidence,
            'probabilities': {
                class_names[i]: float(predictions[i]) 
                for i in range(len(class_names))
            }
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    status = {
        'status': 'healthy' if model is not None else 'unhealthy',
        'model_loaded': model is not None,
        'classes': class_names
    }
    return jsonify(status)

@app.route('/', methods=['GET'])
def home():
    """Home endpoint"""
    return jsonify({
        'message': 'Jajanan Manado Classification API',
        'endpoints': {
            'predict': '/predict (POST)',
            'health': '/health (GET)'
        }
    })

if __name__ == '__main__':
    print("Starting Flask application...")
    print(f"Model status: {'Loaded' if model is not None else 'Failed to load'}")
    print(f"Classes: {class_names}")
    app.run(host='0.0.0.0', port=5000, debug=True)