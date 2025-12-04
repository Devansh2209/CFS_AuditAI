#!/bin/bash
# cleanup_project.sh - Clean up AuditAI CFS Platform for deployment

echo "Starting project cleanup..."

# Create archive directories
mkdir -p archive/planning_docs
mkdir -p archive/training_data
mkdir -p archive/logs
mkdir -p archive/old_models
mkdir -p archive/test_files
mkdir -p archive/images

# Move all .resolved files (planning documents)
mv *.resolved archive/planning_docs/ 2>/dev/null

# Move planning/implementation markdown files (keep only essential docs)
mv *_plan.md archive/planning_docs/ 2>/dev/null
mv *_summary.md archive/planning_docs/ 2>/dev/null
mv *_assessment.md archive/planning_docs/ 2>/dev/null
mv *_guide.md archive/planning_docs/ 2>/dev/null
mv *_walkthrough.md archive/planning_docs/ 2>/dev/null

# Move training/data generation scripts
mv extract_10k_prose.py archive/training_data/ 2>/dev/null
mv augment_synthetic_data.py archive/training_data/ 2>/dev/null
mv merge_datasets.py archive/training_data/ 2>/dev/null
mv train_finbert*.py archive/training_data/ 2>/dev/null
mv download_10k_files.py archive/training_data/ 2>/dev/null
mv aws_download_10k.py archive/training_data/ 2>/dev/null
mv aws_extract_prose.py archive/training_data/ 2>/dev/null
mv aws_merge_datasets.py archive/training_data/ 2>/dev/null
mv aws_refine_data.py archive/training_data/ 2>/dev/null
mv aws_sagemaker_train.py archive/training_data/ 2>/dev/null
mv generate_new_tickers.py archive/training_data/ 2>/dev/null
mv test_refiner_local.py archive/training_data/ 2>/dev/null

# Move AWS/EC2 setup scripts
mv setup_ec2.sh archive/training_data/ 2>/dev/null
mv run_aws_pipeline.sh archive/training_data/ 2>/dev/null
mv run_on_ec2.sh archive/training_data/ 2>/dev/null
mv finish_pipeline.sh archive/training_data/ 2>/dev/null
mv ec2-trust-policy.json archive/training_data/ 2>/dev/null

# Move test data files
mv seed_data.csv archive/training_data/ 2>/dev/null
mv *_data.csv archive/training_data/ 2>/dev/null
mv test_*.csv archive/training_data/ 2>/dev/null
mv train_sample.csv archive/training_data/ 2>/dev/null
mv finbert_master_training_data.csv archive/training_data/ 2>/dev/null
mv phase2_synthetic_augmented.csv archive/training_data/ 2>/dev/null

# Move old model files
mv cashflow_classifier.joblib archive/old_models/ 2>/dev/null
mv tfidf_vectorizer.joblib archive/old_models/ 2>/dev/null

# Move logs
mv *.log archive/logs/ 2>/dev/null

# Move test files
mv test_*.js archive/test_files/ 2>/dev/null
mv test_*.json archive/test_files/ 2>/dev/null
mv run_all_tests.js archive/test_files/ 2>/dev/null

# Move uploaded images
mv uploaded_image*.png archive/images/ 2>/dev/null

# Move old data directories
mv v24_data archive/training_data/ 2>/dev/null
mv v25_datasets archive/training_data/ 2>/dev/null
mv v26_data archive/training_data/ 2>/dev/null
mv v26_datasets archive/training_data/ 2>/dev/null
mv v28_data archive/training_data/ 2>/dev/null
mv v28_datasets archive/training_data/ 2>/dev/null

# Move old v27 model
mv v27_bert_model archive/old_models/ 2>/dev/null

# Remove metadata files
rm -f *.metadata.json 2>/dev/null
rm -f .DS_Store 2>/dev/null
rm -f download_log.txt 2>/dev/null

echo "Cleanup complete!"
echo "Archive created in ./archive/"
echo "Essential files remain in root and ./services/"
